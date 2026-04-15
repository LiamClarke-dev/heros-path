import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";

interface FriendSharing {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  sharedSince: string | null;
}

interface Friend {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  explorationSharing: boolean;
}

function Avatar({ name, imageUrl, size = 36 }: { name: string; imageUrl?: string | null; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: size * 0.38, color: Colors.gold }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data: { friends: Friend[] } = await apiFetch("/api/friends", { token });
      setFriends(data.friends ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, [fetchFriends])
  );

  const handleToggle = useCallback(
    async (friend: Friend, newVal: boolean) => {
      setTogglingId(friend.id);
      setFriends((prev) =>
        prev.map((f) => (f.id === friend.id ? { ...f, explorationSharing: newVal } : f))
      );
      try {
        if (newVal) {
          await apiFetch(`/api/me/exploration-sharing/${friend.id}`, {
            method: "POST",
            token: token!,
          });
        } else {
          await apiFetch(`/api/me/exploration-sharing/${friend.id}`, {
            method: "DELETE",
            token: token!,
          });
        }
      } catch {
        setFriends((prev) =>
          prev.map((f) => (f.id === friend.id ? { ...f, explorationSharing: !newVal } : f))
        );
        Alert.alert("Error", "Could not update sharing settings.");
      } finally {
        setTogglingId(null);
      }
    },
    [token]
  );

  const anySharing = friends.some((f) => f.explorationSharing);

  const handleMasterToggle = useCallback(
    async (val: boolean) => {
      if (!val) {
        Alert.alert(
          "Disable All Map Sharing?",
          "This will stop sharing your walked streets with all friends.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Disable All",
              style: "destructive",
              onPress: async () => {
                const sharing = friends.filter((f) => f.explorationSharing);
                setFriends((prev) =>
                  prev.map((f) => ({ ...f, explorationSharing: false }))
                );
                for (const f of sharing) {
                  try {
                    await apiFetch(`/api/me/exploration-sharing/${f.id}`, {
                      method: "DELETE",
                      token: token!,
                    });
                  } catch {
                  }
                }
              },
            },
          ]
        );
      }
    },
    [friends, token]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <Feather name="shield" size={20} color={Colors.gold} />
            <Text style={styles.infoText}>
              Your location is never shared automatically. All sharing is opt-in and can be revoked at any time.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Exploration Map</Text>
              <Switch
                value={anySharing}
                onValueChange={handleMasterToggle}
                trackColor={{ false: Colors.border, true: Colors.gold }}
                thumbColor={Colors.parchment}
              />
            </View>
            <Text style={styles.sectionDesc}>
              Share your walked streets with individual friends. Each friend can be toggled independently.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Per-Friend Map Sharing</Text>
            {friends.length === 0 ? (
              <Text style={styles.emptyText}>
                No friends yet. Add friends from your Profile to enable map sharing.
              </Text>
            ) : (
              friends.map((friend) => (
                <View key={friend.id} style={styles.friendRow}>
                  <Avatar name={friend.displayName} imageUrl={friend.profileImageUrl} />
                  <Text style={styles.friendName}>{friend.displayName}</Text>
                  {togglingId === friend.id ? (
                    <ActivityIndicator size="small" color={Colors.gold} />
                  ) : (
                    <Switch
                      value={friend.explorationSharing}
                      onValueChange={(val) => handleToggle(friend, val)}
                      trackColor={{ false: Colors.border, true: Colors.gold }}
                      thumbColor={Colors.parchment}
                    />
                  )}
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Who Can Find Me</Text>
            <View style={styles.infoRow}>
              <Feather name="lock" size={16} color={Colors.gold} />
              <Text style={styles.infoRowText}>
                Invite-only. Others can only connect with you using a code you share directly.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>List Sharing</Text>
            <View style={styles.infoRow}>
              <Feather name="share-2" size={16} color={Colors.gold} />
              <Text style={styles.infoRowText}>
                Lists are private by default. Share specific lists from the Lists tab.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.parchment,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.goldGlow,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  infoText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchment,
    lineHeight: 19,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.parchment,
  },
  sectionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.parchment,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  friendName: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.parchment,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoRowText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    lineHeight: 18,
  },
});

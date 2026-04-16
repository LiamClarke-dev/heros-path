import React, { useState, useCallback, useRef } from "react";
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
  Modal,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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

interface FriendSharingSheetProps {
  visible: boolean;
  friends: Friend[];
  togglingId: string | null;
  onToggle: (friend: Friend, val: boolean) => void;
  onClose: () => void;
}

function FriendSharingSheet({ visible, friends, togglingId, onToggle, onClose }: FriendSharingSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.55)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT * 0.55,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (Platform.OS === "web") return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={sheetStyles.backdrop}>
        <TouchableOpacity style={sheetStyles.backdropTap} onPress={onClose} />
        <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.title}>Share exploration map</Text>
            <TouchableOpacity onPress={onClose} style={sheetStyles.closeBtn}>
              <Feather name="x" size={20} color={Colors.parchmentMuted} />
            </TouchableOpacity>
          </View>
          <Text style={sheetStyles.subtitle}>
            Choose which friends can see your walked streets.
          </Text>
          <ScrollView style={sheetStyles.scroll} showsVerticalScrollIndicator={false}>
            {friends.map((friend) => (
              <View key={friend.id} style={sheetStyles.row}>
                <Avatar name={friend.displayName} imageUrl={friend.profileImageUrl} />
                <Text style={sheetStyles.friendName}>{friend.displayName}</Text>
                {togglingId === friend.id ? (
                  <ActivityIndicator size="small" color={Colors.gold} />
                ) : (
                  <Switch
                    value={friend.explorationSharing}
                    onValueChange={(val) => onToggle(friend, val)}
                    trackColor={{ false: Colors.border, true: Colors.gold }}
                    thumbColor={Colors.parchment}
                  />
                )}
              </View>
            ))}
          </ScrollView>
          <View style={sheetStyles.footer}>
            <TouchableOpacity style={sheetStyles.doneBtn} onPress={onClose}>
              <Text style={sheetStyles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.65,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.parchment,
  },
  closeBtn: { padding: 4 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    lineHeight: 18,
  },
  scroll: { flexGrow: 0, paddingHorizontal: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
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
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  doneBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  doneBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
});

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sharingSheetVisible, setSharingSheetVisible] = useState(false);

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

  const hasFriends = friends.length > 0;
  const anySharing = friends.some((f) => f.explorationSharing);

  const handleMasterToggle = useCallback(
    async (val: boolean) => {
      if (!hasFriends) return;
      if (val) {
        setSharingSheetVisible(true);
      } else {
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
    [friends, hasFriends, token]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
                disabled={!hasFriends}
              />
            </View>
            {hasFriends ? (
              <Text style={styles.sectionDesc}>
                Share your walked streets with individual friends. Each friend can be toggled independently.
              </Text>
            ) : (
              <Text style={[styles.sectionDesc, styles.disabledHelperText]}>
                Add friends to enable exploration sharing.
              </Text>
            )}
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

      <FriendSharingSheet
        visible={sharingSheetVisible}
        friends={friends}
        togglingId={togglingId}
        onToggle={handleToggle}
        onClose={() => setSharingSheetVisible(false)}
      />
    </SafeAreaView>
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
  disabledHelperText: {
    color: Colors.parchmentDim,
    fontStyle: "italic",
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

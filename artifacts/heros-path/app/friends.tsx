import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import Colors from "../constants/colors";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import { FriendDetailSheet } from "../components/FriendDetailSheet";

interface Friend {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  explorationSharing: boolean;
}

interface InviteCode {
  code: string;
  expiresAt: string;
}

function FriendAvatar({ name, imageUrl, size = 44 }: { name: string; imageUrl?: string | null; size?: number }) {
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
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials || "?"}</Text>
    </View>
  );
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [invite, setInvite] = useState<InviteCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningCode, setJoiningCode] = useState("");
  const [joiningLoading, setJoiningLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [friendsData, inviteData] = await Promise.all([
          apiFetch("/api/friends", { token }),
          apiFetch("/api/friends/invite", { token }),
        ]);
        setFriends((friendsData as { friends: Friend[] }).friends ?? []);
        const inv = (inviteData as { code: string | null; expiresAt?: string });
        if (inv.code) setInvite({ code: inv.code, expiresAt: inv.expiresAt ?? "" });
        else setInvite(null);
      } catch {
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const handleGenerateCode = useCallback(async () => {
    if (!token) return;
    setGeneratingCode(true);
    try {
      const data: InviteCode = await apiFetch("/api/friends/invite", {
        method: "POST",
        token,
      });
      setInvite(data);
    } catch {
      Alert.alert("Error", "Could not generate invite code. Please try again.");
    } finally {
      setGeneratingCode(false);
    }
  }, [token]);

  const handleCopyCode = useCallback(async () => {
    if (!invite) return;
    await Clipboard.setStringAsync(invite.code);
    Alert.alert("Copied!", `Code "${invite.code}" copied to clipboard.`);
  }, [invite]);

  const handleJoin = useCallback(async () => {
    const code = joiningCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a valid 6-character code.");
      return;
    }
    if (!token) return;
    setJoiningLoading(true);
    try {
      const data: { friend?: { id: string; displayName: string; profileImageUrl: string | null }; error?: string } =
        await apiFetch(`/api/friends/join/${code}`, {
          method: "POST",
          token,
        });
      if (data.friend) {
        setJoiningCode("");
        Alert.alert("Friend Added!", `You're now friends with ${data.friend.displayName}!`);
        await fetchAll();
      }
    } catch (err) {
      const msg =
        err != null &&
        typeof (err as { body?: { error?: string } }).body?.error === "string"
          ? (err as { body: { error: string } }).body.error
          : "Invalid or expired code.";
      Alert.alert("Could Not Add Friend", msg);
    } finally {
      setJoiningLoading(false);
    }
  }, [joiningCode, token, fetchAll]);

  const handleFriendRemoved = useCallback((friendId: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  }, []);

  const handleExplorationToggle = useCallback((friendId: string, enabled: boolean) => {
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, explorationSharing: enabled } : f))
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(true)}
              tintColor={Colors.gold}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Invite Code</Text>
            {invite ? (
              <>
                <View style={styles.codeRow}>
                  <Text style={styles.codeText}>{invite.code}</Text>
                  <TouchableOpacity onPress={handleCopyCode} style={styles.copyBtn}>
                    <Feather name="copy" size={18} color={Colors.gold} />
                  </TouchableOpacity>
                </View>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={`herospath://friends/join/${invite.code}`}
                    size={160}
                    backgroundColor={Colors.card}
                    color={Colors.parchment}
                  />
                </View>
                <Text style={styles.codeExpiry}>
                  Expires in {daysUntil(invite.expiresAt)} day{daysUntil(invite.expiresAt) !== 1 ? "s" : ""}
                </Text>
              </>
            ) : (
              <Text style={styles.noCodeText}>
                No active code. Generate one below.
              </Text>
            )}
            <TouchableOpacity
              style={[styles.generateBtn, generatingCode && styles.generateBtnDisabled]}
              onPress={handleGenerateCode}
              disabled={generatingCode}
            >
              {generatingCode ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <>
                  <Feather name="refresh-cw" size={15} color={Colors.background} />
                  <Text style={styles.generateBtnText}>
                    {invite ? "Regenerate Code" : "Generate Code"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.codeHint}>
              Share this code with a friend. Valid for 7 days.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Join a Friend</Text>
            <Text style={styles.joinHint}>
              Enter a 6-character code your friend shared with you.
            </Text>
            <View style={styles.joinRow}>
              <TextInput
                style={styles.codeInput}
                value={joiningCode}
                onChangeText={(t) => setJoiningCode(t.toUpperCase())}
                placeholder="HPXK73"
                placeholderTextColor={Colors.parchmentDim}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.joinBtn, (joiningLoading || joiningCode.length !== 6) && styles.joinBtnDisabled]}
                onPress={handleJoin}
                disabled={joiningLoading || joiningCode.length !== 6}
              >
                {joiningLoading ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.joinBtnText}>Add Friend</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Friends{friends.length > 0 ? ` · ${friends.length}` : ""}
            </Text>
            {friends.length === 0 ? (
              <View style={styles.emptyFriends}>
                <Feather name="users" size={32} color={Colors.parchmentDim} />
                <Text style={styles.emptyTitle}>No friends yet</Text>
                <Text style={styles.emptySubtitle}>
                  Share your invite code above to connect with friends.
                </Text>
              </View>
            ) : (
              friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendRow}
                  onPress={() => {
                    setSelectedFriend(friend);
                    setShowDetail(true);
                  }}
                  activeOpacity={0.8}
                >
                  <FriendAvatar
                    name={friend.displayName}
                    imageUrl={friend.profileImageUrl}
                  />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.displayName}</Text>
                    {friend.explorationSharing && (
                      <View style={styles.sharingChip}>
                        <Text style={styles.sharingChipText}>Sharing map 🗺</Text>
                      </View>
                    )}
                  </View>
                  <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <FriendDetailSheet
        visible={showDetail}
        friend={selectedFriend}
        token={token ?? ""}
        onClose={() => { setShowDetail(false); setSelectedFriend(null); }}
        onFriendRemoved={handleFriendRemoved}
        onExplorationToggle={handleExplorationToggle}
      />
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
    gap: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 12,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.parchment,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  codeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    color: Colors.gold,
    letterSpacing: 8,
  },
  copyBtn: {
    padding: 8,
    backgroundColor: Colors.goldGlow,
    borderRadius: 10,
  },
  qrContainer: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeExpiry: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    textAlign: "center",
  },
  noCodeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
  codeHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentDim,
    textAlign: "center",
  },
  joinHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  joinRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.gold,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    letterSpacing: 4,
    textAlign: "center",
  },
  joinBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  joinBtnDisabled: {
    opacity: 0.4,
  },
  joinBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.background,
  },
  section: {
    gap: 2,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.parchmentMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  emptyFriends: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.parchment,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  friendInfo: {
    flex: 1,
    gap: 4,
  },
  friendName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.parchment,
  },
  sharingChip: {
    alignSelf: "flex-start",
    backgroundColor: Colors.goldGlow,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sharingChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.gold,
  },
});

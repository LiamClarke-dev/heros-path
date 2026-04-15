import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "../constants/colors";
import { apiFetch } from "../lib/api";

interface Friend {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  explorationSharing: boolean;
}

interface SharedList {
  id: string;
  name: string;
  emoji: string | null;
  itemCount: number;
  canEdit: boolean;
  sharedBy?: { id: string; displayName: string } | null;
}

interface Props {
  visible: boolean;
  friend: Friend | null;
  token: string;
  onClose: () => void;
  onFriendRemoved: (friendId: string) => void;
  onExplorationToggle: (friendId: string, enabled: boolean) => void;
}

function FriendAvatar({ name, imageUrl, size = 56 }: { name: string; imageUrl?: string | null; size?: number }) {
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
        borderColor: Colors.gold,
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

export function FriendDetailSheet({ visible, friend, token, onClose, onFriendRemoved, onExplorationToggle }: Props) {
  const router = useRouter();
  const [listsFromFriend, setListsFromFriend] = useState<SharedList[]>([]);
  const [listsToFriend, setListsToFriend] = useState<SharedList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [sharingToggling, setSharingToggling] = useState(false);

  useEffect(() => {
    if (!visible || !friend) return;
    setSharingEnabled(friend.explorationSharing);

    setListsLoading(true);
    Promise.all([
      apiFetch("/api/lists/shared-with-me", { token }).then(
        (d: { lists: SharedList[] }) =>
          (d.lists ?? []).filter((l) => l.sharedBy?.id === friend.id)
      ),
      apiFetch(`/api/lists/shared-with/${friend.id}`, { token }).then(
        (d: { lists: SharedList[] }) => d.lists ?? []
      ),
    ])
      .then(([fromFriend, toFriend]) => {
        setListsFromFriend(fromFriend);
        setListsToFriend(toFriend);
      })
      .catch(() => {})
      .finally(() => setListsLoading(false));
  }, [visible, friend, token]);

  const handleExplorationToggle = useCallback(
    async (val: boolean) => {
      if (!friend) return;
      setSharingToggling(true);
      setSharingEnabled(val);
      try {
        if (val) {
          await apiFetch(`/api/me/exploration-sharing/${friend.id}`, {
            method: "POST",
            token,
          });
        } else {
          await apiFetch(`/api/me/exploration-sharing/${friend.id}`, {
            method: "DELETE",
            token,
          });
        }
        onExplorationToggle(friend.id, val);
      } catch {
        setSharingEnabled(!val);
      } finally {
        setSharingToggling(false);
      }
    },
    [friend, token, onExplorationToggle]
  );

  const handleRemove = useCallback(() => {
    if (!friend) return;
    Alert.alert(
      "Remove Friend",
      `Remove ${friend.displayName} from your friends? This will also revoke all shared lists and map sharing.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/friends/${friend.id}`, {
                method: "DELETE",
                token,
              });
              onFriendRemoved(friend.id);
              onClose();
            } catch {
              Alert.alert("Error", "Could not remove friend. Please try again.");
            }
          },
        },
      ]
    );
  }, [friend, token, onFriendRemoved, onClose]);

  if (!friend) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <FriendAvatar name={friend.displayName} imageUrl={friend.profileImageUrl} />
            <View style={styles.headerInfo}>
              <Text style={styles.friendName}>{friend.displayName}</Text>
              <Text style={styles.friendSub}>Friend</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={Colors.parchmentMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Map Sharing</Text>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Share my explored streets</Text>
                  <Text style={styles.toggleSub}>
                    {friend.displayName} will see your walked streets
                  </Text>
                </View>
                {sharingToggling ? (
                  <ActivityIndicator size="small" color={Colors.gold} />
                ) : (
                  <Switch
                    value={sharingEnabled}
                    onValueChange={handleExplorationToggle}
                    trackColor={{ false: Colors.border, true: Colors.gold }}
                    thumbColor={Colors.parchment}
                  />
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lists They Shared With You</Text>
              {listsLoading ? (
                <ActivityIndicator color={Colors.gold} />
              ) : listsFromFriend.length === 0 ? (
                <Text style={styles.emptyText}>No lists shared with you yet.</Text>
              ) : (
                listsFromFriend.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={styles.listRow}
                    onPress={() => {
                      onClose();
                      router.push(`/lists/${l.id}`);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.listEmoji}>{l.emoji ?? "📍"}</Text>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{l.name}</Text>
                      <Text style={styles.listMeta}>
                        {l.itemCount} place{l.itemCount !== 1 ? "s" : ""}
                        {l.canEdit ? " · Collaborative" : ""}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lists You Shared With Them</Text>
              {listsLoading ? (
                <ActivityIndicator color={Colors.gold} />
              ) : listsToFriend.length === 0 ? (
                <Text style={styles.emptyText}>No lists shared with {friend.displayName} yet.</Text>
              ) : (
                listsToFriend.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={styles.listRow}
                    onPress={() => {
                      onClose();
                      router.push(`/lists/${l.id}`);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.listEmoji}>{l.emoji ?? "📍"}</Text>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{l.name}</Text>
                      <Text style={styles.listMeta}>
                        {l.itemCount} place{l.itemCount !== 1 ? "s" : ""}
                        {l.canEdit ? " · Collaborative" : " · View only"}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            <TouchableOpacity style={styles.removeBtn} onPress={handleRemove} activeOpacity={0.8}>
              <Feather name="user-x" size={16} color={Colors.error} />
              <Text style={styles.removeBtnText}>Remove Friend</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 14,
  },
  headerInfo: {
    flex: 1,
  },
  friendName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
  },
  friendSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flexGrow: 0,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.parchmentMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.parchment,
  },
  toggleSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    marginTop: 2,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.parchment,
  },
  listMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
    marginTop: 1,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    marginBottom: 12,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 20,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    justifyContent: "center",
  },
  removeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.error,
  },
});

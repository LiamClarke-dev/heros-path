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
import Colors from "../constants/colors";
import { apiFetch } from "../lib/api";
import { FriendPickerModal } from "./FriendPickerModal";

interface ShareEntry {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  canEdit: boolean;
  sharedAt: string | null;
}

interface Collaborator {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  role: string;
}

interface Props {
  visible: boolean;
  listId: string;
  listName: string;
  token: string;
  onClose: () => void;
}

function UserChip({ name, imageUrl, size = 32 }: { name: string; imageUrl?: string | null; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  if (imageUrl) {
    return (
      <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: size * 0.38, color: Colors.gold }}>{initials || "?"}</Text>
    </View>
  );
}

export function SharingManagementSheet({ visible, listId, listName, token, onClose }: Props) {
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingCanEdit, setPendingCanEdit] = useState(false);

  const fetchData = useCallback(async () => {
    if (!listId) return;
    setLoading(true);
    try {
      const [sharesData, collabData] = await Promise.all([
        apiFetch(`/api/lists/${listId}/shares`, { token }),
        apiFetch(`/api/lists/${listId}/collaborators`, { token }),
      ]);
      setShares((sharesData as { shares: ShareEntry[] }).shares ?? []);
      setCollaborators((collabData as { collaborators: Collaborator[] }).collaborators ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [listId, token]);

  useEffect(() => {
    if (visible) fetchData();
  }, [visible, fetchData]);

  const handleCanEditToggle = useCallback(
    async (friendId: string, canEdit: boolean) => {
      try {
        await apiFetch(`/api/lists/${listId}/share`, {
          method: "POST",
          token,
          body: JSON.stringify({ friendId, canEdit }),
        });
        setShares((prev) =>
          prev.map((s) => (s.id === friendId ? { ...s, canEdit } : s))
        );
        if (canEdit) {
          await fetchData();
        } else {
          await apiFetch(`/api/lists/${listId}/collaborators/${friendId}`, {
            method: "DELETE",
            token,
          });
          setCollaborators((prev) => prev.filter((c) => c.id !== friendId));
        }
      } catch {
        Alert.alert("Error", "Could not update sharing settings.");
      }
    },
    [listId, token, fetchData]
  );

  const handleRevoke = useCallback(
    (friendId: string, friendName: string) => {
      Alert.alert(
        "Revoke Access",
        `Remove ${friendName}'s access to "${listName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Revoke",
            style: "destructive",
            onPress: async () => {
              try {
                await apiFetch(`/api/lists/${listId}/share/${friendId}`, {
                  method: "DELETE",
                  token,
                });
                setShares((prev) => prev.filter((s) => s.id !== friendId));
                setCollaborators((prev) => prev.filter((c) => c.id !== friendId));
              } catch {
                Alert.alert("Error", "Could not revoke access.");
              }
            },
          },
        ]
      );
    },
    [listId, listName, token]
  );

  const handleShare = useCallback(
    async (friend: { id: string; displayName: string }) => {
      setShowPicker(false);
      try {
        await apiFetch(`/api/lists/${listId}/share`, {
          method: "POST",
          token,
          body: JSON.stringify({ friendId: friend.id, canEdit: pendingCanEdit }),
        });
        await fetchData();
      } catch {
        Alert.alert("Error", "Could not share list.");
      }
    },
    [listId, token, pendingCanEdit, fetchData]
  );

  const sharedIds = shares.map((s) => s.id);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Manage Sharing</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={Colors.parchmentMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>"{listName}"</Text>

          {loading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 24, marginBottom: 24 }} />
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shared With</Text>
                {shares.length === 0 ? (
                  <Text style={styles.emptyText}>Not shared with anyone yet.</Text>
                ) : (
                  shares.map((s) => (
                    <View key={s.id} style={styles.shareRow}>
                      <UserChip name={s.displayName} imageUrl={s.profileImageUrl} />
                      <View style={styles.shareInfo}>
                        <Text style={styles.shareName}>{s.displayName}</Text>
                        <Text style={styles.shareSub}>{s.canEdit ? "Can edit" : "View only"}</Text>
                      </View>
                      <Switch
                        value={s.canEdit}
                        onValueChange={(val) => handleCanEditToggle(s.id, val)}
                        trackColor={{ false: Colors.border, true: Colors.goldGlow }}
                        thumbColor={s.canEdit ? Colors.gold : Colors.parchmentDim}
                        style={{ transform: [{ scale: 0.8 }] }}
                      />
                      <TouchableOpacity
                        onPress={() => handleRevoke(s.id, s.displayName)}
                        style={styles.revokeBtn}
                      >
                        <Feather name="x" size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {collaborators.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Collaborators</Text>
                  {collaborators.map((c) => (
                    <View key={c.id} style={styles.shareRow}>
                      <UserChip name={c.displayName} imageUrl={c.profileImageUrl} />
                      <View style={styles.shareInfo}>
                        <Text style={styles.shareName}>{c.displayName}</Text>
                        <Text style={styles.shareSub}>Editor</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.shareActions}>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => { setPendingCanEdit(false); setShowPicker(true); }}
                  activeOpacity={0.8}
                >
                  <Feather name="eye" size={16} color={Colors.gold} />
                  <Text style={styles.shareBtnText}>Share (View Only)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.shareBtn, styles.shareBtnEdit]}
                  onPress={() => { setPendingCanEdit(true); setShowPicker(true); }}
                  activeOpacity={0.8}
                >
                  <Feather name="users" size={16} color={Colors.gold} />
                  <Text style={styles.shareBtnText}>Share (Collaborative)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      <FriendPickerModal
        visible={showPicker}
        token={token}
        title={pendingCanEdit ? "Share (Collaborative)" : "Share (View Only)"}
        onClose={() => setShowPicker(false)}
        onSelect={handleShare}
        excludeIds={sharedIds}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: "80%" },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginTop: 12 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.parchment },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.parchmentMuted, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  closeBtn: { padding: 4 },
  scroll: { flexGrow: 0 },
  section: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.parchmentMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  shareRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  shareInfo: { flex: 1 },
  shareName: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.parchment },
  shareSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.parchmentMuted, marginTop: 1 },
  revokeBtn: { padding: 6 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.parchmentMuted, marginBottom: 8 },
  shareActions: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: Colors.border },
  shareBtnEdit: { borderColor: Colors.gold },
  shareBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.parchment },
});

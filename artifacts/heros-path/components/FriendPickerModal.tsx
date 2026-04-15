import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { apiFetch } from "../lib/api";

interface Friend {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
}

interface Props {
  visible: boolean;
  token: string;
  title?: string;
  onClose: () => void;
  onSelect: (friend: Friend) => void;
  excludeIds?: string[];
  multiSelect?: boolean;
  onSelectMultiple?: (friends: Friend[]) => void;
}

function FriendAvatar({ name, imageUrl, size = 40 }: { name: string; imageUrl?: string | null; size?: number }) {
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

export function FriendPickerModal({
  visible,
  token,
  title = "Pick a Friend",
  onClose,
  onSelect,
  excludeIds = [],
  multiSelect = false,
  onSelectMultiple,
}: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    apiFetch("/api/friends", { token })
      .then((d: { friends: Friend[] }) => setFriends(d.friends ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    setQuery("");
    setSelected(new Set());
  }, [visible, token]);

  const filtered = friends.filter(
    (f) =>
      !excludeIds.includes(f.id) &&
      f.displayName.toLowerCase().includes(query.toLowerCase())
  );

  const handlePress = useCallback(
    (friend: Friend) => {
      if (multiSelect) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(friend.id)) next.delete(friend.id);
          else next.add(friend.id);
          return next;
        });
      } else {
        onSelect(friend);
      }
    },
    [multiSelect, onSelect]
  );

  const handleConfirm = useCallback(() => {
    if (!multiSelect || !onSelectMultiple) return;
    const picks = friends.filter((f) => selected.has(f.id));
    onSelectMultiple(picks);
  }, [multiSelect, onSelectMultiple, friends, selected]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={Colors.parchmentMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={Colors.parchmentMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search friends..."
              placeholderTextColor={Colors.parchmentDim}
            />
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 24 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {friends.length === 0
                  ? "No friends yet. Add friends from your profile."
                  : "No friends match your search."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(f) => f.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.friendRow,
                    multiSelect && selected.has(item.id) && styles.friendRowSelected,
                  ]}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.8}
                >
                  <FriendAvatar name={item.displayName} imageUrl={item.profileImageUrl} />
                  <Text style={styles.friendName}>{item.displayName}</Text>
                  {multiSelect && selected.has(item.id) && (
                    <Feather name="check-circle" size={20} color={Colors.gold} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          )}

          {multiSelect && (
            <TouchableOpacity
              style={[styles.confirmBtn, selected.size === 0 && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={selected.size === 0}
            >
              <Text style={styles.confirmBtnText}>
                Confirm ({selected.size} selected)
              </Text>
            </TouchableOpacity>
          )}
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
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.parchment,
  },
  closeBtn: {
    padding: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchment,
    paddingVertical: 10,
  },
  list: {
    maxHeight: 320,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  friendRowSelected: {
    backgroundColor: Colors.goldGlow,
  },
  friendName: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.parchment,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
  },
  confirmBtn: {
    margin: 16,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
});

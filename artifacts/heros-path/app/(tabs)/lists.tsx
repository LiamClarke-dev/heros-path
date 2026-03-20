import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const GRID_GAP = 12;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - GRID_GAP) / 2;

interface PlaceList {
  id: string;
  name: string;
  isDefault: boolean;
  placeCount: number;
  createdAt: string;
  coverPhotoUrl: string | null;
}

type ModalMode = "create" | "rename";

export default function ListsScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [listName, setListName] = useState("");
  const [renamingList, setRenamingList] = useState<PlaceList | null>(null);

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["lists"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/lists`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch lists");
      return res.json() as Promise<{ lists: PlaceList[] }>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${apiBase}/lists`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create list");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      closeModal();
    },
    onError: () => Alert.alert("Error", "Failed to create list."),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ listId, name }: { listId: string; name: string }) => {
      const res = await fetch(`${apiBase}/lists/${listId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename list");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      closeModal();
    },
    onError: () => Alert.alert("Error", "Failed to rename list."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (listId: string) => {
      const res = await fetch(`${apiBase}/lists/${listId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to delete list");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: () => Alert.alert("Error", "Failed to delete list."),
  });

  function openCreate() {
    setListName("");
    setRenamingList(null);
    setModalMode("create");
  }

  function openRename(list: PlaceList) {
    setListName(list.name);
    setRenamingList(list);
    setModalMode("rename");
  }

  function closeModal() {
    setModalMode(null);
    setListName("");
    setRenamingList(null);
  }

  function handleSubmit() {
    if (!listName.trim()) return;
    if (modalMode === "create") {
      createMutation.mutate(listName.trim());
    } else if (modalMode === "rename" && renamingList) {
      renameMutation.mutate({ listId: renamingList.id, name: listName.trim() });
    }
  }

  function confirmDelete(list: PlaceList) {
    Alert.alert("Delete List", `Delete "${list.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(list.id),
      },
    ]);
  }

  const lists = data?.lists ?? [];
  const isPending = createMutation.isPending || renameMutation.isPending;

  const renderItem = ({ item, index }: { item: PlaceList; index: number }) => (
    <ListCard
      list={item}
      style={index % 2 === 0 ? { marginRight: GRID_GAP / 2 } : { marginLeft: GRID_GAP / 2 }}
      onPress={() =>
        router.push({
          pathname: "/list-detail",
          params: { listId: item.id, name: item.name },
        })
      }
      onRename={() => openRename(item)}
      onDelete={() => confirmDelete(item)}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Lists</Text>
        <Pressable style={styles.addButton} onPress={openCreate}>
          <Feather name="plus" size={18} color={Colors.background} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : lists.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="bookmark" size={48} color={Colors.parchmentDim} />
          <Text style={styles.emptyTitle}>No lists yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a list to organize your favorite discoveries.
          </Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 100,
          }}
          columnWrapperStyle={{ marginBottom: GRID_GAP }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
          renderItem={renderItem}
        />
      )}

      <Modal
        visible={modalMode != null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {modalMode === "create" ? "New List" : "Rename List"}
            </Text>
            <TextInput
              style={styles.input}
              value={listName}
              onChangeText={setListName}
              placeholder="List name..."
              placeholderTextColor={Colors.parchmentDim}
              autoFocus
              maxLength={50}
              onSubmitEditing={handleSubmit}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={closeModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCreateBtn, !listName.trim() && styles.modalCreateBtnDisabled]}
                onPress={handleSubmit}
                disabled={!listName.trim() || isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.modalCreateText}>
                    {modalMode === "create" ? "Create" : "Save"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ListCard({
  list,
  style,
  onPress,
  onRename,
  onDelete,
}: {
  list: PlaceList;
  style?: object;
  onPress: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable style={[styles.card, style]} onPress={onPress}>
      <View style={styles.cardCover}>
        {list.coverPhotoUrl ? (
          <Image
            source={{ uri: list.coverPhotoUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Feather
              name={list.isDefault ? "heart" : "bookmark"}
              size={28}
              color={Colors.gold}
            />
          </View>
        )}
        {list.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
        {!list.isDefault && (
          <View style={styles.cardMenuRow}>
            <Pressable
              style={styles.cardMenuBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                onRename();
              }}
            >
              <Feather name="edit-2" size={12} color={Colors.parchment} />
            </Pressable>
            <Pressable
              style={[styles.cardMenuBtn, { backgroundColor: "rgba(207,102,121,0.8)" }]}
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
            >
              <Feather name="trash-2" size={12} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{list.name}</Text>
        <Text style={styles.cardCount}>
          {list.placeCount} {list.placeCount === 1 ? "place" : "places"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.parchmentMuted,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.parchmentDim,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  cardCover: {
    height: CARD_WIDTH * 0.75,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(212,160,23,0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 9,
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardMenuRow: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
  },
  cardMenuBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(26,21,16,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    padding: 10,
    gap: 2,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  cardCount: {
    fontSize: 11,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    width: "100%",
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.parchment,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
  },
  modalCancelText: {
    color: Colors.parchmentMuted,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  modalCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.gold,
    alignItems: "center",
  },
  modalCreateBtnDisabled: { opacity: 0.5 },
  modalCreateText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});

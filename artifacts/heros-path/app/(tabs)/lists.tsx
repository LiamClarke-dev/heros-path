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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

interface PlaceList {
  id: string;
  name: string;
  isDefault: boolean;
  placeCount: number;
  createdAt: string;
}

export default function ListsScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState("");

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
      setShowCreate(false);
      setNewListName("");
    },
    onError: () => Alert.alert("Error", "Failed to create list."),
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Lists</Text>
        <Pressable style={styles.addButton} onPress={() => setShowCreate(true)}>
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
          renderItem={({ item }) => (
            <ListCard
              list={item}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New List</Text>
            <TextInput
              style={styles.input}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="List name..."
              placeholderTextColor={Colors.parchmentDim}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowCreate(false);
                  setNewListName("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCreateBtn, !newListName.trim() && styles.modalCreateBtnDisabled]}
                onPress={() => newListName.trim() && createMutation.mutate(newListName.trim())}
                disabled={!newListName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
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
  onDelete,
}: {
  list: PlaceList;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Feather
          name={list.isDefault ? "heart" : "bookmark"}
          size={18}
          color={Colors.gold}
        />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName}>{list.name}</Text>
          {list.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardCount}>
          {list.placeCount} {list.placeCount === 1 ? "place" : "places"}
        </Text>
      </View>
      {!list.isDefault && (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Feather name="trash-2" size={16} color={Colors.error} />
        </Pressable>
      )}
    </View>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.goldGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  defaultBadge: {
    backgroundColor: Colors.goldDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  cardCount: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
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

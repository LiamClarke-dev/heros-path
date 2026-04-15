import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { CreateListSheet } from "../../components/CreateListSheet";

interface PlaceList {
  id: string;
  name: string;
  emoji: string | null;
  itemCount: number;
  createdAt: string;
}

export default function ListsTab() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<PlaceList[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchLists = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data: { lists: PlaceList[] } = await apiFetch("/api/lists", { token });
        setLists(data.lists);
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
      fetchLists();
    }, [fetchLists])
  );

  const handleCreate = useCallback(
    async (name: string, emoji: string) => {
      const data: { list: PlaceList } = await apiFetch("/api/lists", {
        method: "POST",
        token: token!,
        body: JSON.stringify({ name, emoji }),
      });
      setLists((prev) => [...prev, data.list]);
    },
    [token]
  );

  const renderItem = useCallback(
    ({ item }: { item: PlaceList }) => (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => router.push(`/lists/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.listEmojiBg}>
          <Text style={styles.listEmoji}>{item.emoji ?? "📍"}</Text>
        </View>
        <View style={styles.listInfo}>
          <Text style={styles.listName}>{item.name}</Text>
          <Text style={styles.listCount}>
            {item.itemCount} {item.itemCount === 1 ? "place" : "places"}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={Colors.parchmentDim} />
      </TouchableOpacity>
    ),
    [router]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Lists</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLists(true)}
              tintColor={Colors.gold}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No lists yet</Text>
              <Text style={styles.emptySubtitle}>
                Create a list to save and organise your discovered places.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color={Colors.background} />
      </TouchableOpacity>

      <CreateListSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.gold,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  listEmojiBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  listEmoji: {
    fontSize: 26,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.parchment,
    marginBottom: 2,
  },
  listCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

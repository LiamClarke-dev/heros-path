import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
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
  isShared?: boolean;
  canEdit?: boolean;
  sharedBy?: { id: string; displayName: string } | null;
}

type Section = {
  title: string;
  data: PlaceList[];
};

export default function ListsTab() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();
  const [myLists, setMyLists] = useState<PlaceList[]>([]);
  const [sharedLists, setSharedLists] = useState<PlaceList[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchLists = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [myData, sharedData] = await Promise.all([
          apiFetch("/api/lists", { token }),
          apiFetch("/api/lists/shared-with-me", { token }).catch(() => ({ lists: [] })),
        ]);
        setMyLists((myData as { lists: PlaceList[] }).lists ?? []);
        setSharedLists(
          ((sharedData as { lists: PlaceList[] }).lists ?? []).map((l) => ({
            ...l,
            isShared: true,
          }))
        );
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
      setMyLists((prev) => [...prev, data.list]);
    },
    [token]
  );

  const sections: Section[] = [];
  if (myLists.length > 0 || !loading) {
    sections.push({ title: "My Lists", data: myLists });
  }
  if (sharedLists.length > 0) {
    sections.push({ title: "Shared with Me", data: sharedLists });
  }

  const renderItem = ({ item }: { item: PlaceList }) => (
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
        <View style={styles.listMeta}>
          <Text style={styles.listCount}>
            {item.itemCount} {item.itemCount === 1 ? "place" : "places"}
          </Text>
          {item.isShared && item.sharedBy && (
            <View style={styles.sharedChip}>
              <Feather name="user" size={9} color={Colors.gold} />
              <Text style={styles.sharedChipText}>{item.sharedBy.displayName}</Text>
            </View>
          )}
          {item.isShared && item.canEdit && (
            <View style={styles.editChip}>
              <Feather name="edit-2" size={9} color={Colors.gold} />
              <Text style={styles.editChipText}>Collaborative</Text>
            </View>
          )}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.parchmentDim} />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      {section.title === "My Lists" && (
        <Text style={styles.sectionCount}>{myLists.length}</Text>
      )}
      {section.title === "Shared with Me" && (
        <Text style={styles.sectionCount}>{sharedLists.length}</Text>
      )}
    </View>
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLists(true)}
              tintColor={Colors.gold}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bookmark" size={40} color={Colors.parchmentDim} />
              <Text style={styles.emptyTitle}>No lists yet</Text>
              <Text style={styles.emptySubtitle}>
                Create a list from the Discover tab to save your favourite places.
              </Text>
            </View>
          }
          stickySectionHeadersEnabled={false}
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sectionHeaderText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    flex: 1,
  },
  sectionCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.parchmentDim,
  },
  list: {
    paddingHorizontal: 16,
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
    gap: 4,
  },
  listName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.parchment,
  },
  listMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  listCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  sharedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.goldGlow,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sharedChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.gold,
  },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.surface,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.gold,
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
    gap: 10,
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

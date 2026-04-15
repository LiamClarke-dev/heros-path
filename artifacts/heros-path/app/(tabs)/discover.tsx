import React, { useState, useCallback, useRef } from "react";
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
import Colors from "../../constants/colors";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PlaceCard, type DiscoveredPlace } from "../../components/PlaceCard";
import { AddToListSheet } from "../../components/AddToListSheet";
import { CreateListSheet } from "../../components/CreateListSheet";

type FilterType = "all" | "favorites" | "snoozed";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "favorites", label: "Favorites ❤️" },
  { key: "snoozed", label: "Snoozed 😴" },
];

export default function DiscoverTab() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addToListId, setAddToListId] = useState<string | null>(null);
  const [showCreateList, setShowCreateList] = useState(false);

  const fetchPlaces = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data: { places: DiscoveredPlace[] } = await apiFetch(
          `/api/places/discovered?filter=${filter}`,
          { token }
        );
        setPlaces(data.places);
      } catch {
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, filter]
  );

  useFocusEffect(
    useCallback(() => {
      fetchPlaces();
    }, [fetchPlaces])
  );

  const handleFavorite = useCallback(
    async (id: string, current: boolean) => {
      setPlaces((prev) =>
        prev.map((p) => (p.googlePlaceId === id ? { ...p, isFavorited: !current } : p))
      );
      try {
        await apiFetch(`/api/places/${id}/state`, {
          method: "POST",
          token: token!,
          body: JSON.stringify({ action: current ? "unfavorite" : "favorite" }),
        });
      } catch {
        setPlaces((prev) =>
          prev.map((p) => (p.googlePlaceId === id ? { ...p, isFavorited: current } : p))
        );
      }
    },
    [token]
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      let removed: DiscoveredPlace | undefined;
      setPlaces((prev) => {
        removed = prev.find((p) => p.googlePlaceId === id);
        return prev.filter((p) => p.googlePlaceId !== id);
      });
      try {
        await apiFetch(`/api/places/${id}/state`, {
          method: "POST",
          token: token!,
          body: JSON.stringify({ action: "dismiss" }),
        });
      } catch {
        if (removed) setPlaces((prev) => [removed!, ...prev]);
      }
    },
    [token]
  );

  const handleSnooze = useCallback(
    async (id: string, duration: "1day" | "1week" | "1month") => {
      let removed: DiscoveredPlace | undefined;
      setPlaces((prev) => {
        removed = prev.find((p) => p.googlePlaceId === id);
        return prev.filter((p) => p.googlePlaceId !== id);
      });
      try {
        await apiFetch(`/api/places/${id}/state`, {
          method: "POST",
          token: token!,
          body: JSON.stringify({ action: "snooze", snoozeFor: duration }),
        });
      } catch {
        if (removed) setPlaces((prev) => [removed!, ...prev]);
      }
    },
    [token]
  );

  const handleCreateList = useCallback(
    async (name: string, emoji: string) => {
      await apiFetch("/api/lists", {
        method: "POST",
        token: token!,
        body: JSON.stringify({ name, emoji }),
      });
    },
    [token]
  );

  const renderItem = useCallback(
    ({ item }: { item: DiscoveredPlace }) => (
      <PlaceCard
        place={item}
        onPress={(id) => router.push(`/place-detail?googlePlaceId=${id}`)}
        onFavorite={handleFavorite}
        onDismiss={handleDismiss}
        onSnooze={handleSnooze}
        onAddToList={(id) => setAddToListId(id)}
      />
    ),
    [router, handleFavorite, handleDismiss, handleSnooze]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Discover</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(p) => p.googlePlaceId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPlaces(true)}
              tintColor={Colors.gold}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySubtitle}>
                {filter === "all"
                  ? "Complete a journey to discover nearby places."
                  : filter === "favorites"
                  ? "Favorite some places to see them here."
                  : "Snooze some places to see them here."}
              </Text>
            </View>
          }
        />
      )}

      <AddToListSheet
        visible={addToListId !== null}
        googlePlaceId={addToListId}
        onClose={() => setAddToListId(null)}
        onCreateNew={() => {
          setAddToListId(null);
          setShowCreateList(true);
        }}
      />

      <CreateListSheet
        visible={showCreateList}
        onClose={() => setShowCreateList(false)}
        onCreate={handleCreateList}
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.goldGlow,
    borderColor: Colors.gold,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  chipTextActive: {
    color: Colors.gold,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
});

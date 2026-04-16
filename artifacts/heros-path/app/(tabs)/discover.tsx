import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PlaceCard, type DiscoveredPlace } from "../../components/PlaceCard";
import { AddToListSheet } from "../../components/AddToListSheet";
import { CreateListSheet } from "../../components/CreateListSheet";
import { VisitLogSheet, type VisitRecord } from "../../components/VisitLogSheet";

type FilterType = "all" | "favorites" | "snoozed";
type TypeCategory = "all" | "food" | "parks" | "culture" | "shopping";

interface Journey {
  id: string;
  name: string | null;
  startedAt: string;
}

const STATUS_FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "favorites", label: "Favorites ❤️" },
  { key: "snoozed", label: "Snoozed 😴" },
];

const TYPE_FILTERS: { key: TypeCategory; label: string }[] = [
  { key: "all", label: "All Types" },
  { key: "food", label: "🍽 Food & Drink" },
  { key: "parks", label: "🌿 Parks" },
  { key: "culture", label: "🏛 Culture" },
  { key: "shopping", label: "🛍 Shopping" },
];

function formatJourneyLabel(journey: Journey): string {
  const date = new Date(journey.startedAt);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return journey.name ? `${journey.name} (${dateStr})` : `Journey ${dateStr}`;
}

export default function DiscoverTab() {
  const { token } = useAuth();
  const router = useRouter();

  const [filter, setFilter] = useState<FilterType>("all");
  const [typeFilter, setTypeFilter] = useState<TypeCategory>("all");
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showJourneyPicker, setShowJourneyPicker] = useState(false);

  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [addToListId, setAddToListId] = useState<string | null>(null);
  const [showCreateList, setShowCreateList] = useState(false);
  const [pendingPlaceForNewList, setPendingPlaceForNewList] = useState<string | null>(null);
  const [visitPlaceId, setVisitPlaceId] = useState<string | null>(null);

  const fetchJourneys = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch("/api/journeys/history?limit=50", { token }) as { journeys: Journey[] };
      setJourneys(data.journeys ?? []);
    } catch {
    }
  }, [token]);

  const fetchPlaces = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ filter });
        if (typeFilter !== "all") params.set("type", typeFilter);
        if (selectedJourneyId) params.set("journeyId", selectedJourneyId);

        const data: { places: DiscoveredPlace[] } = await apiFetch(
          `/api/places/discovered?${params.toString()}`,
          { token }
        );
        setPlaces(data.places);
      } catch {
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, filter, typeFilter, selectedJourneyId]
  );

  useFocusEffect(
    useCallback(() => {
      fetchPlaces();
      fetchJourneys();
    }, [fetchPlaces, fetchJourneys])
  );

  const filteredPlaces = searchQuery.trim()
    ? places.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : places;

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
      const result = await apiFetch("/api/lists", {
        method: "POST",
        token: token!,
        body: JSON.stringify({ name, emoji }),
      }) as { list: { id: string } };

      if (pendingPlaceForNewList && result?.list?.id) {
        try {
          await apiFetch(`/api/lists/${result.list.id}/items`, {
            method: "POST",
            token: token!,
            body: JSON.stringify({ googlePlaceId: pendingPlaceForNewList }),
          });
          const newListId = result.list.id;
          setPlaces((prev) =>
            prev.map((p) =>
              p.googlePlaceId === pendingPlaceForNewList
                ? { ...p, listIds: [...(p.listIds ?? []), newListId] }
                : p
            )
          );
        } catch {
        }
        setPendingPlaceForNewList(null);
      }
    },
    [token, pendingPlaceForNewList]
  );

  const handleVisitSaved = useCallback((visit: VisitRecord) => {
    setPlaces((prev) =>
      prev.map((p) =>
        p.googlePlaceId === visit.googlePlaceId
          ? {
              ...p,
              visitCount: p.visitCount + 1,
              lastVisitedAt: visit.visitedAt,
            }
          : p
      )
    );
  }, []);

  const visitPlace = places.find((p) => p.googlePlaceId === visitPlaceId) ?? null;

  const selectedJourney = journeys.find((j) => j.id === selectedJourneyId) ?? null;

  const renderItem = useCallback(
    ({ item }: { item: DiscoveredPlace }) => (
      <PlaceCard
        place={item}
        onPress={(id) => router.push(`/place-detail?googlePlaceId=${id}`)}
        onFavorite={handleFavorite}
        onDismiss={handleDismiss}
        onSnooze={handleSnooze}
        onAddToList={(id) => setAddToListId(id)}
        onMarkVisited={(id) => setVisitPlaceId(id)}
      />
    ),
    [router, handleFavorite, handleDismiss, handleSnooze]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Discover</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={Colors.parchmentDim} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search places…"
            placeholderTextColor={Colors.parchmentDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={Colors.parchmentDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollContainer}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((f) => (
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
        <View style={styles.chipDivider} />
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, typeFilter === f.key && styles.chipActive]}
            onPress={() => setTypeFilter(f.key)}
          >
            <Text style={[styles.chipText, typeFilter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.chipDivider} />
        <TouchableOpacity
          style={[styles.chip, selectedJourneyId !== null && styles.chipActive]}
          onPress={() => setShowJourneyPicker(true)}
        >
          <Feather
            name="map"
            size={12}
            color={selectedJourneyId !== null ? Colors.gold : Colors.parchmentMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.chipText, selectedJourneyId !== null && styles.chipTextActive]}>
            {selectedJourney ? formatJourneyLabel(selectedJourney) : "By Journey"}
          </Text>
          {selectedJourneyId && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); setSelectedJourneyId(null); }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              style={{ marginLeft: 4 }}
            >
              <Feather name="x" size={11} color={Colors.gold} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
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
              <Feather name="compass" size={40} color={Colors.parchmentDim} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? "No matches found" : filter === "all" ? "No places discovered yet" : "Nothing here yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No places match "${searchQuery}"`
                  : filter === "all"
                  ? "Start a journey to discover nearby places!"
                  : filter === "favorites"
                  ? "Favorite some places to see them here."
                  : "Snooze some places to see them here."}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showJourneyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJourneyPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowJourneyPicker(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter by Journey</Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.journeyRow, selectedJourneyId === null && styles.journeyRowActive]}
                onPress={() => { setSelectedJourneyId(null); setShowJourneyPicker(false); }}
              >
                <Feather name="globe" size={16} color={selectedJourneyId === null ? Colors.gold : Colors.parchmentMuted} />
                <Text style={[styles.journeyLabel, selectedJourneyId === null && styles.journeyLabelActive]}>
                  All Journeys
                </Text>
                {selectedJourneyId === null && <Feather name="check" size={14} color={Colors.gold} />}
              </TouchableOpacity>
              {journeys.length === 0 && (
                <Text style={styles.journeyEmpty}>No past journeys found</Text>
              )}
              {journeys.map((j) => (
                <TouchableOpacity
                  key={j.id}
                  style={[styles.journeyRow, selectedJourneyId === j.id && styles.journeyRowActive]}
                  onPress={() => { setSelectedJourneyId(j.id); setShowJourneyPicker(false); }}
                >
                  <Feather name="map-pin" size={16} color={selectedJourneyId === j.id ? Colors.gold : Colors.parchmentMuted} />
                  <Text style={[styles.journeyLabel, selectedJourneyId === j.id && styles.journeyLabelActive]} numberOfLines={1}>
                    {formatJourneyLabel(j)}
                  </Text>
                  {selectedJourneyId === j.id && <Feather name="check" size={14} color={Colors.gold} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <AddToListSheet
        visible={addToListId !== null}
        googlePlaceId={addToListId}
        onClose={() => {
          setAddToListId(null);
          setPendingPlaceForNewList(null);
        }}
        onCreateNew={() => {
          setPendingPlaceForNewList(addToListId);
          setAddToListId(null);
          setShowCreateList(true);
        }}
        onAdded={(listId) => {
          if (!addToListId) return;
          const placeId = addToListId;
          setPlaces((prev) =>
            prev.map((p) =>
              p.googlePlaceId === placeId && !p.listIds?.includes(listId)
                ? { ...p, listIds: [...(p.listIds ?? []), listId] }
                : p
            )
          );
        }}
      />

      <CreateListSheet
        visible={showCreateList}
        onClose={() => { setShowCreateList(false); setPendingPlaceForNewList(null); }}
        onCreate={handleCreateList}
      />

      <VisitLogSheet
        visible={visitPlaceId !== null}
        placeName={visitPlace?.name ?? ""}
        googlePlaceId={visitPlaceId ?? ""}
        token={token ?? ""}
        onClose={() => setVisitPlaceId(null)}
        onSaved={handleVisitSaved}
      />
    </SafeAreaView>
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
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchment,
  },
  filterScrollContainer: {
    flexGrow: 0,
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
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
  chipDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: "70%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.parchment,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sheetScroll: {
    paddingHorizontal: 12,
  },
  journeyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  journeyRowActive: {
    backgroundColor: Colors.goldGlow,
  },
  journeyLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
  },
  journeyLabelActive: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.gold,
  },
  journeyEmpty: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentDim,
    textAlign: "center",
    paddingVertical: 20,
  },
});

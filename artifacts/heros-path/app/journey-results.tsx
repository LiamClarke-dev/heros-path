import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

interface DiscoveredPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  types: string[];
  address: string | null;
  discoverySource: string;
  isFavorited: boolean;
  isDismissed: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurants",
  cafe: "Cafes",
  bar: "Bars",
  night_club: "Nightlife",
  museum: "Museums",
  park: "Parks",
  shopping_mall: "Shopping",
  gym: "Fitness",
  library: "Libraries",
  movie_theater: "Entertainment",
  tourist_attraction: "Attractions",
  bakery: "Bakeries",
  pharmacy: "Health",
  other: "Other Places",
};

function getCategory(types: string[]): string {
  for (const t of types) {
    if (CATEGORY_LABELS[t]) return t;
  }
  return "other";
}

function getTypeIcon(type: string): React.ComponentProps<typeof Feather>["name"] {
  const map: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
    restaurant: "coffee",
    cafe: "coffee",
    bar: "coffee",
    night_club: "music",
    museum: "archive",
    park: "sun",
    shopping_mall: "shopping-bag",
    gym: "activity",
    library: "book",
    movie_theater: "film",
    tourist_attraction: "camera",
    bakery: "coffee",
    pharmacy: "plus-circle",
  };
  return map[type] ?? "map-pin";
}

export default function JourneyResultsScreen() {
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [journeySaved, setJourneySaved] = useState(false);

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchDiscoveries = useCallback(async (retry = 0) => {
    if (!journeyId) return;

    try {
      const res = await fetch(`${apiBase}/journeys/${journeyId}/discoveries`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json() as { places: DiscoveredPlace[] };
        setPlaces(data.places ?? []);
        setIsLoading(false);
        setJourneySaved(true);
        // Invalidate the discover feed so it's fresh
        queryClient.invalidateQueries({ queryKey: ["places"] });
        return;
      }
    } catch {
      // Retry
    }

    // Retry a few times to allow end-of-journey discovery to finish
    if (retry < 4) {
      setTimeout(() => {
        setRetryCount((c) => c + 1);
        void fetchDiscoveries(retry + 1);
      }, 1500);
    } else {
      setIsLoading(false);
      setJourneySaved(true);
    }
  }, [journeyId, apiBase, token, queryClient]);

  useEffect(() => {
    void fetchDiscoveries(0);
  }, [fetchDiscoveries]);

  async function handleAction(googlePlaceId: string, action: string) {
    try {
      await fetch(`${apiBase}/places/${googlePlaceId}/action`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action }),
      });
      setPlaces((prev) =>
        prev.map((p) => {
          if (p.googlePlaceId !== googlePlaceId) return p;
          if (action === "favorite") return { ...p, isFavorited: true };
          if (action === "unfavorite") return { ...p, isFavorited: false };
          if (action === "dismiss") return { ...p, isDismissed: true };
          return p;
        }),
      );
    } catch {
      Alert.alert("Error", "Action failed. Please try again.");
    }
  }

  // Group places by category
  const grouped = places.reduce<Record<string, DiscoveredPlace[]>>((acc, p) => {
    const cat = getCategory(p.types);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort();
  const visiblePlaces = places.filter((p) => !p.isDismissed);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Journey Saved banner */}
      {journeySaved && (
        <View style={styles.savedBanner}>
          <Feather name="check-circle" size={14} color={Colors.success} />
          <Text style={styles.savedBannerText}>Journey saved to your history</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.parchment} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Journey Complete</Text>
          <Text style={styles.headerSubtitle}>
            {isLoading ? "Discovering places…" : `${visiblePlaces.length} places found`}
          </Text>
        </View>
        <Pressable style={styles.doneBtn} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.gold} size="large" />
          <Text style={styles.loadingText}>
            {retryCount === 0
              ? "Searching for places along your route..."
              : "Discovering nearby gems..."}
          </Text>
        </View>
      ) : places.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="map" size={52} color={Colors.parchmentDim} />
          <Text style={styles.emptyTitle}>No places discovered</Text>
          <Text style={styles.emptySubtitle}>
            Try using Ping during your next journey, or adjust your discovery preferences.
          </Text>
          <Pressable style={styles.doneButtonLg} onPress={() => router.replace("/(tabs)")}>
            <Feather name="compass" size={16} color={Colors.background} />
            <Text style={styles.doneButtonLgText}>Back to Map</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Source legend */}
          <View style={styles.legendRow}>
            <LegendItem color={Colors.info} label="From Ping" />
            <LegendItem color={Colors.success} label="Along Route" />
          </View>

          {groupKeys.map((cat) => (
            <View key={cat} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Feather name={getTypeIcon(cat)} size={14} color={Colors.gold} />
                <Text style={styles.categoryTitle}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </Text>
                <Text style={styles.categoryCount}>
                  {grouped[cat].length}
                </Text>
              </View>

              {grouped[cat].map((place) => (
                <ResultPlaceCard
                  key={place.googlePlaceId}
                  place={place}
                  onAction={(action) => void handleAction(place.googlePlaceId, action)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function ResultPlaceCard({
  place,
  onAction,
}: {
  place: DiscoveredPlace;
  onAction: (action: string) => void;
}) {
  if (place.isDismissed) return null;
  const sourceColor = place.discoverySource === "ping" ? Colors.info : Colors.success;
  const typeIcon = getTypeIcon(place.types[0] ?? "");

  return (
    <View style={styles.card}>
      <View style={[styles.sourceBar, { backgroundColor: sourceColor }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardIconWrap}>
          <Feather name={typeIcon} size={18} color={Colors.gold} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {place.name}
          </Text>
          <View style={styles.cardMeta}>
            {place.rating !== null && (
              <View style={styles.ratingRow}>
                <Feather name="star" size={10} color={Colors.gold} />
                <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
              </View>
            )}
            {place.address ? (
              <Text style={styles.cardAddress} numberOfLines={1}>
                {place.address}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.cardActions}>
          <Pressable
            style={styles.actionIcon}
            onPress={() => onAction(place.isFavorited ? "unfavorite" : "favorite")}
          >
            <Feather
              name="heart"
              size={16}
              color={place.isFavorited ? Colors.gold : Colors.parchmentDim}
            />
          </Pressable>
          <Pressable style={styles.actionIcon} onPress={() => onAction("dismiss")}>
            <Feather name="x" size={16} color={Colors.parchmentDim} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(74,163,104,0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74,163,104,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  savedBannerText: {
    fontSize: 12,
    color: Colors.success,
    fontFamily: "Inter_500Medium",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.gold,
    borderRadius: 8,
  },
  doneBtnText: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyState: {
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
    fontSize: 13,
    color: Colors.parchmentDim,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  doneButtonLg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  doneButtonLgText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  categorySection: { gap: 8 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gold,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  card: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  sourceBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.goldDark,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  cardAddress: {
    fontSize: 11,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionIcon: {
    padding: 6,
  },
});

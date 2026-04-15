import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";

interface JourneySummary {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  totalDistanceM: number | null;
  placeCount: number;
  xpEarned: number;
  discoveryStatus: string;
  staticMapUrl: string | null;
}

function formatDurationSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return "<1 min";
}

function formatDistance(m: number | null): string {
  if (m === null) return "—";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function JourneyCard({ item, onPress }: { item: JourneySummary; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {item.staticMapUrl ? (
        <Image
          source={{ uri: item.staticMapUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Feather name="map" size={32} color={Colors.parchmentDim} />
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.dateText}>{formatDate(item.startedAt)}</Text>
        <Text style={styles.durationText}>{formatDurationSeconds(item.durationSeconds)}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Feather name="navigation" size={12} color={Colors.gold} />
            <Text style={styles.badgeText}>{formatDistance(item.totalDistanceM)}</Text>
          </View>
          <View style={styles.badge}>
            <Feather name="compass" size={12} color={Colors.gold} />
            <Text style={styles.badgeText}>
              {item.placeCount} {item.placeCount === 1 ? "place" : "places"}
            </Text>
          </View>
          {item.xpEarned > 0 && (
            <View style={[styles.badge, styles.xpBadge]}>
              <Text style={styles.xpBadgeText}>+{item.xpEarned} XP</Text>
            </View>
          )}
        </View>
      </View>

      <Feather name="chevron-right" size={18} color={Colors.parchmentDim} style={styles.chevron} />
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={[styles.thumbnail, styles.skeleton]} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { width: "60%" }]} />
        <View style={[styles.skeletonLine, { width: "40%", marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: "80%", marginTop: 8 }]} />
      </View>
    </View>
  );
}

export default function PastJourneysScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJourneys = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = (await apiFetch("/api/journeys", {
          headers: { Authorization: `Bearer ${token}` },
        })) as { journeys: JourneySummary[] };
        setJourneys(data.journeys);
      } catch (err) {
        console.warn("[PastJourneys] fetch failed", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchJourneys();
    }, [fetchJourneys])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <Text style={styles.title}>Past Journeys</Text>
      </View>

      {loading ? (
        <View style={styles.listContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={journeys}
          keyExtractor={(j) => j.id}
          renderItem={({ item }) => (
            <JourneyCard
              item={item}
              onPress={() => router.push(`/journey-detail?journeyId=${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchJourneys(true)}
              tintColor={Colors.gold}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="map" size={48} color={Colors.parchmentDim} />
              <Text style={styles.emptyTitle}>No journeys yet</Text>
              <Text style={styles.emptySubtitle}>
                Start exploring to create your first journey!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.parchment,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.card,
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 14,
    gap: 4,
  },
  dateText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.parchment,
  },
  durationText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.parchment,
  },
  xpBadge: {
    backgroundColor: "rgba(212,160,23,0.15)",
    borderColor: Colors.gold,
  },
  xpBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.gold,
  },
  chevron: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -9,
  },
  skeletonCard: {
    overflow: "hidden",
  },
  skeleton: {
    backgroundColor: Colors.card,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: Colors.card,
    borderRadius: 6,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

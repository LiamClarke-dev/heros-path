import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

interface JourneyItem {
  id: string;
  startedAt: string;
  endedAt: string | null;
  totalDistanceM: number | null;
  placeCount: number;
  staticMapUrl: string | null;
  isDevSimulated: boolean;
}

function formatDistance(meters: number | null): string {
  if (!meters) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
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

function formatDuration(start: string, end: string | null): string {
  if (!end) return "In progress";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMins = Math.floor(ms / 60000);
  if (totalMins < 60) return `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function PastJourneysScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = { Authorization: `Bearer ${token}` };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["journeys"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/journeys?limit=50`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch journeys");
      return res.json() as Promise<{ journeys: JourneyItem[] }>;
    },
    enabled: !!token,
  });

  const journeys = (data?.journeys ?? []).filter((j) => j.endedAt != null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.gold} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Past Journeys</Text>
          <Text style={styles.subtitle}>
            {isLoading ? "Loading…" : `${journeys.length} completed`}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : journeys.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="compass" size={48} color={Colors.parchmentDim} />
          <Text style={styles.emptyTitle}>No journeys yet</Text>
          <Text style={styles.emptySubtitle}>
            Complete your first journey to see it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={journeys}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
          renderItem={({ item }) => (
            <JourneyCard
              journey={item}
              onPress={() =>
                router.push({
                  pathname: "/journey-detail",
                  params: { journeyId: item.id },
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

function JourneyCard({
  journey,
  onPress,
}: {
  journey: JourneyItem;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {journey.staticMapUrl ? (
        <Image
          source={{ uri: journey.staticMapUrl }}
          style={styles.mapThumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.mapThumbnail, styles.mapPlaceholder]}>
          <Feather name="map" size={32} color={Colors.parchmentDim} />
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.cardDate}>{formatDate(journey.startedAt)}</Text>
        {journey.isDevSimulated && (
          <View style={styles.devBadge}>
            <Text style={styles.devBadgeText}>Simulated</Text>
          </View>
        )}
        <View style={styles.statsRow}>
          <StatItem icon="navigation" value={formatDistance(journey.totalDistanceM)} />
          <StatItem icon="clock" value={formatDuration(journey.startedAt, journey.endedAt)} />
          <StatItem icon="map-pin" value={`${journey.placeCount} places`} />
        </View>
      </View>

      <View style={styles.chevron}>
        <Feather name="chevron-right" size={18} color={Colors.parchmentDim} />
      </View>
    </Pressable>
  );
}

function StatItem({ icon, value }: { icon: React.ComponentProps<typeof Feather>["name"]; value: string }) {
  return (
    <View style={styles.statItem}>
      <Feather name={icon} size={12} color={Colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
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
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  mapThumbnail: {
    width: 100,
    height: 90,
    backgroundColor: Colors.surface,
  },
  mapPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  cardDate: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  devBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devBadgeText: {
    fontSize: 10,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  chevron: {
    paddingRight: 12,
  },
});

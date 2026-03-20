import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

type PlaceFilter = "all" | "unreviewed" | "favorited" | "snoozed";

interface DiscoveredPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  types: string[];
  address: string | null;
  firstDiscoveredAt: string;
  discoveryCount: number;
  isDismissed: boolean;
  isFavorited: boolean;
  isSnoozed: boolean;
  snoozedUntil: string | null;
}

export default function DiscoverScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<PlaceFilter>("all");

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["places", filter],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/places/discover?filter=${filter}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch places");
      return res.json() as Promise<{ places: DiscoveredPlace[] }>;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      googlePlaceId,
      action,
    }: {
      googlePlaceId: string;
      action: string;
    }) => {
      const res = await fetch(`${apiBase}/places/${googlePlaceId}/action`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
    onError: () => Alert.alert("Error", "Action failed. Please try again."),
  });

  const places = data?.places ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discoveries</Text>
        <Text style={styles.subtitle}>{places.length} places</Text>
      </View>

      <View style={styles.filterRow}>
        {(["all", "unreviewed", "favorited", "snoozed"] as PlaceFilter[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : places.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="map-pin" size={48} color={Colors.parchmentDim} />
          <Text style={styles.emptyTitle}>No places here yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a journey and use Ping to discover nearby places.
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.googlePlaceId}
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
            <PlaceCard
              place={item}
              onAction={(action) =>
                actionMutation.mutate({ googlePlaceId: item.googlePlaceId, action })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

function PlaceCard({
  place,
  onAction,
}: {
  place: DiscoveredPlace;
  onAction: (action: string) => void;
}) {
  const mainType = place.types[0]?.replace(/_/g, " ") ?? "place";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {place.name}
          </Text>
          {place.isFavorited && (
            <Feather name="heart" size={14} color={Colors.gold} />
          )}
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardType}>{mainType}</Text>
          {place.rating !== null && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={11} color={Colors.gold} />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {place.address && (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {place.address}
          </Text>
        )}
        <Text style={styles.discoveryCount}>
          Discovered {place.discoveryCount}x
        </Text>
      </View>

      <View style={styles.cardActions}>
        {!place.isFavorited ? (
          <ActionButton icon="heart" label="Favorite" onPress={() => onAction("favorite")} color={Colors.gold} />
        ) : (
          <ActionButton icon="heart" label="Unfave" onPress={() => onAction("unfavorite")} color={Colors.parchmentMuted} />
        )}
        <ActionButton icon="clock" label="Snooze" onPress={() => onAction("snooze")} color={Colors.info} />
        <ActionButton icon="x" label="Dismiss" onPress={() => onAction("dismiss")} color={Colors.error} />
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable style={styles.actionBtn} onPress={onPress}>
      <Feather name={icon} size={14} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.goldDark,
    borderColor: Colors.gold,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_500Medium",
  },
  filterChipTextActive: {
    color: Colors.gold,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  cardHeader: { gap: 4 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardType: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  cardAddress: {
    fontSize: 12,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  discoveryCount: {
    fontSize: 11,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});

import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

interface JourneyDetail {
  id: string;
  startedAt: string;
  endedAt: string | null;
  totalDistanceM: number | null;
  polylineEncoded: string | null;
  isDevSimulated: boolean;
  placeCount: number;
}

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  recordedAt: string;
}

interface DiscoveredPlaceDetail {
  googlePlaceId: string;
  name: string;
  types: string[];
  lat: number;
  lng: number;
  rating: number | null;
  address: string | null;
  discoveredAt: string;
  discoverySource: string;
  isFavorited: boolean;
  isSnoozed: boolean;
  isDismissed: boolean;
  discoveryCount: number;
}

function formatDistance(meters: number | null): string {
  if (!meters) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "In progress";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMins = Math.floor(ms / 60000);
  if (totalMins < 60) return `${totalMins} min`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function JourneyDetailScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>();

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = { Authorization: `Bearer ${token}` };

  const { data: journeyData, isLoading: journeyLoading } = useQuery({
    queryKey: ["journey", journeyId],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/journeys/${journeyId}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch journey");
      return res.json() as Promise<{ journey: JourneyDetail; waypoints: Waypoint[] }>;
    },
    enabled: !!journeyId,
  });

  const { data: discoveriesData, isLoading: discoveriesLoading } = useQuery({
    queryKey: ["journey-discoveries", journeyId],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/journeys/${journeyId}/discoveries`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch discoveries");
      return res.json() as Promise<{ places: DiscoveredPlaceDetail[] }>;
    },
    enabled: !!journeyId,
  });

  const journey = journeyData?.journey;
  const waypoints = journeyData?.waypoints ?? [];
  const places = discoveriesData?.places ?? [];
  const isLoading = journeyLoading || discoveriesLoading;

  const pingPlaces = places.filter((p) => p.discoverySource === "ping");
  const routePlaces = places.filter((p) => p.discoverySource === "route");

  const routeCoords = waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng }));

  const mapInitialRegion = waypoints.length > 0
    ? {
        latitude: waypoints[Math.floor(waypoints.length / 2)].lat,
        longitude: waypoints[Math.floor(waypoints.length / 2)].lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : undefined;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.gold} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Journey Detail</Text>
          {journey && (
            <Text style={styles.subtitle}>{formatDate(journey.startedAt)}</Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : !journey ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Journey not found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Route Map */}
          <View style={styles.mapContainer}>
            {routeCoords.length > 0 ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                customMapStyle={Colors.mapDark}
                initialRegion={mapInitialRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                mapType="standard"
                onMapReady={() => {
                  if (routeCoords.length > 1) {
                    mapRef.current?.fitToCoordinates(routeCoords, {
                      edgePadding: { top: 32, right: 32, bottom: 32, left: 32 },
                      animated: false,
                    });
                  }
                }}
              >
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={Colors.gold}
                  strokeWidth={4}
                />
                {pingPlaces.map((place) => (
                  <Marker
                    key={place.googlePlaceId}
                    coordinate={{ latitude: place.lat, longitude: place.lng }}
                    title={place.name}
                    pinColor={Colors.gold}
                  />
                ))}
              </MapView>
            ) : (
              <View style={[styles.map, styles.mapPlaceholder]}>
                <Feather name="map" size={36} color={Colors.parchmentDim} />
                <Text style={styles.mapPlaceholderText}>No route recorded</Text>
              </View>
            )}
          </View>

          {/* Summary */}
          <View style={[styles.summaryCard, { marginHorizontal: 16 }]}>
            <View style={styles.summaryRow}>
              <SummaryItem
                icon="navigation"
                label="Distance"
                value={formatDistance(journey.totalDistanceM)}
              />
              <SummaryItem
                icon="clock"
                label="Duration"
                value={formatDuration(journey.startedAt, journey.endedAt)}
              />
              <SummaryItem
                icon="map-pin"
                label="Discovered"
                value={`${places.length}`}
              />
            </View>
            <View style={styles.summaryMeta}>
              <View style={styles.timeRow}>
                <Feather name="play" size={12} color={Colors.success} />
                <Text style={styles.timeText}>{formatTime(journey.startedAt)}</Text>
                {journey.endedAt && (
                  <>
                    <Feather name="minus" size={12} color={Colors.parchmentDim} />
                    <Feather name="stop-circle" size={12} color={Colors.error} />
                    <Text style={styles.timeText}>{formatTime(journey.endedAt)}</Text>
                  </>
                )}
              </View>
              {journey.isDevSimulated && (
                <View style={styles.devBadge}>
                  <Text style={styles.devBadgeText}>Dev Simulated</Text>
                </View>
              )}
            </View>
          </View>

          {/* Place lists */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            {pingPlaces.length > 0 && (
              <Section title="Pinged During Journey" icon="radio" count={pingPlaces.length}>
                {pingPlaces.map((p) => (
                  <PlaceRow key={p.googlePlaceId} place={p} />
                ))}
              </Section>
            )}

            {routePlaces.length > 0 && (
              <Section title="Discovered Along Route" icon="compass" count={routePlaces.length}>
                {routePlaces.map((p) => (
                  <PlaceRow key={p.googlePlaceId} place={p} />
                ))}
              </Section>
            )}

            {places.length === 0 && (
              <View style={styles.emptySection}>
                <Feather name="map-pin" size={32} color={Colors.parchmentDim} />
                <Text style={styles.emptyText}>No places discovered on this journey.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Feather name={icon} size={16} color={Colors.gold} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  count: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Feather name={icon} size={14} color={Colors.gold} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function PlaceRow({ place }: { place: DiscoveredPlaceDetail }) {
  const mainType = place.types[0]?.replace(/_/g, " ") ?? "place";

  return (
    <View style={styles.placeRow}>
      <View style={styles.placeIcon}>
        <Feather
          name={place.isFavorited ? "heart" : "map-pin"}
          size={14}
          color={place.isFavorited ? Colors.gold : Colors.parchmentMuted}
        />
      </View>
      <View style={styles.placeContent}>
        <Text style={styles.placeName} numberOfLines={1}>
          {place.name}
        </Text>
        <View style={styles.placeMeta}>
          <Text style={styles.placeType}>{mainType}</Text>
          {place.rating !== null && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={10} color={Colors.gold} />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.placeStatusIcons}>
        {place.isFavorited && <Feather name="heart" size={12} color={Colors.gold} />}
        {place.isSnoozed && <Feather name="clock" size={12} color={Colors.info} />}
      </View>
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
  errorText: {
    fontSize: 16,
    color: Colors.error,
    fontFamily: "Inter_400Regular",
  },
  mapContainer: {
    height: 220,
    marginBottom: 16,
    backgroundColor: Colors.surface,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  summaryMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  devBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devBadgeText: {
    fontSize: 10,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  countBadge: {
    backgroundColor: Colors.goldDark,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  sectionContent: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  placeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  placeContent: { flex: 1 },
  placeName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.parchment,
    fontFamily: "Inter_500Medium",
  },
  placeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  placeType: {
    fontSize: 11,
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
    fontSize: 11,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  placeStatusIcons: {
    flexDirection: "row",
    gap: 4,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

interface Waypoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

interface DiscoveredPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  types: string[];
  address: string | null;
  distanceM: number;
}

type JourneyStatus = "idle" | "active" | "ending";

export default function JourneyScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [journeyStatus, setJourneyStatus] = useState<JourneyStatus>("idle");
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredPlace[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [pingCount, setPingCount] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const waypointBufferRef = useRef<Waypoint[]>([]);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  async function requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Location Required",
        "Hero's Path needs location access to track your journey.",
        [{ text: "OK" }],
      );
      return false;
    }
    return true;
  }

  async function startJourney() {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    try {
      const res = await fetch(`${apiBase}/journeys`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ isDevSimulated: false }),
      });

      if (!res.ok) throw new Error("Failed to start journey");
      const journey = await res.json() as { id: string };

      setJourneyId(journey.id);
      setWaypoints([]);
      setDiscoveredPlaces([]);
      setPingCount(0);
      setXpGained(0);
      waypointBufferRef.current = [];
      setJourneyStatus("active");

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (loc) => {
          const wp: Waypoint = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            recordedAt: new Date(loc.timestamp).toISOString(),
          };
          setCurrentLocation({ lat: wp.lat, lng: wp.lng });
          setWaypoints((prev) => [...prev, wp]);
          waypointBufferRef.current.push(wp);

          mapRef.current?.animateToRegion({
            latitude: wp.lat,
            longitude: wp.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
        },
      );

      locationSubRef.current = sub;

      const flushInterval = setInterval(async () => {
        if (waypointBufferRef.current.length === 0) return;
        const toFlush = [...waypointBufferRef.current];
        waypointBufferRef.current = [];

        await fetch(`${apiBase}/journeys/${journey.id}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ waypoints: toFlush }),
        }).catch(() => {});
      }, 15000);

      flushIntervalRef.current = flushInterval;
    } catch (err) {
      Alert.alert("Error", "Failed to start journey. Check your connection.");
    }
  }

  async function endJourney() {
    if (!journeyId) return;
    setJourneyStatus("ending");

    locationSubRef.current?.remove();
    locationSubRef.current = null;

    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }

    const remainingWaypoints = waypointBufferRef.current;
    waypointBufferRef.current = [];

    try {
      await fetch(`${apiBase}/journeys/${journeyId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          waypoints: remainingWaypoints,
          status: "ended",
        }),
      });

      const xp = Math.floor(waypoints.length * 0.5) + pingCount * 5;
      setXpGained(xp);
    } catch {
      Alert.alert("Error", "Failed to save journey. Data may be incomplete.");
    } finally {
      setJourneyStatus("idle");
      setJourneyId(null);
    }
  }

  async function handlePing() {
    if (!journeyId || !currentLocation || isPinging) return;
    setIsPinging(true);

    try {
      const res = await fetch(`${apiBase}/journeys/${journeyId}/ping`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ lat: currentLocation.lat, lng: currentLocation.lng }),
      });

      if (res.ok) {
        const data = await res.json() as { places: DiscoveredPlace[] };
        if (data.places.length > 0) {
          setDiscoveredPlaces((prev) => {
            const existingIds = new Set(prev.map((p) => p.googlePlaceId));
            const newPlaces = data.places.filter((p) => !existingIds.has(p.googlePlaceId));
            return [...prev, ...newPlaces];
          });
          setPingCount((c) => c + 1);
        }
      }
    } catch {
    } finally {
      setIsPinging(false);
    }
  }

  useEffect(() => {
    return () => {
      locationSubRef.current?.remove();
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
    };
  }, []);

  const polylineCoords = waypoints.map((w) => ({
    latitude: w.lat,
    longitude: w.lng,
  }));

  const placeMarkers = discoveredPlaces.slice(0, 20);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        customMapStyle={Colors.mapDark}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: currentLocation?.lat ?? 37.7749,
          longitude: currentLocation?.lng ?? -122.4194,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        mapType="standard"
      >
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={Colors.gold}
            strokeWidth={4}
          />
        )}
        {placeMarkers.map((place) => (
          <Marker
            key={place.googlePlaceId}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            title={place.name}
            description={place.address ?? ""}
            pinColor={Colors.gold}
          />
        ))}
      </MapView>

      <LinearGradient
        colors={["rgba(13,10,11,0.85)", "transparent"]}
        style={[styles.topBar, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.title}>Journey</Text>
        {journeyStatus === "active" && (
          <View style={styles.statsRow}>
            <StatChip icon="map-pin" value={`${waypoints.length} pts`} />
            <StatChip icon="search" value={`${discoveredPlaces.length} found`} />
          </View>
        )}
      </LinearGradient>

      {xpGained > 0 && journeyStatus === "idle" && (
        <View style={[styles.xpToast, { top: insets.top + 80 }]}>
          <Feather name="star" size={14} color={Colors.gold} />
          <Text style={styles.xpToastText}>+{xpGained} XP earned!</Text>
        </View>
      )}

      <LinearGradient
        colors={["transparent", "rgba(13,10,11,0.95)"]}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 80 }]}
      >
        {journeyStatus === "idle" && (
          <Pressable style={styles.startButton} onPress={startJourney}>
            <Feather name="play" size={20} color={Colors.background} />
            <Text style={styles.startButtonText}>Begin Journey</Text>
          </Pressable>
        )}

        {journeyStatus === "active" && (
          <View style={styles.activeControls}>
            <Pressable
              style={[styles.pingButton, isPinging && styles.pingButtonDisabled]}
              onPress={handlePing}
              disabled={isPinging}
            >
              {isPinging ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <>
                  <Feather name="radio" size={18} color={Colors.background} />
                  <Text style={styles.pingButtonText}>Ping</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.endButton} onPress={endJourney}>
              <Feather name="square" size={18} color={Colors.error} />
              <Text style={styles.endButtonText}>End Journey</Text>
            </Pressable>
          </View>
        )}

        {journeyStatus === "ending" && (
          <View style={styles.endingRow}>
            <ActivityIndicator color={Colors.gold} />
            <Text style={styles.endingText}>Saving journey...</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function StatChip({ icon, value }: { icon: React.ComponentProps<typeof Feather>["name"]; value: string }) {
  return (
    <View style={styles.statChip}>
      <Feather name={icon} size={12} color={Colors.gold} />
      <Text style={styles.statChipText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statChipText: {
    fontSize: 12,
    color: Colors.parchment,
    fontFamily: "Inter_500Medium",
  },
  xpToast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  xpToastText: {
    color: Colors.gold,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: "center",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    minWidth: 200,
    justifyContent: "center",
  },
  startButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  activeControls: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  pingButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.info,
    paddingVertical: 14,
    borderRadius: 12,
  },
  pingButtonDisabled: { opacity: 0.6 },
  pingButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  endButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 14,
    borderRadius: 12,
  },
  endButtonText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  endingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  endingText: {
    color: Colors.parchmentMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});

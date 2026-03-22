import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  ScrollView,
} from "react-native";
import MapView, { Polyline, Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import PingResultsSheet, { type DiscoveredPlace } from "@/components/PingResultsSheet";

interface Waypoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

interface HistoricalJourney {
  id: string;
  waypoints: { lat: number; lng: number }[];
}

interface QuestItem {
  key: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  isCompleted: boolean;
}

interface JourneyEndResult {
  xpGained?: number;
  newLevel?: number;
  newBadges?: Array<{ key: string; name: string; description: string }>;
  completedQuests?: Array<{ key: string; title: string; xpReward: number }>;
  newStreak?: number;
}

type JourneyStatus = "idle" | "active" | "ending";

const HISTORICAL_COLORS = ["rgba(212,160,23,0.25)", "rgba(212,160,23,0.18)", "rgba(212,160,23,0.12)"];

export default function JourneyScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [journeyStatus, setJourneyStatus] = useState<JourneyStatus>("idle");
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pingPlaces, setPingPlaces] = useState<DiscoveredPlace[]>([]);
  const [showPingSheet, setShowPingSheet] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingCount, setPingCount] = useState(0);
  const [historicalJourneys, setHistoricalJourneys] = useState<HistoricalJourney[]>([]);
  const [newTerritoryNearby, setNewTerritoryNearby] = useState(false);
  const [exploredCells, setExploredCells] = useState<Array<{ lat: number; lng: number }>>([]);
  const [unexploredCells, setUnexploredCells] = useState<Array<{ lat: number; lng: number }>>([]);

  // Quest panel state
  const [questPanelOpen, setQuestPanelOpen] = useState(false);

  // Celebration overlay state
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    title: string;
    subtitle: string;
    xp: number;
  } | null>(null);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.8)).current;

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const waypointBufferRef = useRef<Waypoint[]>([]);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentJourneyIdRef = useRef<string | null>(null);

  async function handleLocateMe() {
    let loc = currentLocation;

    // If we don't have a cached location yet (pre-journey / app cold start), fetch one now
    if (!loc) {
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          loc = { lat: last.coords.latitude, lng: last.coords.longitude };
          setCurrentLocation(loc);
        } else {
          // Last known unavailable — request a fresh fix (may take a moment)
          const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          loc = { lat: fresh.coords.latitude, lng: fresh.coords.longitude };
          setCurrentLocation(loc);
        }
      } catch {
        // Permissions not granted or location unavailable — silently ignore
        return;
      }
    }

    mapRef.current?.animateToRegion(
      {
        latitude: loc.lat,
        longitude: loc.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  }

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const { data: questsData } = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/quests`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch quests");
      return res.json() as Promise<{ active: QuestItem[]; completed: QuestItem[] }>;
    },
    enabled: !!token,
    refetchInterval: journeyStatus === "active" ? 30000 : false,
  });

  const activeQuests = (questsData?.active ?? []).slice(0, 3);

  // Seed currentLocation on mount so the Locate Me button works before any journey starts
  useEffect(() => {
    void (async () => {
      try {
        const loc = await Location.getLastKnownPositionAsync();
        if (loc) {
          setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {
        // non-critical
      }
    })();
  }, []);

  // Load historical journey polylines and explored cells on mount
  useEffect(() => {
    loadHistoricalJourneys();
    loadExploredCells();
  }, []);

  async function loadExploredCells(lat?: number, lng?: number) {
    try {
      // Use provided coords or try to get current location
      let useLat = lat;
      let useLng = lng;
      if (useLat == null || useLng == null) {
        const loc = await Location.getLastKnownPositionAsync();
        if (loc) {
          useLat = loc.coords.latitude;
          useLng = loc.coords.longitude;
        } else {
          return; // no location yet
        }
      }
      const res = await fetch(`${apiBase}/journeys/explored-cells?lat=${useLat}&lng=${useLng}&radius=0.015`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json() as {
          exploredCells: Array<{ lat: number; lng: number }>;
          unexploredCells: Array<{ lat: number; lng: number }>;
        };
        if (data.exploredCells) setExploredCells(data.exploredCells);
        if (data.unexploredCells) setUnexploredCells(data.unexploredCells);
      }
    } catch {
      // non-critical
    }
  }

  async function loadHistoricalJourneys() {
    try {
      const res = await fetch(`${apiBase}/journeys/history`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json() as { journeys: HistoricalJourney[] };
        setHistoricalJourneys(data.journeys ?? []);
      }
    } catch {
      // Non-critical — silently fail
    }
  }

  function showCelebration(title: string, subtitle: string, xp: number) {
    setCelebrationData({ title, subtitle, xp });
    setCelebrationVisible(true);
    Animated.parallel([
      Animated.spring(celebrationScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(celebrationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(celebrationScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
        Animated.timing(celebrationOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setCelebrationVisible(false);
        celebrationScale.setValue(0.8);
      });
    }, 3000);
  }

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

      currentJourneyIdRef.current = journey.id;
      setJourneyId(journey.id);
      setWaypoints([]);
      setPingPlaces([]);
      setPingCount(0);
      waypointBufferRef.current = [];
      setJourneyStatus("active");

      // Track location updates and check for unexplored territory
      let lastExploredCheckLat = 0;
      let lastExploredCheckLng = 0;
      const EXPLORED_CHECK_DISTANCE = 0.001; // ~100m before re-checking

      async function checkExploredStatus(lat: number, lng: number) {
        try {
          const dist = Math.abs(lat - lastExploredCheckLat) + Math.abs(lng - lastExploredCheckLng);
          if (dist < EXPLORED_CHECK_DISTANCE) return;
          lastExploredCheckLat = lat;
          lastExploredCheckLng = lng;
          const res = await fetch(`${apiBase}/journeys/explored-cells?lat=${lat}&lng=${lng}&radius=0.012`, {
            headers: authHeaders,
          });
          if (res.ok) {
            const data = await res.json() as {
              newTerritoryNearby: boolean;
              exploredCells: Array<{ lat: number; lng: number }>;
              unexploredCells: Array<{ lat: number; lng: number }>;
            };
            setNewTerritoryNearby(!!data.newTerritoryNearby);
            if (data.exploredCells) setExploredCells(data.exploredCells);
            if (data.unexploredCells) setUnexploredCells(data.unexploredCells);
          }
        } catch {
          // non-critical
        }
      }

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

          void checkExploredStatus(wp.lat, wp.lng);
        },
      );

      locationSubRef.current = sub;

      const jid = journey.id;
      const flushInterval = setInterval(async () => {
        if (waypointBufferRef.current.length === 0) return;
        const toFlush = [...waypointBufferRef.current];
        waypointBufferRef.current = [];

        await fetch(`${apiBase}/journeys/${jid}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ waypoints: toFlush }),
        }).catch(() => {});
      }, 15000);

      flushIntervalRef.current = flushInterval;
    } catch {
      Alert.alert("Error", "Failed to start journey. Check your connection.");
    }
  }

  async function endJourney() {
    const jid = currentJourneyIdRef.current;
    if (!jid) return;
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
      const res = await fetch(`${apiBase}/journeys/${jid}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          waypoints: remainingWaypoints,
          status: "ended",
        }),
      });

      let journeyResult: JourneyEndResult = {};
      if (res.ok) {
        journeyResult = await res.json() as JourneyEndResult;
      }

      setJourneyStatus("idle");
      setJourneyId(null);
      currentJourneyIdRef.current = null;
      setNewTerritoryNearby(false);

      // Invalidate quests + profile after journey ends
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      queryClient.invalidateQueries({ queryKey: ["badges"] });

      // Show celebration for completed quests
      if (journeyResult.completedQuests && journeyResult.completedQuests.length > 0) {
        const firstQuest = journeyResult.completedQuests[0];
        setTimeout(() => {
          showCelebration("Quest Complete!", firstQuest.title, firstQuest.xpReward);
        }, 500);
      } else if (journeyResult.xpGained && journeyResult.xpGained > 0) {
        setTimeout(() => {
          showCelebration("Journey Complete!", `+${journeyResult.xpGained} XP earned`, journeyResult.xpGained ?? 0);
        }, 500);
      }

      // Reload historical overlays and explored cells, then navigate to results
      void loadHistoricalJourneys();
      void loadExploredCells();
      router.push(`/journey-results?journeyId=${jid}`);
    } catch {
      Alert.alert("Error", "Failed to save journey. Data may be incomplete.");
      setJourneyStatus("idle");
      setJourneyId(null);
      currentJourneyIdRef.current = null;
    }
  }

  async function handlePing() {
    const jid = currentJourneyIdRef.current;
    if (!jid || !currentLocation || isPinging) return;
    setIsPinging(true);

    try {
      const res = await fetch(`${apiBase}/journeys/${jid}/ping`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ lat: currentLocation.lat, lng: currentLocation.lng }),
      });

      if (res.ok) {
        const data = await res.json() as { places: DiscoveredPlace[] };
        setPingPlaces(data.places);
        setShowPingSheet(true);
        if (data.places.length > 0) {
          setPingCount((c) => c + 1);
        }
      }
    } catch {
      // No-op
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
        {/* UNEXPLORED cells — teal/cyan glow to guide discovery (primary visual cue) */}
        {unexploredCells.slice(0, 120).map((cell, idx) => (
          <Circle
            key={`unexplored-${idx}`}
            center={{ latitude: cell.lat, longitude: cell.lng }}
            radius={30}
            fillColor="rgba(41,182,246,0.12)"
            strokeColor="rgba(41,182,246,0.35)"
            strokeWidth={1}
          />
        ))}

        {/* Explored cells — subtle gold tint over previously walked areas */}
        {exploredCells.slice(0, 100).map((cell, idx) => (
          <Circle
            key={`explored-${idx}`}
            center={{ latitude: cell.lat, longitude: cell.lng }}
            radius={26}
            fillColor="rgba(212,160,23,0.12)"
            strokeColor="rgba(212,160,23,0.25)"
            strokeWidth={1}
          />
        ))}

        {/* Historical journey overlays (faded amber) */}
        {historicalJourneys.map((journey, idx) => {
          if (journey.waypoints.length < 2) return null;
          const coords = journey.waypoints.map((w) => ({
            latitude: w.lat,
            longitude: w.lng,
          }));
          const color = HISTORICAL_COLORS[Math.min(idx, HISTORICAL_COLORS.length - 1)];
          return (
            <Polyline
              key={`hist-${journey.id}`}
              coordinates={coords}
              strokeColor={color}
              strokeWidth={5}
            />
          );
        })}

        {/* Live journey path */}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={Colors.gold}
            strokeWidth={5}
          />
        )}

        {/* Ping-discovered place markers */}
        {pingPlaces.slice(0, 20).map((place) => (
          <Marker
            key={place.googlePlaceId}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            title={place.name}
            description={place.address ?? ""}
            pinColor={Colors.gold}
          />
        ))}
      </MapView>

      {/* Top bar */}
      <LinearGradient
        colors={["rgba(13,10,11,0.85)", "transparent"]}
        style={[styles.topBar, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.title}>Journey</Text>
        {journeyStatus === "active" && (
          <View style={styles.statsRow}>
            <StatChip icon="map-pin" value={`${waypoints.length} pts`} />
            <StatChip icon="search" value={`${pingPlaces.length} found`} />
            {pingCount > 0 && <StatChip icon="radio" value={`${pingCount} pings`} />}
          </View>
        )}
      </LinearGradient>

      {/* Quest panel — shown during active journey */}
      {journeyStatus === "active" && activeQuests.length > 0 && (
        <View style={[styles.questPanel, { top: insets.top + 80 }]}>
          <Pressable
            style={styles.questPanelHeader}
            onPress={() => setQuestPanelOpen((v) => !v)}
          >
            <Feather name="flag" size={13} color={Colors.gold} />
            <Text style={styles.questPanelTitle}>Quests</Text>
            <Feather
              name={questPanelOpen ? "chevron-up" : "chevron-down"}
              size={13}
              color={Colors.parchmentMuted}
            />
          </Pressable>
          {questPanelOpen && (
            <ScrollView style={{ maxHeight: 200 }} scrollEnabled>
              {activeQuests.map((q) => {
                const pct = Math.min(1, q.progress / q.target);
                return (
                  <View key={q.key} style={styles.questPanelItem}>
                    <View style={styles.questPanelItemHeader}>
                      <Text style={styles.questPanelItemTitle} numberOfLines={1}>{q.title}</Text>
                      <Text style={styles.questPanelItemXp}>+{q.xpReward} XP</Text>
                    </View>
                    <View style={styles.questPanelBar}>
                      <View style={[styles.questPanelFill, { width: `${Math.round(pct * 100)}%` }]} />
                    </View>
                    <Text style={styles.questPanelProgress}>{q.progress}/{q.target}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Bottom controls */}
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

      {/* Ping results bottom sheet */}
      <PingResultsSheet
        visible={showPingSheet}
        places={pingPlaces}
        onDismiss={() => setShowPingSheet(false)}
      />

      {/* "New territory ahead!" nudge banner */}
      {journeyStatus === "active" && newTerritoryNearby && (
        <View style={[styles.nudgeBanner, { bottom: insets.bottom + 170 }]}>
          <Feather name="compass" size={14} color={Colors.background} />
          <Text style={styles.nudgeText}>New territory ahead!</Text>
        </View>
      )}

      {/* Floating map action buttons — Locate Me + Discovery Filter (idle only) */}
      <View style={[styles.mapActions, { top: insets.top + 12, right: 12 }]}>
        {journeyStatus === "idle" && (
          <Pressable
            style={styles.mapActionBtn}
            onPress={() => router.push("/settings/preferences")}
            accessibilityLabel="Discovery preferences"
          >
            <Feather name="sliders" size={18} color={Colors.parchment} />
          </Pressable>
        )}
        <Pressable
          style={styles.mapActionBtn}
          onPress={handleLocateMe}
          accessibilityLabel="Center map on my location"
        >
          <Feather name="crosshair" size={18} color={Colors.parchment} />
        </Pressable>
      </View>

      {/* Quest/XP celebration overlay */}
      {celebrationVisible && celebrationData && (
        <Animated.View
          style={[
            styles.celebrationOverlay,
            { opacity: celebrationOpacity },
          ]}
          pointerEvents="none"
        >
          <Animated.View style={[styles.celebrationCard, { transform: [{ scale: celebrationScale }] }]}>
            <Text style={styles.celebrationEmoji}>⚔️</Text>
            <Text style={styles.celebrationTitle}>{celebrationData.title}</Text>
            <Text style={styles.celebrationSubtitle}>{celebrationData.subtitle}</Text>
            <View style={styles.celebrationXpBadge}>
              <Feather name="star" size={14} color={Colors.background} />
              <Text style={styles.celebrationXpText}>+{celebrationData.xp} XP</Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}
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
    flexWrap: "wrap",
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
  questPanel: {
    position: "absolute",
    right: 12,
    left: 12,
    backgroundColor: "rgba(26,21,16,0.93)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  questPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  questPanelTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  questPanelItem: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 4,
  },
  questPanelItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questPanelItemTitle: {
    fontSize: 12,
    color: Colors.parchment,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  questPanelItemXp: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  questPanelBar: {
    height: 3,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: "hidden",
  },
  questPanelFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  questPanelProgress: {
    fontSize: 10,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
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
  celebrationOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  celebrationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gold,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginHorizontal: 40,
    shadowColor: Colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  celebrationEmoji: {
    fontSize: 48,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  celebrationSubtitle: {
    fontSize: 14,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  celebrationXpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  celebrationXpText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.background,
    fontFamily: "Inter_700Bold",
  },
  nudgeBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#29B6F6",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  nudgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  mapActions: {
    position: "absolute",
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
  },
  mapActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(26,21,16,0.88)",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
});

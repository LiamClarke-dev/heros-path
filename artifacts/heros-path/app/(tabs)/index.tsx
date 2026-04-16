import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LOCATION_TASK, WAYPOINT_BUFFER_KEY } from "../../lib/locationTask";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type RNMapView from "react-native-maps";
import type { MapViewProps, MapMarkerProps, MapPolylineProps, Provider } from "react-native-maps";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { rdpSimplify } from "../../lib/geo";
import Colors from "../../constants/colors";

const IS_WEB = Platform.OS === "web";

let MapView: React.ComponentClass<MapViewProps> | null = null;
let Marker: React.ComponentType<MapMarkerProps> | null = null;
let Polyline: React.ComponentType<MapPolylineProps> | null = null;
let PROVIDER_GOOGLE: Provider | null = null;

if (!IS_WEB) {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

import { CharacterMarker } from "../../components/CharacterMarker";
import PingResultsSheet, { type PlaceResult as PingPlace } from "../../components/PingResultsSheet";
import QuestProgressBar from "../../components/QuestProgressBar";

interface Waypoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

interface HistoricalJourney {
  id: string;
  startedAt: string;
  waypoints: Array<{ lat: number; lng: number }>;
}

interface ExploredCell {
  lat: number;
  lng: number;
}

type JourneyStatus = "idle" | "active" | "ending";

interface QuestItem {
  key: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  isCompleted: boolean;
}

interface BadgeItem {
  key: string;
  name: string;
  description: string;
  icon: string;
}

interface GamificationResult {
  xpGained: number;
  newLevel: number;
  newBadges: BadgeItem[];
  completedQuests: Array<{ key: string; title: string; xpReward: number }>;
  newStreak: number;
}

const HISTORY_COLORS = [
  "rgba(212,160,23,0.45)",
  "rgba(212,160,23,0.30)",
  "rgba(212,160,23,0.18)",
];

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function JourneyTab() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();
  const mapRef = useRef<RNMapView | null>(null);

  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [journeyStatus, setJourneyStatus] = useState<JourneyStatus>("idle");
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [journeyStartedAt, setJourneyStartedAt] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [historicalJourneys, setHistoricalJourneys] = useState<HistoricalJourney[]>([]);
  const [exploredCells, setExploredCells] = useState<ExploredCell[]>([]);
  const [unexploredCells, setUnexploredCells] = useState<ExploredCell[]>([]);
  const [newTerritoryNearby, setNewTerritoryNearby] = useState(false);
  const [elapsedDisplay, setElapsedDisplay] = useState("0:00");
  const [pingLoading, setPingLoading] = useState(false);
  const [pingSheetVisible, setPingSheetVisible] = useState(false);
  const [pingPlaces, setPingPlaces] = useState<PingPlace[]>([]);
  const [pingNewCount, setPingNewCount] = useState(0);

  // Gamification
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [questPanelExpanded, setQuestPanelExpanded] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationData, setCelebrationData] = useState<GamificationResult | null>(null);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const questRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const waypointBufferRef = useRef<Waypoint[]>([]);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushInFlightRef = useRef<Promise<void> | null>(null);
  const lastCellCheckDistRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasAutocenteredRef = useRef(false);
  const bypassQualityGateRef = useRef(false);
  const journeyIdRef = useRef<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!token || IS_WEB) return;
    try {
      const data = (await apiFetch("/api/journeys/history", {
        headers: { Authorization: `Bearer ${token}` },
      })) as { journeys: HistoricalJourney[] };
      setHistoricalJourneys(data.journeys);
    } catch (err) {
      console.warn("[JourneyMap] loadHistory failed", err);
    }
  }, [token]);

  const loadQuests = useCallback(async () => {
    if (!token || IS_WEB) return;
    try {
      const data = (await apiFetch("/api/quests", {
        headers: { Authorization: `Bearer ${token}` },
      })) as { active: QuestItem[]; completed: QuestItem[] };
      setQuests(data.active.slice(0, 3));
    } catch (err) {
      console.warn("[JourneyMap] loadQuests failed", err);
    }
  }, [token]);

  const loadExploredCells = useCallback(
    async (lat: number, lng: number) => {
      if (!token || IS_WEB) return;
      try {
        const data = (await apiFetch(
          `/api/journeys/explored-cells?lat=${lat}&lng=${lng}&radius=0.01`,
          { headers: { Authorization: `Bearer ${token}` } }
        )) as { explored: ExploredCell[]; unexplored: ExploredCell[] };
        setExploredCells(data.explored);
        setUnexploredCells(data.unexplored);
        setNewTerritoryNearby(data.unexplored.length > 0);
      } catch (err) {
        console.warn("[JourneyMap] loadExploredCells failed", err);
      }
    },
    [token]
  );

  useEffect(() => {
    if (IS_WEB || !token) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setLocationPermission(granted ? "granted" : "denied");

      if (granted) {
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        if (last) {
          const loc = { lat: last.coords.latitude, lng: last.coords.longitude };
          setCurrentLocation(loc);
          await loadHistory();
          await loadExploredCells(loc.lat, loc.lng);
        } else {
          await loadHistory();
        }
      } else {
        await loadHistory();
      }
      loadQuests();
    })();
  }, [token, loadHistory, loadExploredCells, loadQuests]);

  useEffect(() => {
    if (!currentLocation || hasAutocenteredRef.current || IS_WEB) return;
    hasAutocenteredRef.current = true;
    mapRef.current?.animateToRegion(
      {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  }, [currentLocation]);

  useEffect(() => {
    return () => {
      locationSubscriptionRef.current?.remove();
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (questRefreshRef.current) clearInterval(questRefreshRef.current);
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)
        .then((running) => { if (running) Location.stopLocationUpdatesAsync(LOCATION_TASK); })
        .catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (IS_WEB) return;
    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (nextState === "active") {
        const jId = journeyIdRef.current;
        if (!jId) return;
        try {
          const raw = await AsyncStorage.getItem(WAYPOINT_BUFFER_KEY);
          if (raw) {
            const bgWaypoints = JSON.parse(raw) as { lat: number; lng: number; recordedAt: string }[];
            if (bgWaypoints.length > 0) {
              await AsyncStorage.removeItem(WAYPOINT_BUFFER_KEY);
              setWaypoints((prev) => [...prev, ...bgWaypoints]);
              waypointBufferRef.current.push(...bgWaypoints);
              flushWaypoints(jId);
            }
          }
        } catch (err) {
          console.warn("[JourneyMap] AppState flush failed:", err);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  async function handleLocateMe() {
    if (IS_WEB) return;
    let loc = currentLocation;
    if (!loc) {
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last) {
        loc = { lat: last.coords.latitude, lng: last.coords.longitude };
      } else {
        const fresh = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        loc = { lat: fresh.coords.latitude, lng: fresh.coords.longitude };
      }
      setCurrentLocation(loc);
    }
    mapRef.current?.animateToRegion(
      {
        latitude: loc.lat,
        longitude: loc.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  }

  async function flushWaypoints(jId: string) {
    if (flushInFlightRef.current) return;
    const buffer = waypointBufferRef.current.splice(0);
    if (!buffer.length || !token) return;
    let promise!: Promise<void>;
    promise = (async () => {
      try {
        await apiFetch(`/api/journeys/${jId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ waypoints: buffer }),
        });
      } catch (err) {
        waypointBufferRef.current.unshift(...buffer);
      } finally {
        if (flushInFlightRef.current === promise) flushInFlightRef.current = null;
      }
    })();
    flushInFlightRef.current = promise;
    await promise;
  }

  const locationWatchOptions: Location.LocationOptions = {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 10,
    timeInterval: 2000,
  };

  function onLocationUpdate(position: Location.LocationObject) {
    const loc = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    const heading = position.coords.heading;
    const wp: Waypoint = {
      ...loc,
      recordedAt: new Date(position.timestamp).toISOString(),
    };
    setCurrentLocation(loc);
    setCurrentHeading(heading !== null && heading >= 0 ? heading : null);
    setWaypoints((prev) => [...prev, wp]);
    waypointBufferRef.current.push(wp);
    if (
      !lastCellCheckDistRef.current ||
      haversineM(loc.lat, loc.lng, lastCellCheckDistRef.current.lat, lastCellCheckDistRef.current.lng) > 50
    ) {
      lastCellCheckDistRef.current = loc;
      loadExploredCells(loc.lat, loc.lng);
    }
  }

  async function attachLocationWatcher() {
    const subscription = await Location.watchPositionAsync(locationWatchOptions, onLocationUpdate);
    locationSubscriptionRef.current = subscription;
  }

  async function startJourney() {
    if (IS_WEB || !token) return;

    if (locationPermission !== "granted") {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location access is needed for journey tracking.");
        return;
      }
      setLocationPermission("granted");
    }

    let data: { id: string; startedAt: string };
    try {
      data = (await apiFetch("/api/journeys", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })) as { id: string; startedAt: string };
    } catch (err) {
      Alert.alert("Error", "Could not start journey. Please try again.");
      return;
    }

    const jId = data.id;
    journeyIdRef.current = jId;
    setJourneyId(jId);
    setJourneyStartedAt(data.startedAt);
    setElapsedDisplay("0:00");
    setWaypoints([]);
    waypointBufferRef.current = [];
    setJourneyStatus("active");

    await AsyncStorage.removeItem(WAYPOINT_BUFFER_KEY).catch(() => {});
    await attachLocationWatcher();

    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === "granted") {
        const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
        if (!isRunning) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK, {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 2000,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "Journey in progress",
              notificationBody: "Hero's Path is tracking your route",
            },
          });
        }
      }
    } catch (err) {
      console.warn("[JourneyMap] Background location setup failed:", err);
    }

    flushIntervalRef.current = setInterval(() => flushWaypoints(jId), 10000);
    timerIntervalRef.current = setInterval(() => {
      setElapsedDisplay(formatDuration(data.startedAt));
    }, 1000);
    questRefreshRef.current = setInterval(() => loadQuests(), 30000);
    loadQuests();
  }

  async function discardJourney(jId: string) {
    if (!token) return;
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    if (flushIntervalRef.current) { clearInterval(flushIntervalRef.current); flushIntervalRef.current = null; }
    if (questRefreshRef.current) { clearInterval(questRefreshRef.current); questRefreshRef.current = null; }
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
      if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    } catch {}
    await AsyncStorage.removeItem(WAYPOINT_BUFFER_KEY).catch(() => {});
    try {
      await apiFetch(`/api/journeys/${jId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.warn("[JourneyMap] discard DELETE failed:", err);
    }
    journeyIdRef.current = null;
    setJourneyId(null);
    setJourneyStartedAt(null);
    setCurrentHeading(null);
    setWaypoints([]);
    waypointBufferRef.current = [];
    setJourneyStatus("idle");
  }

  async function endJourney() {
    if (!journeyId || !token || journeyStatus !== "active") return;
    const jId = journeyId;
    const startedAtSnapshot = journeyStartedAt;

    if (!bypassQualityGateRef.current) {
      const currentWaypoints = waypoints;
      const totalDist =
        currentWaypoints.length >= 2
          ? currentWaypoints.reduce((acc, wp, i) => {
              if (i === 0) return 0;
              const prev = currentWaypoints[i - 1];
              return acc + haversineM(prev.lat, prev.lng, wp.lat, wp.lng);
            }, 0)
          : 0;
      const durationMs = startedAtSnapshot
        ? Date.now() - new Date(startedAtSnapshot).getTime()
        : 0;
      const durationSec = Math.round(durationMs / 1000);
      if (durationMs < 60000 || totalDist < 50) {
        Alert.alert(
          "Short journey detected",
          `You've only walked ${Math.round(totalDist)}m in ${durationSec}s. Save it anyway, or discard it?`,
          [
            {
              text: "Save",
              onPress: () => {
                bypassQualityGateRef.current = true;
                void endJourney();
              },
            },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => { void discardJourney(jId); },
            },
          ]
        );
        return;
      }
    }
    bypassQualityGateRef.current = false;

    setJourneyStatus("ending");

    // Stop all tracking sources first — no new waypoints or interval flushes can start
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }

    // Await any in-flight flush so its waypoints land (or return to buffer) before we end
    await flushInFlightRef.current;

    // Definitive drain — no new waypoints can arrive after watcher is stopped
    const remainingWaypoints = waypointBufferRef.current.splice(0);

    if (questRefreshRef.current) {
      clearInterval(questRefreshRef.current);
      questRefreshRef.current = null;
    }

    // Stop background location tracking
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
      if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    } catch {}
    await AsyncStorage.removeItem(WAYPOINT_BUFFER_KEY).catch(() => {});

    try {
      const result = (await apiFetch(`/api/journeys/${jId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: "ended",
          waypoints: remainingWaypoints,
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      })) as {
        totalDistanceM: number;
        placeCount: number;
        xpGained?: number;
        newLevel?: number;
        newBadges?: BadgeItem[];
        completedQuests?: Array<{ key: string; title: string; xpReward: number }>;
        newStreak?: number;
      };

      journeyIdRef.current = null;
      setJourneyId(null);
      setJourneyStartedAt(null);
      setCurrentHeading(null);
      setWaypoints([]);
      setJourneyStatus("idle");
      loadHistory();
      loadQuests();
      if (currentLocation) loadExploredCells(currentLocation.lat, currentLocation.lng);

      if ((result.xpGained ?? 0) > 0) {
        const gamResult: GamificationResult = {
          xpGained: result.xpGained ?? 0,
          newLevel: result.newLevel ?? 1,
          newBadges: result.newBadges ?? [],
          completedQuests: result.completedQuests ?? [],
          newStreak: result.newStreak ?? 0,
        };
        setCelebrationData(gamResult);
        setCelebrationVisible(true);
        celebrationOpacity.setValue(0);
        Animated.sequence([
          Animated.timing(celebrationOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(3000),
          Animated.timing(celebrationOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setCelebrationVisible(false));
      }
    } catch (err) {
      console.warn("[JourneyMap] endJourney PATCH failed", err);
      // Restore buffer and restart full tracking so user can retry
      waypointBufferRef.current.unshift(...remainingWaypoints);
      await attachLocationWatcher().catch(() => {});
      flushIntervalRef.current = setInterval(() => flushWaypoints(jId), 10000);
      questRefreshRef.current = setInterval(() => loadQuests(), 30000);
      if (startedAtSnapshot) {
        timerIntervalRef.current = setInterval(() => {
          setElapsedDisplay(formatDuration(startedAtSnapshot));
        }, 1000);
      }
      setJourneyStatus("active");
      Alert.alert(
        "Save failed",
        "Could not end your journey. Tracking has resumed — try ending again."
      );
    }
  }

  async function handlePing() {
    if (!journeyId || !token || !currentLocation || pingLoading) return;
    setPingLoading(true);
    try {
      const result = (await apiFetch(`/api/journeys/${journeyId}/ping`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        }),
      })) as { places: PingPlace[]; newCount: number };
      setPingPlaces(result.places ?? []);
      setPingNewCount(result.newCount ?? 0);
      setPingSheetVisible(true);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 503) {
        Alert.alert(
          "Places unavailable",
          "The places service is temporarily unavailable. Please try again shortly.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Ping failed",
          "Something went wrong. Check your connection and try again.",
          [{ text: "Retry", onPress: handlePing }, { text: "Cancel", style: "cancel" }]
        );
      }
    } finally {
      setPingLoading(false);
    }
  }

  if (IS_WEB) {
    return (
      <View style={styles.webFallback}>
        <Feather name="map" size={48} color={Colors.gold} />
        <Text style={styles.webTitle}>Journey Map</Text>
        <Text style={styles.webSub}>Open on your mobile device to explore.</Text>
      </View>
    );
  }

  const activePolyline = useMemo(() => {
    const raw = waypoints.map((wp) => ({
      latitude: wp.lat,
      longitude: wp.lng,
    }));
    return raw.length >= 3 ? rdpSimplify(raw, 0.00005) : raw;
  }, [waypoints]);

  return (
    <View style={styles.container}>
      {MapView && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === "android" && PROVIDER_GOOGLE ? PROVIDER_GOOGLE : undefined}
          customMapStyle={Colors.mapDark}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          initialRegion={
            currentLocation
              ? {
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : {
                  latitude: 51.505,
                  longitude: -0.09,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
          }
        >
          {historicalJourneys.map((j, idx) => {
            const color = HISTORY_COLORS[Math.min(idx, HISTORY_COLORS.length - 1)];
            return Polyline ? (
              <Polyline
                key={j.id}
                coordinates={j.waypoints.map((wp) => ({
                  latitude: wp.lat,
                  longitude: wp.lng,
                }))}
                strokeColor={color}
                strokeWidth={3}
              />
            ) : null;
          })}

          {journeyStatus === "active" && activePolyline.length >= 2 && Polyline && (
            <Polyline
              coordinates={activePolyline}
              strokeColor={Colors.gold}
              strokeWidth={5}
            />
          )}

          {currentLocation && Marker && (
            <Marker
              coordinate={{
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
              }}
              anchor={{ x: 0.5, y: 1.0 }}
              tracksViewChanges={true}
              flat={false}
            >
              <CharacterMarker
                journeyActive={journeyStatus === "active"}
                heading={currentHeading}
              />
            </Marker>
          )}
        </MapView>
      )}

      <LinearGradient
        colors={["rgba(13,10,11,0.92)", "rgba(13,10,11,0.4)", "transparent"]}
        style={[styles.topGradient, { paddingTop: insets.top + 8 }]}
        pointerEvents="none"
      >
        <Text style={styles.screenTitle}>Journey</Text>
        {journeyStatus === "active" && journeyStartedAt && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="clock" size={12} color={Colors.gold} />
              <Text style={styles.statText}>{elapsedDisplay}</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="navigation" size={12} color={Colors.gold} />
              <Text style={styles.statText}>
                {formatDistance(
                  waypoints.length >= 2
                    ? waypoints.reduce((acc, wp, i) => {
                        if (i === 0) return 0;
                        const prev = waypoints[i - 1];
                        return acc + haversineM(prev.lat, prev.lng, wp.lat, wp.lng);
                      }, 0)
                    : 0
                )}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <View
        style={[
          styles.topRightButtons,
          { top: insets.top + 12 },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={styles.iconBtn} onPress={handleLocateMe}>
          <Feather name="crosshair" size={20} color={Colors.parchment} />
        </TouchableOpacity>
        {journeyStatus === "idle" && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/settings/preferences")}
          >
            <Feather name="sliders" size={20} color={Colors.parchment} />
          </TouchableOpacity>
        )}
      </View>

      {locationPermission === "denied" && journeyStatus === "idle" && (
        <View style={[styles.permissionBanner, { top: insets.top + 52 }]}>
          <Feather name="alert-circle" size={14} color={Colors.error} />
          <Text style={styles.permissionBannerText}>
            Location access denied. Enable it in Settings to start a journey.
          </Text>
          <TouchableOpacity onPress={() => Linking.openSettings()}>
            <Text style={styles.permissionBannerLink}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {journeyStatus === "active" && newTerritoryNearby && (
        <View style={[styles.nudgeBanner, { top: insets.top + 64 }]}>
          <Feather name="zap" size={14} color={Colors.info} />
          <Text style={styles.nudgeText}>New territory ahead!</Text>
        </View>
      )}

      {journeyStatus === "active" && quests.length > 0 && (
        <View style={[styles.questPanel, { top: insets.top + 56 }]}>
          <TouchableOpacity
            style={styles.questPanelHeader}
            onPress={() => setQuestPanelExpanded((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.questPanelTitle}>⚔️ Active Quests</Text>
            <Feather
              name={questPanelExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={Colors.parchmentMuted}
            />
          </TouchableOpacity>
          {questPanelExpanded && (
            <View style={styles.questList}>
              {quests.map((q) => (
                <QuestProgressBar
                  key={q.key}
                  title={q.title}
                  progress={q.progress}
                  target={q.target}
                  xpReward={q.xpReward}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <LinearGradient
        colors={["transparent", "rgba(13,10,11,0.5)", "rgba(13,10,11,0.95)"]}
        style={[
          styles.bottomGradient,
          { paddingBottom: insets.bottom + 80 },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.bottomControls} pointerEvents="box-none">
          {journeyStatus === "idle" && (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                locationPermission === "denied" && styles.primaryBtnDisabled,
              ]}
              onPress={locationPermission === "denied" ? () => Linking.openSettings() : startJourney}
            >
              <Feather
                name={locationPermission === "denied" ? "lock" : "play"}
                size={18}
                color={Colors.background}
              />
              <Text style={styles.primaryBtnText}>
                {locationPermission === "denied" ? "Enable location to start" : "Begin Journey"}
              </Text>
            </TouchableOpacity>
          )}

          {journeyStatus === "active" && (
            <View style={styles.activeButtons}>
              <TouchableOpacity
                style={[styles.pingBtn, pingLoading && { opacity: 0.6 }]}
                onPress={handlePing}
                disabled={pingLoading}
              >
                {pingLoading ? (
                  <ActivityIndicator size="small" color={Colors.gold} />
                ) : (
                  <Feather name="zap" size={16} color={Colors.gold} />
                )}
                <Text style={styles.pingBtnText}>Ping</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.endBtn}
                onPress={endJourney}
              >
                <Feather name="square" size={16} color={Colors.error} />
                <Text style={styles.endBtnText}>End Journey</Text>
              </TouchableOpacity>
            </View>
          )}

          {journeyStatus === "ending" && (
            <View style={styles.endingRow}>
              <ActivityIndicator color={Colors.gold} />
              <Text style={styles.endingText}>Saving journey…</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <PingResultsSheet
        visible={pingSheetVisible}
        places={pingPlaces}
        newCount={pingNewCount}
        onClose={() => setPingSheetVisible(false)}
      />

      {celebrationVisible && celebrationData && (
        <Animated.View
          style={[styles.celebrationOverlay, { opacity: celebrationOpacity }]}
          pointerEvents="none"
        >
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>⚔️</Text>
            <Text style={styles.celebrationTitle}>Journey Complete!</Text>
            <Text style={styles.celebrationXp}>+{celebrationData.xpGained} XP Earned</Text>
            {celebrationData.newBadges.length > 0 && (
              <View style={styles.chipRow}>
                {celebrationData.newBadges.map((b) => (
                  <View key={b.key} style={styles.badgeChip}>
                    <Text style={styles.chipText}>{b.icon} {b.name}</Text>
                  </View>
                ))}
              </View>
            )}
            {celebrationData.completedQuests.length > 0 && (
              <View style={styles.chipRow}>
                {celebrationData.completedQuests.map((q) => (
                  <View key={q.key} style={styles.questChip}>
                    <Text style={styles.chipText}>✅ {q.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webFallback: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  webTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.gold,
  },
  webSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.parchmentMuted,
    textAlign: "center",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    zIndex: 10,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.gold,
  },
  topRightButtons: {
    position: "absolute",
    right: 12,
    zIndex: 20,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(13,10,11,0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  permissionBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "rgba(13,10,11,0.90)",
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 20,
    flexWrap: "wrap",
  },
  permissionBannerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    flex: 1,
  },
  permissionBannerLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.error,
  },
  primaryBtnDisabled: {
    backgroundColor: "rgba(212,160,23,0.45)",
  },
  nudgeBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "rgba(13,10,11,0.85)",
    borderWidth: 1,
    borderColor: Colors.info,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 15,
  },
  nudgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.info,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    zIndex: 10,
  },
  bottomControls: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 36,
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.background,
  },
  activeButtons: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  pingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "rgba(212,160,23,0.12)",
  },
  pingBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.gold,
  },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  endBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.error,
  },
  endingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  endingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
  },
  questPanel: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: "rgba(13,10,11,0.88)",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    zIndex: 15,
    overflow: "hidden",
  },
  questPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  questPanelTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.parchment,
  },
  questList: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 100,
  },
  celebrationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    padding: 28,
    alignItems: "center",
    maxWidth: 320,
    gap: 8,
  },
  celebrationEmoji: {
    fontSize: 52,
  },
  celebrationTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.parchment,
    marginTop: 4,
  },
  celebrationXp: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.gold,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 4,
  },
  badgeChip: {
    backgroundColor: "rgba(212,160,23,0.18)",
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  questChip: {
    backgroundColor: "rgba(76,175,80,0.18)",
    borderWidth: 1,
    borderColor: "#4CAF50",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.parchment,
  },
});

import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import Colors from "../../constants/colors";

const IS_WEB = Platform.OS === "web";

let MapView: React.ComponentType<any> | null = null;
let Marker: React.ComponentType<any> | null = null;
let Polyline: React.ComponentType<any> | null = null;
let Circle: React.ComponentType<any> | null = null;
let PROVIDER_GOOGLE: string | null = null;

if (!IS_WEB) {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  Circle = Maps.Circle;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

import { CharacterMarker } from "../../components/CharacterMarker";

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

const HISTORY_COLORS = [
  "rgba(212,160,23,0.45)",
  "rgba(212,160,23,0.30)",
  "rgba(212,160,23,0.18)",
];

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
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
  const mapRef = useRef<any>(null);

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

  const waypointBufferRef = useRef<Waypoint[]>([]);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCellCheckDistRef = useRef<{ lat: number; lng: number } | null>(null);

  const loadHistory = useCallback(async () => {
    if (!token || IS_WEB) return;
    try {
      const data = (await apiFetch("/api/journeys/history", {
        headers: { Authorization: `Bearer ${token}` },
      })) as { journeys: HistoricalJourney[] };
      setHistoricalJourneys(data.journeys);
    } catch {}
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
      } catch {}
    },
    [token]
  );

  useEffect(() => {
    if (IS_WEB) return;
    (async () => {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        const loc = { lat: last.coords.latitude, lng: last.coords.longitude };
        setCurrentLocation(loc);
        await loadHistory();
        await loadExploredCells(loc.lat, loc.lng);
      } else {
        await loadHistory();
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      locationSubscriptionRef.current?.remove();
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  async function handleLocateMe() {
    if (IS_WEB) return;
    let loc = currentLocation;
    if (!loc) {
      const last = await Location.getLastKnownPositionAsync();
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
    const buffer = waypointBufferRef.current.splice(0);
    if (!buffer.length || !token) return;
    try {
      await apiFetch(`/api/journeys/${jId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ waypoints: buffer }),
      });
    } catch (err) {
      waypointBufferRef.current.unshift(...buffer);
    }
  }

  async function startJourney() {
    if (IS_WEB || !token) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Location access is needed for journey tracking.");
      return;
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
    setJourneyId(jId);
    setJourneyStartedAt(data.startedAt);
    setWaypoints([]);
    waypointBufferRef.current = [];
    setJourneyStatus("active");

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 2000,
      },
      (position) => {
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
          Math.abs(loc.lat - lastCellCheckDistRef.current.lat) > 0.0005 ||
          Math.abs(loc.lng - lastCellCheckDistRef.current.lng) > 0.0005
        ) {
          lastCellCheckDistRef.current = loc;
          loadExploredCells(loc.lat, loc.lng);
        }
      }
    );
    locationSubscriptionRef.current = subscription;

    flushIntervalRef.current = setInterval(() => flushWaypoints(jId), 10000);

    timerIntervalRef.current = setInterval(() => {
      setElapsedDisplay(formatDuration(data.startedAt));
    }, 1000);
  }

  async function endJourney() {
    if (!journeyId || !token || journeyStatus !== "active") return;
    setJourneyStatus("ending");

    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    await flushWaypoints(journeyId);

    try {
      const result = (await apiFetch(`/api/journeys/${journeyId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "ended" }),
      })) as { totalDistanceM: number; placeCount: number };

      const dist = formatDistance(result.totalDistanceM ?? 0);
      const elapsed = journeyStartedAt ? formatDuration(journeyStartedAt) : "—";
      Alert.alert("Journey Complete!", `Distance: ${dist}\nTime: ${elapsed}`);
    } catch {
      Alert.alert("Journey ended", "Could not retrieve journey summary.");
    }

    setJourneyId(null);
    setJourneyStartedAt(null);
    setCurrentHeading(null);
    setWaypoints([]);
    setJourneyStatus("idle");
    loadHistory();
    if (currentLocation) loadExploredCells(currentLocation.lat, currentLocation.lng);
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

  const activePolyline = waypoints.map((wp) => ({
    latitude: wp.lat,
    longitude: wp.lng,
  }));

  return (
    <View style={styles.container}>
      {MapView && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
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
          {exploredCells.map((cell) => (
            Circle && (
              <Circle
                key={`exp-${cell.lat}-${cell.lng}`}
                center={{ latitude: cell.lat, longitude: cell.lng }}
                radius={26}
                fillColor="rgba(212,160,23,0.12)"
                strokeColor="transparent"
              />
            )
          ))}

          {unexploredCells.map((cell) => (
            Circle && (
              <Circle
                key={`unexp-${cell.lat}-${cell.lng}`}
                center={{ latitude: cell.lat, longitude: cell.lng }}
                radius={30}
                fillColor="rgba(41,182,246,0.12)"
                strokeColor="transparent"
              />
            )
          ))}

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
              tracksViewChanges={journeyStatus === "active"}
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
                        const dlat = (wp.lat - prev.lat) * 111000;
                        const dlng =
                          (wp.lng - prev.lng) * 111000 * Math.cos((wp.lat * Math.PI) / 180);
                        return acc + Math.sqrt(dlat ** 2 + dlng ** 2);
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
            onPress={() => router.push("/settings/preferences" as any)}
          >
            <Feather name="sliders" size={20} color={Colors.parchment} />
          </TouchableOpacity>
        )}
      </View>

      {journeyStatus === "active" && newTerritoryNearby && (
        <View style={[styles.nudgeBanner, { top: insets.top + 64 }]}>
          <Feather name="zap" size={14} color={Colors.info} />
          <Text style={styles.nudgeText}>New territory ahead!</Text>
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
            <TouchableOpacity style={styles.primaryBtn} onPress={startJourney}>
              <Feather name="play" size={18} color={Colors.background} />
              <Text style={styles.primaryBtnText}>Begin Journey</Text>
            </TouchableOpacity>
          )}

          {journeyStatus === "active" && (
            <View style={styles.activeButtons}>
              <TouchableOpacity
                style={styles.pingBtn}
                onPress={() => Alert.alert("Ping", "Place discovery ping — coming in A4!")}
              >
                <Feather name="zap" size={16} color={Colors.gold} />
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
});

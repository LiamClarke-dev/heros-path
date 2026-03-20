import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const DEV_ROUTES = [
  {
    id: "sf_mission",
    name: "SF Mission District",
    description: "Valencia St loop through the heart of the Mission",
    waypoints: [
      { lat: 37.7631, lng: -122.4194 },
      { lat: 37.7635, lng: -122.4193 },
      { lat: 37.7640, lng: -122.4193 },
      { lat: 37.7645, lng: -122.4192 },
      { lat: 37.7650, lng: -122.4191 },
      { lat: 37.7655, lng: -122.4191 },
      { lat: 37.7660, lng: -122.419 },
      { lat: 37.7665, lng: -122.419 },
      { lat: 37.7670, lng: -122.4189 },
      { lat: 37.7675, lng: -122.4189 },
      { lat: 37.7680, lng: -122.4188 },
      { lat: 37.7680, lng: -122.4175 },
      { lat: 37.7675, lng: -122.4175 },
      { lat: 37.7670, lng: -122.4174 },
      { lat: 37.7665, lng: -122.4174 },
      { lat: 37.7660, lng: -122.4173 },
      { lat: 37.7655, lng: -122.4173 },
      { lat: 37.7650, lng: -122.4172 },
      { lat: 37.7645, lng: -122.4172 },
      { lat: 37.7640, lng: -122.4171 },
      { lat: 37.7635, lng: -122.4171 },
      { lat: 37.7631, lng: -122.4194 },
    ],
  },
  {
    id: "brooklyn_williamsburg",
    name: "Brooklyn Williamsburg",
    description: "Bedford Ave to the waterfront and back",
    waypoints: [
      { lat: 40.7143, lng: -73.9614 },
      { lat: 40.7148, lng: -73.9614 },
      { lat: 40.7153, lng: -73.9613 },
      { lat: 40.7158, lng: -73.9612 },
      { lat: 40.7163, lng: -73.9611 },
      { lat: 40.7168, lng: -73.9610 },
      { lat: 40.7173, lng: -73.9609 },
      { lat: 40.7178, lng: -73.9608 },
      { lat: 40.7183, lng: -73.9607 },
      { lat: 40.7188, lng: -73.9607 },
      { lat: 40.7188, lng: -73.9620 },
      { lat: 40.7188, lng: -73.9630 },
      { lat: 40.7183, lng: -73.9635 },
      { lat: 40.7178, lng: -73.9638 },
      { lat: 40.7173, lng: -73.9640 },
      { lat: 40.7168, lng: -73.9641 },
      { lat: 40.7163, lng: -73.9641 },
      { lat: 40.7158, lng: -73.9640 },
      { lat: 40.7153, lng: -73.9638 },
      { lat: 40.7148, lng: -73.9630 },
      { lat: 40.7143, lng: -73.9625 },
      { lat: 40.7143, lng: -73.9614 },
    ],
  },
  {
    id: "chicago_river_north",
    name: "Chicago River North",
    description: "State St → Michigan Ave → Riverwalk → Navy Pier area",
    waypoints: [
      { lat: 41.8895, lng: -87.6280 },
      { lat: 41.8898, lng: -87.6270 },
      { lat: 41.8901, lng: -87.6260 },
      { lat: 41.8904, lng: -87.6250 },
      { lat: 41.8907, lng: -87.6240 },
      { lat: 41.8910, lng: -87.6230 },
      { lat: 41.8913, lng: -87.6220 },
      { lat: 41.8916, lng: -87.6210 },
      { lat: 41.8916, lng: -87.6200 },
      { lat: 41.8913, lng: -87.6195 },
      { lat: 41.8910, lng: -87.6190 },
      { lat: 41.8907, lng: -87.6185 },
      { lat: 41.8904, lng: -87.6190 },
      { lat: 41.8901, lng: -87.6195 },
      { lat: 41.8898, lng: -87.6200 },
      { lat: 41.8895, lng: -87.6210 },
      { lat: 41.8892, lng: -87.6220 },
      { lat: 41.8889, lng: -87.6230 },
      { lat: 41.8889, lng: -87.6240 },
      { lat: 41.8892, lng: -87.6250 },
      { lat: 41.8892, lng: -87.6260 },
      { lat: 41.8892, lng: -87.6270 },
      { lat: 41.8895, lng: -87.6275 },
      { lat: 41.8895, lng: -87.6280 },
    ],
  },
];

const SPEED_OPTIONS = [
  { label: "1×", value: 1, delayMs: 600 },
  { label: "2×", value: 2, delayMs: 300 },
  { label: "10×", value: 10, delayMs: 60 },
];

type SimState = "idle" | "running" | "done";

export default function SimulateScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [simState, setSimState] = useState<SimState>("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [speedIdx, setSpeedIdx] = useState(0);
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const abortRef = useRef(false);

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const speed = SPEED_OPTIONS[speedIdx];

  async function manualPing() {
    if (!activeJourneyId || !activeLocation || isPinging) return;
    setIsPinging(true);
    setCurrentStep("Manual ping sent...");
    try {
      const res = await fetch(`${apiBase}/journeys/${activeJourneyId}/ping`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ lat: activeLocation.lat, lng: activeLocation.lng }),
      });
      if (res.ok) {
        const data = await res.json() as { places: unknown[] };
        setDiscoveredCount((c) => c + data.places.length);
        setCurrentStep(`Ping found ${data.places.length} place(s)`);
      }
    } catch {
      setCurrentStep("Ping failed");
    } finally {
      setIsPinging(false);
    }
  }

  async function runSimulation(route: (typeof DEV_ROUTES)[0]) {
    abortRef.current = false;
    setSimState("running");
    setProgress(0);
    setDiscoveredCount(0);
    setCurrentStep("Starting journey...");

    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    try {
      const startRes = await fetch(`${apiBase}/journeys`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ isDevSimulated: true }),
      });

      if (!startRes.ok) throw new Error("Failed to start journey");
      const journey = await startRes.json() as { id: string };
      setActiveJourneyId(journey.id);

      const total = route.waypoints.length;

      for (let i = 0; i < total; i++) {
        if (abortRef.current) break;

        const wp = route.waypoints[i];
        setActiveLocation(wp);
        setCurrentStep(`Walking waypoint ${i + 1} of ${total}...`);
        setProgress(Math.round(((i + 1) / total) * 80));

        await fetch(`${apiBase}/journeys/${journey.id}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({
            waypoints: [{ ...wp, recordedAt: new Date().toISOString() }],
          }),
        }).catch(() => {});

        // Auto-ping at 33% and 66% of the route
        if (i === Math.floor(total * 0.33) || i === Math.floor(total * 0.66)) {
          setCurrentStep("Auto-pinging for nearby places...");
          const pingRes = await fetch(`${apiBase}/journeys/${journey.id}/ping`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({ lat: wp.lat, lng: wp.lng }),
          }).catch(() => null);

          if (pingRes?.ok) {
            const data = await pingRes.json() as { places: unknown[] };
            setDiscoveredCount((c) => c + data.places.length);
          }
        }

        await delay(speed.delayMs);
      }

      if (!abortRef.current) {
        setCurrentStep("Saving journey...");
        setProgress(90);

        await fetch(`${apiBase}/journeys/${journey.id}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ status: "ended" }),
        });

        setProgress(100);
        setCurrentStep("Journey saved!");
        setSimState("done");

        await delay(600);
        Alert.alert(
          "Simulation Complete",
          `"${route.name}" finished.\n${discoveredCount} places discovered.`,
          [{ text: "View Profile", onPress: () => router.push("/(tabs)/profile") }],
        );
      }
    } catch (err) {
      Alert.alert("Simulation Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setActiveJourneyId(null);
      setActiveLocation(null);
      setSimState("idle");
      setProgress(0);
      setCurrentStep("");
    }
  }

  function abort() {
    abortRef.current = true;
    setCurrentStep("Stopping...");
  }

  const isRunning = simState === "running";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <View style={styles.header}>
        <Feather name="play-circle" size={22} color={Colors.info} />
        <Text style={styles.title}>Journey Simulator</Text>
      </View>
      <Text style={styles.subtitle}>
        Simulate GPS walks to test tracking, place discovery, XP, and quests — no phone required.
      </Text>

      <View style={styles.controlsCard}>
        <Text style={styles.controlLabel}>Simulation Speed</Text>
        <View style={styles.speedRow}>
          {SPEED_OPTIONS.map((opt, idx) => (
            <Pressable
              key={opt.label}
              style={[styles.speedBtn, speedIdx === idx && styles.speedBtnActive, isRunning && styles.speedBtnDisabled]}
              onPress={() => !isRunning && setSpeedIdx(idx)}
            >
              <Text style={[styles.speedBtnText, speedIdx === idx && styles.speedBtnTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isRunning && (
        <View style={styles.runningCard}>
          <View style={styles.runningHeader}>
            <ActivityIndicator color={Colors.gold} size="small" />
            <Text style={styles.runningStep}>{currentStep}</Text>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressPct}>{progress}% — {discoveredCount} places found</Text>

          <View style={styles.runningActions}>
            <Pressable
              style={[styles.pingBtn, isPinging && styles.pingBtnDisabled]}
              onPress={manualPing}
              disabled={isPinging}
            >
              {isPinging
                ? <ActivityIndicator size="small" color={Colors.background} />
                : <><Feather name="radio" size={14} color={Colors.background} /><Text style={styles.pingBtnText}>Trigger Ping</Text></>
              }
            </Pressable>
            <Pressable style={styles.abortBtn} onPress={abort}>
              <Feather name="square" size={14} color={Colors.error} />
              <Text style={styles.abortBtnText}>Stop</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.routeList}>
        {DEV_ROUTES.map((route) => (
          <View key={route.id} style={styles.routeCard}>
            <View style={styles.routeInfo}>
              <Text style={styles.routeName}>{route.name}</Text>
              <Text style={styles.routeDesc}>{route.description}</Text>
              <Text style={styles.routeMeta}>
                {route.waypoints.length} waypoints · 2 auto-pings · {speed.label} speed
              </Text>
            </View>
            <Pressable
              style={[styles.runButton, isRunning && styles.runButtonDisabled]}
              onPress={() => !isRunning && runSimulation(route)}
              disabled={isRunning}
            >
              <Feather name="play" size={13} color={Colors.background} />
              <Text style={styles.runButtonText}>Run</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  controlsCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  controlLabel: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  speedRow: {
    flexDirection: "row",
    gap: 8,
  },
  speedBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  speedBtnActive: {
    backgroundColor: Colors.goldDark,
    borderColor: Colors.gold,
  },
  speedBtnDisabled: { opacity: 0.5 },
  speedBtnText: {
    fontSize: 14,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_600SemiBold",
  },
  speedBtnTextActive: { color: Colors.gold },
  runningCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.goldDark,
    padding: 14,
    gap: 10,
  },
  runningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  runningStep: {
    fontSize: 13,
    color: Colors.parchment,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.card,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 11,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  runningActions: {
    flexDirection: "row",
    gap: 8,
  },
  pingBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.info,
    paddingVertical: 9,
    borderRadius: 8,
  },
  pingBtnDisabled: { opacity: 0.5 },
  pingBtnText: {
    color: Colors.background,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  abortBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  abortBtnText: {
    color: Colors.error,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  routeList: { gap: 10 },
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  routeInfo: { flex: 1, gap: 3 },
  routeName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  routeDesc: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  routeMeta: {
    fontSize: 11,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  runButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.info,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  runButtonDisabled: { opacity: 0.4 },
  runButtonText: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});

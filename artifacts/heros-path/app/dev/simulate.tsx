import React, { useState } from "react";
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
    id: "sf_downtown",
    name: "SF Downtown Loop",
    description: "Market St → Union Square → Financial District",
    waypoints: [
      { lat: 37.7849, lng: -122.408 },
      { lat: 37.7851, lng: -122.407 },
      { lat: 37.7855, lng: -122.4065 },
      { lat: 37.786, lng: -122.4055 },
      { lat: 37.787, lng: -122.4045 },
      { lat: 37.787, lng: -122.404 },
      { lat: 37.786, lng: -122.404 },
      { lat: 37.785, lng: -122.404 },
      { lat: 37.7845, lng: -122.405 },
      { lat: 37.7849, lng: -122.408 },
    ],
  },
  {
    id: "brooklyn_park",
    name: "Brooklyn Park Walk",
    description: "Prospect Park outer loop",
    waypoints: [
      { lat: 40.6602, lng: -73.9689 },
      { lat: 40.6608, lng: -73.9698 },
      { lat: 40.6617, lng: -73.9701 },
      { lat: 40.6626, lng: -73.9698 },
      { lat: 40.6632, lng: -73.969 },
      { lat: 40.6628, lng: -73.968 },
      { lat: 40.6618, lng: -73.9675 },
      { lat: 40.661, lng: -73.9678 },
      { lat: 40.6602, lng: -73.9689 },
    ],
  },
  {
    id: "chicago_riverwalk",
    name: "Chicago Riverwalk",
    description: "River path through downtown Chicago",
    waypoints: [
      { lat: 41.888, lng: -87.6282 },
      { lat: 41.888, lng: -87.627 },
      { lat: 41.888, lng: -87.626 },
      { lat: 41.8878, lng: -87.625 },
      { lat: 41.8875, lng: -87.624 },
      { lat: 41.8873, lng: -87.623 },
      { lat: 41.887, lng: -87.622 },
      { lat: 41.887, lng: -87.6205 },
    ],
  },
];

export default function SimulateScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  async function runSimulation(route: (typeof DEV_ROUTES)[0]) {
    setSimulating(true);
    setProgress(0);
    setCurrentStep("Starting journey...");

    try {
      const startRes = await fetch(`${apiBase}/journeys`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ isDevSimulated: true }),
      });

      if (!startRes.ok) throw new Error("Failed to start journey");
      const journey = await startRes.json() as { id: string };
      const journeyId = journey.id;

      const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

      for (let i = 0; i < route.waypoints.length; i++) {
        const wp = route.waypoints[i];
        setCurrentStep(`Walking... (${i + 1}/${route.waypoints.length})`);
        setProgress(Math.round(((i + 1) / route.waypoints.length) * 70));

        await fetch(`${apiBase}/journeys/${journeyId}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({
            waypoints: [{ ...wp, recordedAt: new Date().toISOString() }],
          }),
        });

        if (i === Math.floor(route.waypoints.length / 2)) {
          setCurrentStep("Pinging for places...");
          await fetch(`${apiBase}/journeys/${journeyId}/ping`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({ lat: wp.lat, lng: wp.lng }),
          });
          setProgress(80);
        }

        await delay(300);
      }

      setCurrentStep("Ending journey...");
      setProgress(90);

      await fetch(`${apiBase}/journeys/${journeyId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: "ended" }),
      });

      setProgress(100);
      setCurrentStep("Done!");

      await delay(800);
      Alert.alert(
        "Simulation Complete",
        `Simulated "${route.name}" journey saved successfully!`,
        [{ text: "View Profile", onPress: () => router.push("/(tabs)/profile") }],
      );
    } catch (err) {
      Alert.alert("Simulation Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSimulating(false);
      setProgress(0);
      setCurrentStep("");
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
    >
      <View style={styles.header}>
        <Feather name="play-circle" size={24} color={Colors.info} />
        <Text style={styles.title}>Dev Journey Simulator</Text>
      </View>
      <Text style={styles.subtitle}>
        Simulate a GPS walk to test journey tracking, place discovery, and XP/quest logic without leaving your desk.
      </Text>

      {simulating && (
        <View style={styles.progressCard}>
          <ActivityIndicator color={Colors.gold} />
          <Text style={styles.progressStep}>{currentStep}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressPct}>{progress}%</Text>
        </View>
      )}

      <View style={styles.routeList}>
        {DEV_ROUTES.map((route) => (
          <View key={route.id} style={styles.routeCard}>
            <View style={styles.routeInfo}>
              <Text style={styles.routeName}>{route.name}</Text>
              <Text style={styles.routeDesc}>{route.description}</Text>
              <Text style={styles.routeMeta}>
                {route.waypoints.length} waypoints · 1 ping
              </Text>
            </View>
            <Pressable
              style={[styles.runButton, simulating && styles.runButtonDisabled]}
              onPress={() => runSimulation(route)}
              disabled={simulating}
            >
              <Feather name="play" size={14} color={Colors.background} />
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
  content: { paddingHorizontal: 16, gap: 16 },
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
    fontSize: 14,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
    alignItems: "center",
  },
  progressStep: {
    fontSize: 14,
    color: Colors.parchment,
    fontFamily: "Inter_500Medium",
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
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
    gap: 6,
    backgroundColor: Colors.info,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  runButtonDisabled: { opacity: 0.5 },
  runButtonText: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});

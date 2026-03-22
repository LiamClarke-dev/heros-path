import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#1A1209", "#0D0A0B"]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Hero's Path</Text>
          <Text style={styles.subtitle}>Your adventure awaits</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={login}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Log in to continue</Text>
            )}
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 48,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.gold,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
  },
});

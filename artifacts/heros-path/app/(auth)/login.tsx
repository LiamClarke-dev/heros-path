import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "heros-path",
  });

  const discovery = AuthSession.useAutoDiscovery("https://accounts.google.com");

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      redirectUri,
      responseType: "id_token",
      scopes: ["openid", "profile", "email"],
      extraParams: { nonce: Math.random().toString(36).slice(2) },
      usePKCE: false,
    },
    discovery ?? null,
  );

  React.useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params?.id_token;
      if (idToken) {
        handleGoogleToken(idToken);
      }
    } else if (response?.type === "error") {
      Alert.alert("Sign in failed", response.error?.message ?? "Unknown error");
    }
  }, [response]);

  async function handleGoogleToken(idToken: string) {
    setIsLoading(true);
    try {
      const apiBase = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
        : "http://localhost:3000/api";

      const res = await fetch(`${apiBase}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Auth failed");
      }

      const data = await res.json() as { token: string; user: {
        id: string; googleId: string; displayName: string;
        avatarUrl: string | null; email: string | null;
        xp: number; level: number; rank: string; streakDays: number;
      } };
      await signIn(data.token, data.user);
    } catch (err) {
      Alert.alert("Sign in failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={["#0D0A0B", "#1A1510", "#0D0A0B"]}
      style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
    >
      <View style={styles.heroSection}>
        <View style={styles.iconCircle}>
          <Feather name="compass" size={56} color={Colors.gold} />
        </View>
        <Text style={styles.appName}>Hero's Path</Text>
        <Text style={styles.tagline}>Every street tells a story</Text>
        <Text style={styles.subtitle}>
          Track your journeys, discover hidden gems, and become the adventurer your city deserves.
        </Text>
      </View>

      <View style={styles.featuresSection}>
        {[
          { icon: "map" as const, text: "Color your walked streets permanently" },
          { icon: "search" as const, text: "Discover nearby places as you explore" },
          { icon: "award" as const, text: "Earn XP, badges & adventurer rank" },
        ].map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Feather name={f.icon} size={16} color={Colors.gold} />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          style={[styles.googleButton, (!request || isLoading) && styles.buttonDisabled]}
          onPress={() => promptAsync()}
          disabled={!request || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <>
              <Feather name="chrome" size={20} color={Colors.background} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.legalText}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
  },
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.goldDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  appName: {
    fontSize: 38,
    fontWeight: "700",
    color: Colors.gold,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  tagline: {
    fontSize: 15,
    color: Colors.parchmentMuted,
    fontStyle: "italic",
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.parchmentDim,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontFamily: "Inter_400Regular",
  },
  featuresSection: {
    gap: 12,
    marginVertical: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.goldGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    color: Colors.parchment,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  bottomSection: {
    gap: 12,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
  },
  legalText: {
    fontSize: 11,
    color: Colors.parchmentDim,
    textAlign: "center",
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
});

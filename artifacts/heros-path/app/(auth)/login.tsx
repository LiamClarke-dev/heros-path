import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

type Mode = "login" | "register";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID || undefined,
    clientId: WEB_CLIENT_ID || undefined,
    scopes: ["openid", "profile", "email"],
  });

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  React.useEffect(() => {
    if (response?.type === "success" && request) {
      const code = response.params?.code;
      if (!code) return;
      const clientId =
        Platform.OS === "ios" && IOS_CLIENT_ID ? IOS_CLIENT_ID : WEB_CLIENT_ID;
      const extraParams: Record<string, string> = {};
      if (request.codeVerifier) extraParams.code_verifier = request.codeVerifier;

      import("expo-auth-session").then(({ exchangeCodeAsync }) =>
        exchangeCodeAsync(
          { clientId, code, redirectUri: request.redirectUri, extraParams },
          { tokenEndpoint: "https://oauth2.googleapis.com/token" },
        )
      ).then((tokenResult) => {
        if (tokenResult.idToken) handleGoogleToken(tokenResult.idToken);
        else Alert.alert("Sign in failed", "No ID token returned from Google");
      }).catch((err: unknown) => {
        Alert.alert("Sign in failed", err instanceof Error ? err.message : "Google sign-in failed");
      });
    } else if (response?.type === "error") {
      Alert.alert("Sign in failed", response.error?.message ?? "Unknown error");
    }
  }, [response]);

  async function handleGoogleToken(idToken: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Auth failed");
      }
      const data = await res.json() as AuthResponse;
      await signIn(data.token, data.user);
    } catch (err) {
      Alert.alert("Sign in failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEmailAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      Alert.alert("Missing name", "Please enter your name.");
      return;
    }
    setIsLoading(true);
    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const body: Record<string, string> = { email: email.trim(), password };
      if (mode === "register") body.displayName = displayName.trim();

      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Auth failed");
      }
      const data = await res.json() as AuthResponse;
      await signIn(data.token, data.user);
    } catch (err) {
      Alert.alert(
        mode === "register" ? "Registration failed" : "Sign in failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={["#0D0A0B", "#1A1510", "#0D0A0B"]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Feather name="compass" size={48} color={Colors.gold} />
            </View>
            <Text style={styles.appName}>Hero's Path</Text>
            <Text style={styles.tagline}>Every street tells a story</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.modeToggle}>
              <Pressable
                style={[styles.modeTab, mode === "login" && styles.modeTabActive]}
                onPress={() => setMode("login")}
              >
                <Text style={[styles.modeTabText, mode === "login" && styles.modeTabTextActive]}>
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeTab, mode === "register" && styles.modeTabActive]}
                onPress={() => setMode("register")}
              >
                <Text style={[styles.modeTabText, mode === "register" && styles.modeTabTextActive]}>
                  Create Account
                </Text>
              </Pressable>
            </View>

            {mode === "register" && (
              <View style={styles.inputWrapper}>
                <Feather name="user" size={16} color={Colors.parchmentMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={Colors.parchmentMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Feather name="mail" size={16} color={Colors.parchmentMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.parchmentMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Feather name="lock" size={16} color={Colors.parchmentMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Password"
                placeholderTextColor={Colors.parchmentMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleEmailAuth}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={Colors.parchmentMuted} />
              </Pressable>
            </View>

            <Pressable
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleEmailAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === "register" ? "Create Account" : "Sign In"}
                </Text>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.googleButton, (!request || isLoading) && styles.buttonDisabled]}
              onPress={() => promptAsync()}
              disabled={!request || isLoading}
            >
              <Feather name="chrome" size={18} color={Colors.gold} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </Pressable>
          </View>

          <Text style={styles.legalText}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

type AuthResponse = {
  token: string;
  user: {
    id: string;
    googleId: string | null;
    displayName: string;
    avatarUrl: string | null;
    email: string | null;
    xp: number;
    level: number;
    rank: string;
    streakDays: number;
  };
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: {
    paddingHorizontal: 24,
    gap: 24,
  },
  heroSection: {
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.goldDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.gold,
    letterSpacing: 0.5,
    fontFamily: "Inter_700Bold",
  },
  tagline: {
    fontSize: 14,
    color: Colors.parchmentMuted,
    fontStyle: "italic",
    fontFamily: "Inter_400Regular",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 12,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  modeTabActive: {
    backgroundColor: Colors.gold,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.parchmentMuted,
    fontFamily: "Inter_600SemiBold",
  },
  modeTabTextActive: {
    color: Colors.background,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.parchment,
    fontFamily: "Inter_400Regular",
  },
  inputFlex: {
    flex: 1,
  },
  eyeButton: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 10,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.goldDark,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gold,
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

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import Colors from "../../constants/colors";

WebBrowser.maybeCompleteAuthSession();

type Tab = "signin" | "register";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { loginWithEmail, registerWithEmail, loginWithReplit, isLoading: authLoading, error: authError } = useAuth();

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailAuth() {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    try {
      if (tab === "signin") {
        await loginWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(
          email.trim(),
          password,
          displayName.trim() || undefined
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleReplit() {
    setError(null);
    try {
      await loginWithReplit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replit auth failed");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconRing}>
            <Text style={styles.iconEmoji}>🗺️</Text>
          </View>
          <Text style={styles.appName}>Hero's Path</Text>
          <Text style={styles.tagline}>Explore your city. Claim your legend.</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "signin" && styles.tabBtnActive]}
            onPress={() => { setTab("signin"); setError(null); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === "signin" && styles.tabBtnTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "register" && styles.tabBtnActive]}
            onPress={() => { setTab("register"); setError(null); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === "register" && styles.tabBtnTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {tab === "register" && (
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. UrbanExplorer42"
                placeholderTextColor={Colors.parchmentDim}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={Colors.parchmentDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.parchmentDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={tab === "register" ? "new-password" : "current-password"}
              editable={!loading}
            />
          </View>

          {(error || authError) ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error ?? authError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {tab === "signin" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={[styles.replitBtn, (loading || authLoading) && styles.btnDisabled]}
            onPress={handleReplit}
            disabled={loading || authLoading}
            activeOpacity={0.85}
          >
            {authLoading && !loading ? (
              <ActivityIndicator color={Colors.amber} />
            ) : (
              <Text style={styles.replitBtnText}>⚡ Continue with Replit</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          {tab === "signin"
            ? "New adventurer? Switch to Create Account above."
            : "Every city block is a quest waiting to happen."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingVertical: 8,
  },
  iconRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 36,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    color: Colors.parchment,
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.parchmentDim,
  },
  tabBtnTextActive: {
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
  },

  // Form
  form: {
    gap: 14,
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.parchmentMuted,
    marginLeft: 2,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.parchment,
  },
  errorBox: {
    backgroundColor: "rgba(217,96,96,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,96,96,0.3)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.background,    // Dark forest on sage green — high contrast
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentDim,
  },
  replitBtn: {
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  replitBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.parchmentMuted,
  },

  // Footer
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentDim,
    textAlign: "center",
    lineHeight: 18,
  },
});

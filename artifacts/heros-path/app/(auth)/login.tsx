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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import Colors from "../../constants/colors";

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
      const msg =
        err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleReplit() {
    setError(null);
    try {
      await loginWithReplit();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Replit auth failed";
      setError(msg);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.appName}>Hero's Path</Text>
        <Text style={styles.tagline}>Your city awaits, Adventurer</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "signin" && styles.tabBtnActive]}
            onPress={() => {
              setTab("signin");
              setError(null);
            }}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === "signin" && styles.tabBtnTextActive,
              ]}
            >
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "register" && styles.tabBtnActive]}
            onPress={() => {
              setTab("register");
              setError(null);
            }}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === "register" && styles.tabBtnTextActive,
              ]}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {tab === "register" && (
            <TextInput
              style={styles.input}
              placeholder="Display name (optional)"
              placeholderTextColor={Colors.parchmentDim}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              editable={!loading}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={Colors.parchmentDim}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.parchmentDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={tab === "register" ? "new-password" : "current-password"}
            editable={!loading}
          />

          {(error || authError) ? (
            <Text style={styles.errorText}>{error ?? authError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
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
          >
            {authLoading && !loading ? (
              <ActivityIndicator color={Colors.gold} />
            ) : (
              <Text style={styles.replitBtnText}>⚡ Continue with Replit</Text>
            )}
          </TouchableOpacity>
        </View>
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
    alignItems: "center",
    paddingHorizontal: 24,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: Colors.gold,
    marginBottom: 6,
    textAlign: "center",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.parchmentMuted,
    marginBottom: 36,
    textAlign: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
    width: "100%",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.card,
  },
  tabBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.parchmentDim,
  },
  tabBtnTextActive: {
    color: Colors.parchment,
  },
  form: {
    width: "100%",
    gap: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.parchment,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.background,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
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
    borderColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  replitBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.gold,
  },
});

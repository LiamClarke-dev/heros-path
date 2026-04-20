import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useAutoDiscovery, useAuthRequest, makeRedirectUri } from "expo-auth-session";
import { apiFetch } from "./api";

const TOKEN_KEY = "auth_token";
const REPLIT_ISSUER = "https://replit.com/oidc";

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

function base64urlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const padded2 = pad ? padded + "=".repeat(4 - pad) : padded;
  if (typeof atob === "function") {
    return atob(padded2);
  }
  return Buffer.from(padded2, "base64").toString("utf8");
}

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string;
  xp: number;
  level: number;
  profileImageUrl?: string | null;
}

export interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  loginWithReplit: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: {
    displayName?: string;
    profileImageUrl?: string | null;
  }) => Promise<void>;
  applyAuthResponse: (response: { token: string; user: AuthUser }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isLoading: true,
  error: null,
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginWithReplit: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  applyAuthResponse: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function decodePayload(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64urlDecode(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return {
      id: payload.id,
      email: payload.email ?? null,
      displayName: payload.displayName ?? "Adventurer",
      xp: payload.xp ?? 0,
      level: payload.level ?? 1,
      profileImageUrl: payload.profileImageUrl ?? null,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const discovery = useAutoDiscovery(REPLIT_ISSUER);
  // NOTE: Expo Go is not supported — this app requires native modules (react-native-maps,
  // expo-dev-client) that are not bundled in Expo Go. Use a custom EAS dev build instead.
  // On native, use the app's custom URI scheme so the OS routes the OAuth callback back
  // to the app. On web, use the default origin-based URI.
  const redirectUri = makeRedirectUri(
    Platform.OS === "web" ? {} : { scheme: "herospath" }
  );

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId:
        process.env.EXPO_PUBLIC_REPLIT_CLIENT_ID ??
        process.env.EXPO_PUBLIC_REPL_ID ??
        "herospath",
      redirectUri,
      scopes: ["openid", "profile", "email"],
      usePKCE: true,
    },
    discovery
  );

  const pendingExchangeRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.get(TOKEN_KEY);
        if (stored) {
          const decoded = decodePayload(stored);
          if (decoded) {
            setToken(stored);
            setUser(decoded);
          } else {
            await storage.remove(TOKEN_KEY);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function persistToken(newToken: string, newUser: AuthUser) {
    await storage.set(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setError(null);
  }

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const data = (await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })) as { token: string; user: AuthUser };
      await persistToken(data.token, data.user);
    },
    []
  );

  const registerWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setError(null);
      const data = (await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      })) as { token: string; user: AuthUser };
      await persistToken(data.token, data.user);
    },
    []
  );

  const loginWithReplit = useCallback(async () => {
    if (!request) {
      setError("Replit auth not ready — try again in a moment");
      return;
    }
    if (pendingExchangeRef.current) return;

    setError(null);
    setIsLoading(true);
    try {
      const result = await promptAsync();
      if (result.type !== "success") {
        if (result.type !== "dismiss" && result.type !== "cancel") {
          setError("Replit login was not completed");
        }
        return;
      }

      pendingExchangeRef.current = true;
      const code = result.params.code;
      const codeVerifier = request.codeVerifier;

      const data = (await apiFetch("/api/auth/replit/token-exchange", {
        method: "POST",
        body: JSON.stringify({ code, codeVerifier, redirectUri }),
      })) as { token: string; user: AuthUser };

      await persistToken(data.token, data.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Replit login failed";
      setError(msg);
    } finally {
      setIsLoading(false);
      pendingExchangeRef.current = false;
    }
  }, [request, promptAsync, redirectUri]);

  const logout = useCallback(async () => {
    await storage.remove(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
  }, []);

  const updateProfile = useCallback(
    async (updates: { displayName?: string; profileImageUrl?: string | null }) => {
      if (!token) throw new Error("Not authenticated");
      const data = (await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(updates),
        headers: { Authorization: `Bearer ${token}` },
      })) as { token: string; user: AuthUser };
      await persistToken(data.token, data.user);
    },
    [token]
  );

  const applyAuthResponse = useCallback(
    async (response: { token: string; user: AuthUser }) => {
      await persistToken(response.token, response.user);
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        error,
        loginWithEmail,
        registerWithEmail,
        loginWithReplit,
        logout,
        updateProfile,
        applyAuthResponse,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { useAutoDiscovery, useAuthRequest, makeRedirectUri } from "expo-auth-session";
import { apiFetch } from "./api";

const TOKEN_KEY = "auth_token";
const REPLIT_ISSUER = "https://replit.com/oidc";

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
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  loginWithReplit: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isLoading: true,
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginWithReplit: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function decodePayload(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return {
      id: payload.id,
      email: payload.email ?? null,
      displayName: payload.displayName ?? "Adventurer",
      xp: payload.xp ?? 0,
      level: payload.level ?? 1,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const discovery = useAutoDiscovery(REPLIT_ISSUER);
  const redirectUri = makeRedirectUri({ scheme: "herospath" });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_REPLIT_CLIENT_ID ?? process.env.EXPO_PUBLIC_REPL_ID ?? "herospath",
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
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          const decoded = decodePayload(stored);
          if (decoded) {
            setToken(stored);
            setUser(decoded);
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (
      !response ||
      response.type !== "success" ||
      pendingExchangeRef.current ||
      !request
    ) {
      return;
    }
    pendingExchangeRef.current = true;

    const code = response.params.code;
    const codeVerifier = request.codeVerifier;

    (async () => {
      try {
        const data = (await apiFetch("/api/auth/replit/token-exchange", {
          method: "POST",
          body: JSON.stringify({ code, codeVerifier, redirectUri }),
        })) as { token: string; user: AuthUser };

        await persistToken(data.token, data.user);
      } catch (err) {
        console.warn("Replit token exchange failed:", err);
      } finally {
        pendingExchangeRef.current = false;
      }
    })();
  }, [response]);

  async function persistToken(newToken: string, newUser: AuthUser) {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
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
      console.warn("Replit auth request not ready");
      return;
    }
    await promptAsync();
  }, [request, promptAsync]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        loginWithEmail,
        registerWithEmail,
        loginWithReplit,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

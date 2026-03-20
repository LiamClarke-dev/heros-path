import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const SESSION_KEY = "heros_path_session_token";

interface AuthUser {
  id: string;
  googleId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  xp: number;
  level: number;
  rank: string;
  streakDays: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(async () => {
      return await SecureStore.getItemAsync(SESSION_KEY);
    });

    loadStoredSession();
  }, []);

  async function loadStoredSession() {
    try {
      const storedToken = await SecureStore.getItemAsync(SESSION_KEY);
      const storedUser = await SecureStore.getItemAsync(SESSION_KEY + "_user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(newToken: string, newUser: AuthUser) {
    await SecureStore.setItemAsync(SESSION_KEY, newToken);
    await SecureStore.setItemAsync(SESSION_KEY + "_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(SESSION_KEY + "_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

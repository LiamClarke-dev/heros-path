import { createContext, useContext, useEffect } from "react";
import { Stack, Redirect } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import Colors from "../constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export interface AuthUser {
  id: string;
  email?: string | null;
  displayName: string;
  xp: number;
  level: number;
}

export interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isLoading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthContext.Provider value={{ token: null, user: null, isLoading: false }}>
          <StatusBar style="light" backgroundColor={Colors.background} />
          <RootNavigator />
        </AuthContext.Provider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

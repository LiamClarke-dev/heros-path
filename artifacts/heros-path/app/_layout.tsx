import { useContext, useEffect, useState, useCallback } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { Platform, Alert } from "react-native";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AuthProvider, AuthContext } from "../lib/auth";
import Colors from "../constants/colors";
import { apiFetch } from "../lib/api";
import OnboardingSheet from "../components/OnboardingSheet";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export { AuthContext };
export { useAuth } from "../lib/auth";
export type { AuthUser } from "../lib/auth";

const ONBOARDING_KEY_PREFIX = "prefs_onboarded_";
const DEFAULT_TYPES = ["restaurant", "cafe", "park", "museum"];

async function getOnboardingKey(userId: string): Promise<string> {
  return `${ONBOARDING_KEY_PREFIX}${userId}`;
}

async function readOnboardingFlag(userId: string): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(await getOnboardingKey(userId)) === "1";
    }
    const val = await SecureStore.getItemAsync(await getOnboardingKey(userId));
    return val === "1";
  } catch {
    return false;
  }
}

async function writeOnboardingFlag(userId: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(await getOnboardingKey(userId), "1");
      return;
    }
    await SecureStore.setItemAsync(await getOnboardingKey(userId), "1");
  } catch {}
}

function RootNavigator() {
  const { isLoading, user, token } = useContext(AuthContext);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  const checkOnboarding = useCallback(async () => {
    if (!user || !token) return;
    try {
      const alreadyOnboarded = await readOnboardingFlag(user.id);
      if (alreadyOnboarded) return;
      const prefs = (await apiFetch("/api/me/preferences", { token })) as {
        placeTypes: string[];
        minRating: number;
      };
      if (!prefs.placeTypes || prefs.placeTypes.length === 0) {
        setOnboardingVisible(true);
      } else {
        await writeOnboardingFlag(user.id);
      }
    } catch {}
  }, [user, token]);

  useEffect(() => {
    if (!isLoading) {
      checkOnboarding();
    }
  }, [isLoading, checkOnboarding]);

  const handleOnboardingComplete = useCallback(
    async (selectedTypes: string[]) => {
      if (!user || !token) return;
      try {
        await apiFetch("/api/me/preferences", {
          method: "PUT",
          token,
          body: JSON.stringify({
            placeTypes: selectedTypes.length > 0 ? selectedTypes : DEFAULT_TYPES,
            minRating: 0,
          }),
        });
        await writeOnboardingFlag(user.id);
        setOnboardingVisible(false);
      } catch {
        Alert.alert(
          "Couldn't save preferences",
          "Please check your connection and try again.",
          [{ text: "OK" }]
        );
      }
    },
    [user, token]
  );

  const handleOnboardingSkip = useCallback(async () => {
    if (!user || !token) return;
    try {
      await apiFetch("/api/me/preferences", {
        method: "PUT",
        token,
        body: JSON.stringify({ placeTypes: DEFAULT_TYPES, minRating: 0 }),
      });
      await writeOnboardingFlag(user.id);
    } catch {}
    setOnboardingVisible(false);
  }, [user, token]);

  if (isLoading) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="past-journeys" />
        <Stack.Screen name="journey-detail" />
        <Stack.Screen name="settings" />
      </Stack>
      <OnboardingSheet
        visible={onboardingVisible}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </>
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
        <AuthProvider>
          <StatusBar style="light" backgroundColor={Colors.background} />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

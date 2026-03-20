import { Stack } from "expo-router";
import Colors from "@/constants/colors";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.gold,
        headerTitleStyle: { color: Colors.parchment, fontFamily: "Inter_600SemiBold" },
      }}
    >
      <Stack.Screen name="preferences" options={{ title: "Discovery Preferences" }} />
    </Stack>
  );
}

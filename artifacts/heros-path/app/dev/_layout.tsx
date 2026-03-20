import { Stack } from "expo-router";
import Colors from "@/constants/colors";

export default function DevLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.gold,
        headerTitleStyle: { color: Colors.parchment, fontFamily: "Inter_600SemiBold" },
      }}
    >
      <Stack.Screen name="simulate" options={{ title: "Journey Simulator" }} />
    </Stack>
  );
}

import { Redirect, Stack } from "expo-router";
import { useAuth } from "../_layout";
import Colors from "../../constants/colors";

export default function AuthLayout() {
  const { token, isLoading } = useAuth();

  if (!isLoading && token) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}

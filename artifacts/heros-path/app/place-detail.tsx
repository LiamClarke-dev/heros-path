import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/colors";

export default function PlaceDetailScreen() {
  const insets = useSafeAreaInsets();
  const { googlePlaceId } = useLocalSearchParams<{ googlePlaceId: string }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: "Place Details",
          headerShown: false,
        }}
      />
      <View style={styles.content}>
        <ActivityIndicator color={Colors.gold} size="large" />
        <Text style={styles.label}>Loading place…</Text>
        <Text style={styles.id} numberOfLines={1}>
          {googlePlaceId}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.parchmentMuted,
  },
  id: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentDim,
    maxWidth: "80%",
  },
});

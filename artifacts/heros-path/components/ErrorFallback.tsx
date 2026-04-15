import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";

interface Props {
  resetError: () => void;
}

export default function ErrorFallback({ resetError }: Props) {
  return (
    <View style={styles.container}>
      <Feather name="alert-triangle" size={48} color={Colors.gold} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>
        An unexpected error occurred. Tap below to try again.
      </Text>
      <Pressable onPress={resetError} style={styles.btn}>
        <Text style={styles.btnText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.parchment,
    marginTop: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  btn: {
    marginTop: 12,
    backgroundColor: Colors.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
});

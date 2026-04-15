import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import Colors from "../../constants/colors";

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.displayName ?? "Adventurer"}</Text>
        {user?.email ? (
          <Text style={styles.email}>{user.email}</Text>
        ) : null}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.xp ?? 0}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.level ?? 1}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.parchment,
    marginBottom: 4,
  },
  email: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.gold,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.error,
  },
});

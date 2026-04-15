import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../../constants/colors";

const APP_VERSION = "1.0.0";

interface SettingsItemProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function SettingsItem({ icon, label, onPress, danger }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Feather
        name={icon}
        size={18}
        color={danger ? Colors.error : Colors.parchmentMuted}
      />
      <Text style={[styles.itemLabel, danger && styles.itemLabelDanger]}>
        {label}
      </Text>
      {!danger && (
        <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsIndex() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.group}>
          <SettingsItem
            icon="sliders"
            label="Discovery Preferences"
            onPress={() => router.push("/settings/preferences")}
          />
          <SettingsItem
            icon="shield"
            label="Privacy"
            onPress={() => router.push("/settings/privacy" as never)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.group}>
          <SettingsItem
            icon="info"
            label="About Hero's Path"
            onPress={() => router.push("/settings/about")}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>Hero's Path v{APP_VERSION}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.parchment,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.parchment,
  },
  itemLabelDanger: {
    color: Colors.error,
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 32,
  },
  versionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentDim,
  },
});

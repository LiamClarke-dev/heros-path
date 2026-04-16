import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

const PLACE_TYPES = [
  { key: "restaurant", label: "Restaurant" },
  { key: "cafe", label: "Café" },
  { key: "bar", label: "Bar" },
  { key: "night_club", label: "Nightlife" },
  { key: "museum", label: "Museum" },
  { key: "park", label: "Park" },
  { key: "tourist_attraction", label: "Attraction" },
  { key: "shopping_mall", label: "Shopping" },
  { key: "gym", label: "Fitness" },
  { key: "library", label: "Library" },
  { key: "movie_theater", label: "Cinema" },
  { key: "bakery", label: "Bakery" },
  { key: "hotel", label: "Hotel" },
  { key: "pharmacy", label: "Pharmacy" },
];

const RATING_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 3.0, label: "3.0+" },
  { value: 3.5, label: "3.5+" },
  { value: 4.0, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
];

const MAX_DISCOVERIES_OPTIONS = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
  { value: 0, label: "Unlimited" },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [placeTypes, setPlaceTypes] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [maxDiscoveries, setMaxDiscoveries] = useState(20);

  const loadPrefs = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const data = (await apiFetch("/api/me/preferences", {
        headers: { Authorization: `Bearer ${token}` },
      })) as { placeTypes: string[]; minRating: number; maxDiscoveries: number };
      setPlaceTypes(data.placeTypes ?? []);
      setMinRating(data.minRating ?? 0);
      setMaxDiscoveries(data.maxDiscoveries ?? 20);
    } catch (err) {
      console.warn("[Preferences] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  function toggleType(key: string) {
    setPlaceTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      await apiFetch("/api/me/preferences", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ placeTypes, minRating, maxDiscoveries }),
      });
      Alert.alert("Saved", "Your discovery preferences have been updated.");
    } catch (err) {
      Alert.alert("Error", "Could not save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={Colors.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={22} color={Colors.parchment} />
          </TouchableOpacity>
          <Text style={styles.title}>Discovery Preferences</Text>
        </View>
        <Text style={styles.subtitle}>
          Choose what types of places to find on your journeys.{"\n"}Leave all unchecked to discover everything.
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>Place Types</Text>
        <View style={styles.grid}>
          {PLACE_TYPES.map((type) => {
            const selected = placeTypes.includes(type.key);
            return (
              <TouchableOpacity
                key={type.key}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
                onPress={() => toggleType(type.key)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selected && styles.typeChipTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
                {selected && (
                  <Feather name="check" size={12} color={Colors.background} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Minimum Rating</Text>
        <View style={styles.ratingRow}>
          {RATING_OPTIONS.map((opt) => {
            const selected = minRating === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.ratingBtn, selected && styles.ratingBtnSelected]}
                onPress={() => setMinRating(opt.value)}
              >
                <Text
                  style={[
                    styles.ratingBtnText,
                    selected && styles.ratingBtnTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Max Discoveries per Journey</Text>
        <Text style={styles.sectionSubtitle}>
          Caps how many new places are discovered per journey (sorted by highest rated first).
        </Text>
        <View style={styles.ratingRow}>
          {MAX_DISCOVERIES_OPTIONS.map((opt) => {
            const selected = maxDiscoveries === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.ratingBtn, selected && styles.ratingBtnSelected]}
                onPress={() => setMaxDiscoveries(opt.value)}
              >
                <Text
                  style={[
                    styles.ratingBtnText,
                    selected && styles.ratingBtnTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : (
            <>
              <Feather name="save" size={16} color={Colors.background} />
              <Text style={styles.saveBtnText}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.parchment,
    flex: 1,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    lineHeight: 19,
  },
  sectionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    lineHeight: 17,
    marginBottom: 12,
    marginTop: -8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
  },
  typeChipSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  typeChipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchment,
  },
  typeChipTextSelected: {
    color: Colors.background,
    fontFamily: "Inter_700Bold",
  },
  ratingRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  ratingBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
  },
  ratingBtnSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  ratingBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchment,
  },
  ratingBtnTextSelected: {
    color: Colors.background,
    fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 32,
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
});

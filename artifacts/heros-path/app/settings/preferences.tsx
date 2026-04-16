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

const TOKYO_WARDS = [
  { id: "adachi", label: "Adachi (足立区)" },
  { id: "arakawa", label: "Arakawa (荒川区)" },
  { id: "bunkyo", label: "Bunkyo (文京区)" },
  { id: "chiyoda", label: "Chiyoda (千代田区)" },
  { id: "chuo", label: "Chuo (中央区)" },
  { id: "edogawa", label: "Edogawa (江戸川区)" },
  { id: "itabashi", label: "Itabashi (板橋区)" },
  { id: "katsushika", label: "Katsushika (葛飾区)" },
  { id: "kita", label: "Kita (北区)" },
  { id: "koto", label: "Koto (江東区)" },
  { id: "meguro", label: "Meguro (目黒区)" },
  { id: "minato", label: "Minato (港区)" },
  { id: "nakano", label: "Nakano (中野区)" },
  { id: "nerima", label: "Nerima (練馬区)" },
  { id: "ota", label: "Ota (大田区)" },
  { id: "setagaya", label: "Setagaya (世田谷区)" },
  { id: "shibuya", label: "Shibuya (渋谷区)" },
  { id: "shinagawa", label: "Shinagawa (品川区)" },
  { id: "shinjuku", label: "Shinjuku (新宿区)" },
  { id: "suginami", label: "Suginami (杉並区)" },
  { id: "sumida", label: "Sumida (墨田区)" },
  { id: "taito", label: "Taito (台東区)" },
  { id: "toshima", label: "Toshima (豊島区)" },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [placeTypes, setPlaceTypes] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [maxDiscoveries, setMaxDiscoveries] = useState(20);
  const [tokyoWards, setTokyoWards] = useState<string[]>([]);

  const loadPrefs = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [prefs, wardData] = await Promise.all([
        apiFetch("/api/me/preferences", {
          headers: { Authorization: `Bearer ${token}` },
        }) as Promise<{ placeTypes: string[]; minRating: number; maxDiscoveries: number }>,
        apiFetch("/api/map/preferences/tokyo-wards", {
          headers: { Authorization: `Bearer ${token}` },
        }) as Promise<{ wards: string[] }>,
      ]);
      setPlaceTypes(prefs.placeTypes ?? []);
      setMinRating(prefs.minRating ?? 0);
      setMaxDiscoveries(prefs.maxDiscoveries ?? 20);
      setTokyoWards(wardData.wards ?? []);
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

  function toggleWard(wardId: string) {
    setTokyoWards((prev) =>
      prev.includes(wardId) ? prev.filter((w) => w !== wardId) : [...prev, wardId]
    );
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      await Promise.all([
        apiFetch("/api/me/preferences", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ placeTypes, minRating, maxDiscoveries }),
        }),
        apiFetch("/api/map/preferences/tokyo-wards", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ wards: tokyoWards }),
        }),
      ]);
      Alert.alert("Saved", "Your preferences have been updated.");
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
          <Text style={styles.title}>Preferences</Text>
        </View>
        <Text style={styles.subtitle}>
          Customise your discovery filters and map zones.
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

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Tokyo Pinned Wards</Text>
        <Text style={styles.sectionSubtitle}>
          When exploring Tokyo, map zones load for your current ward. Pin extra wards to always show their zones too.
        </Text>
        <View style={styles.grid}>
          {TOKYO_WARDS.map((ward) => {
            const selected = tokyoWards.includes(ward.id);
            return (
              <TouchableOpacity
                key={ward.id}
                style={[styles.typeChip, selected && styles.typeChipSelected]}
                onPress={() => toggleWard(ward.id)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selected && styles.typeChipTextSelected,
                  ]}
                >
                  {ward.label}
                </Text>
                {selected && (
                  <Feather name="check" size={12} color={Colors.background} />
                )}
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

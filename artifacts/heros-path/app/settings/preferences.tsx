import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

const PLACE_CATEGORIES = [
  { type: "restaurant", label: "Restaurants", icon: "coffee" as const },
  { type: "cafe", label: "Cafes", icon: "coffee" as const },
  { type: "bar", label: "Bars", icon: "coffee" as const },
  { type: "night_club", label: "Nightlife", icon: "music" as const },
  { type: "museum", label: "Museums", icon: "archive" as const },
  { type: "park", label: "Parks & Nature", icon: "sun" as const },
  { type: "tourist_attraction", label: "Attractions", icon: "camera" as const },
  { type: "shopping_mall", label: "Shopping", icon: "shopping-bag" as const },
  { type: "gym", label: "Fitness", icon: "activity" as const },
  { type: "library", label: "Libraries", icon: "book" as const },
  { type: "movie_theater", label: "Cinemas", icon: "film" as const },
  { type: "bakery", label: "Bakeries", icon: "coffee" as const },
  { type: "pharmacy", label: "Pharmacies", icon: "plus-circle" as const },
];

const RATING_OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 3.0, label: "3.0+" },
  { value: 3.5, label: "3.5+" },
  { value: 4.0, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
];

export default function PreferencesScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    void loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const res = await fetch(`${apiBase}/me/preferences`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json() as { placeTypes: string[]; minRating: number };
        setSelectedTypes(data.placeTypes ?? []);
        setMinRating(data.minRating ?? 0);
      }
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  }

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  async function save() {
    setIsSaving(true);
    try {
      const res = await fetch(`${apiBase}/me/preferences`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ placeTypes: selectedTypes, minRating }),
      });
      if (res.ok) {
        router.back();
      } else {
        throw new Error("Save failed");
      }
    } catch {
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  const allSelected = selectedTypes.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        Customize which kinds of places Hero's Path discovers for you during journeys.
        Leave all unchecked to discover everything.
      </Text>

      {/* Place type toggles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Place Categories</Text>

        <Pressable
          style={[styles.allToggle, allSelected && styles.allToggleActive]}
          onPress={() => setSelectedTypes([])}
        >
          <Feather name="globe" size={14} color={allSelected ? Colors.gold : Colors.parchmentMuted} />
          <Text style={[styles.allToggleText, allSelected && styles.allToggleTextActive]}>
            Discover Everything
          </Text>
          {allSelected && <Feather name="check" size={14} color={Colors.gold} />}
        </Pressable>

        <View style={styles.categoryGrid}>
          {PLACE_CATEGORIES.map((cat) => {
            const isActive = selectedTypes.includes(cat.type);
            return (
              <Pressable
                key={cat.type}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => toggleType(cat.type)}
              >
                <Feather
                  name={cat.icon}
                  size={14}
                  color={isActive ? Colors.gold : Colors.parchmentMuted}
                />
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Minimum rating */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Minimum Rating</Text>
        <Text style={styles.sectionSubtitle}>
          Filter out places below this rating. Set to "Any" to see everything.
        </Text>

        <View style={styles.ratingRow}>
          {RATING_OPTIONS.map((opt) => {
            const isActive = minRating === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.ratingChip, isActive && styles.ratingChipActive]}
                onPress={() => setMinRating(opt.value)}
              >
                {opt.value > 0 && (
                  <Feather
                    name="star"
                    size={10}
                    color={isActive ? Colors.gold : Colors.parchmentDim}
                  />
                )}
                <Text style={[styles.ratingChipText, isActive && styles.ratingChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Save button */}
      <Pressable
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={save}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={Colors.background} />
        ) : (
          <>
            <Feather name="check" size={16} color={Colors.background} />
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  intro: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  allToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  allToggleActive: {
    borderColor: Colors.goldDark,
    backgroundColor: Colors.goldGlow,
  },
  allToggleText: {
    flex: 1,
    fontSize: 14,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_500Medium",
  },
  allToggleTextActive: {
    color: Colors.gold,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.goldGlow,
    borderColor: Colors.goldDark,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  categoryChipTextActive: {
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  ratingChipActive: {
    backgroundColor: Colors.goldGlow,
    borderColor: Colors.goldDark,
  },
  ratingChipText: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  ratingChipTextActive: {
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});

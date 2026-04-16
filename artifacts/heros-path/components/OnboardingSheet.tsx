import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

interface PlaceTypeOption {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const PLACE_TYPE_OPTIONS: PlaceTypeOption[] = [
  { key: "restaurant", label: "Restaurants", icon: "coffee" },
  { key: "cafe", label: "Cafés", icon: "coffee" },
  { key: "park", label: "Parks", icon: "sun" },
  { key: "museum", label: "Museums", icon: "book-open" },
  { key: "bar", label: "Bars", icon: "moon" },
  { key: "bakery", label: "Bakeries", icon: "heart" },
  { key: "gym", label: "Gyms", icon: "activity" },
  { key: "tourist_attraction", label: "Landmarks", icon: "map-pin" },
  { key: "shopping_mall", label: "Shopping", icon: "shopping-bag" },
  { key: "library", label: "Libraries", icon: "book" },
  { key: "movie_theater", label: "Cinemas", icon: "film" },
  { key: "night_club", label: "Nightlife", icon: "music" },
];

const DEFAULT_SELECTED = ["restaurant", "cafe", "park", "museum"];

interface OnboardingSheetProps {
  visible: boolean;
  onComplete: (selectedTypes: string[]) => void;
  onSkip: () => void;
}

export default function OnboardingSheet({
  visible,
  onComplete,
  onSkip,
}: OnboardingSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(DEFAULT_SELECTED)
  );
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setSelected(new Set(DEFAULT_SELECTED));
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  function toggleType(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (Platform.OS === "web") return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handle} />

          <View style={styles.headerSection}>
            <View style={styles.iconWrap}>
              <Feather name="compass" size={28} color={Colors.gold} />
            </View>
            <Text style={styles.title}>What do you like to discover?</Text>
            <Text style={styles.subtitle}>
              Choose the types of places you want to uncover on your journeys.
              You can change these any time in Settings.
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {PLACE_TYPE_OPTIONS.map((opt) => {
              const active = selected.has(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleType(opt.key)}
                  activeOpacity={0.75}
                >
                  <Feather
                    name={opt.icon}
                    size={18}
                    color={active ? Colors.background : Colors.parchmentMuted}
                  />
                  <Text
                    style={[styles.chipLabel, active && styles.chipLabelActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => onComplete(Array.from(selected))}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Start Exploring</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={onSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.parchment,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  chipLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  chipLabelActive: {
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.background,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
});

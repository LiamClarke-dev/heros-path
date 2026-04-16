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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

const DEFAULT_SELECTED = ["restaurant", "cafe", "park", "museum"];
const DEFAULT_MIN_RATING = 0;
const DEFAULT_MAX_DISCOVERIES = 20;

const SLIDES = [
  {
    step: 0,
    title: "Every step leaves a mark",
    body: "Hero's Path turns every walk into a living map. Each street you travel gets painted gold — permanently. Over time, your city becomes your story.",
    icon: "map" as keyof typeof Feather.glyphMap,
    iconColor: Colors.gold,
  },
  {
    step: 1,
    title: "Uncover hidden gems",
    body: "As you walk, Hero's Path tracks the places along your route. Tap the ⚡ button any time during a journey for an early reveal — or wait until the end to see everything at once. Save discoveries to lists, log a visit, or let them go.",
    icon: "compass" as keyof typeof Feather.glyphMap,
    iconColor: Colors.gold,
  },
  {
    step: 2,
    title: "Conquer your territory",
    body: "The glowing outlines on your map are territories — distinct areas of your city waiting to be explored. Walk enough streets in a territory to claim it, earn XP, and unlock badges.",
    icon: "shield" as keyof typeof Feather.glyphMap,
    iconColor: Colors.gold,
  },
];

export interface OnboardingPreferences {
  placeTypes: string[];
  minRating: number;
  maxDiscoveries: number;
}

interface OnboardingSheetProps {
  visible: boolean;
  onComplete: (prefs: OnboardingPreferences) => void;
  onSkip?: () => void;
}

export default function OnboardingSheet({
  visible,
  onComplete,
}: OnboardingSheetProps) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED));
  const [minRating, setMinRating] = useState(DEFAULT_MIN_RATING);
  const [maxDiscoveries, setMaxDiscoveries] = useState(DEFAULT_MAX_DISCOVERIES);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      setStep(0);
      setSelected(new Set(DEFAULT_SELECTED));
      setMinRating(DEFAULT_MIN_RATING);
      setMaxDiscoveries(DEFAULT_MAX_DISCOVERIES);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 12,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [visible]);

  function animateStep(nextStep: number) {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: nextStep > step ? -20 : 20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(nextStep > step ? 30 : -30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
      ]).start();
    });
  }

  function goNext() {
    if (step < 3) animateStep(step + 1);
  }

  function goBack() {
    if (step > 0) animateStep(step - 1);
  }

  function skipToPrefs() {
    animateStep(3);
  }

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

  function handleComplete() {
    onComplete({
      placeTypes: Array.from(selected),
      minRating,
      maxDiscoveries,
    });
  }

  if (Platform.OS === "web") return null;

  const isSlide = step < 3;
  const currentSlide = SLIDES[step];
  const TOTAL_STEPS = 4;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {isSlide ? (
            <View style={styles.slideContainer}>
              <View style={styles.slideTopRow}>
                <TouchableOpacity
                  style={styles.skipLink}
                  onPress={skipToPrefs}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipLinkText}>Skip intro</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.slideIconWrap}>
                <View style={styles.iconOuter}>
                  <View style={styles.iconInner}>
                    <Feather
                      name={currentSlide.icon}
                      size={48}
                      color={currentSlide.iconColor}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.slideCopyWrap}>
                <Text style={styles.slideTitle}>{currentSlide.title}</Text>
                <Text style={styles.slideBody}>{currentSlide.body}</Text>
              </View>

              <View style={styles.dotsRow}>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === step && styles.dotActive]}
                  />
                ))}
              </View>

              <View style={styles.slideNavRow}>
                {step > 0 ? (
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={goBack}
                    activeOpacity={0.75}
                  >
                    <Feather name="arrow-left" size={18} color={Colors.parchmentMuted} />
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.backBtnPlaceholder} />
                )}

                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={goNext}
                  activeOpacity={0.85}
                >
                  <Text style={styles.nextBtnText}>Next</Text>
                  <Feather name="arrow-right" size={18} color={Colors.background} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.prefsContainer}>
              <View style={styles.prefsTopRow}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={goBack}
                  activeOpacity={0.75}
                >
                  <Feather name="arrow-left" size={18} color={Colors.parchmentMuted} />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <View style={styles.dotsRow}>
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === step && styles.dotActive]}
                    />
                  ))}
                </View>
              </View>

              <Text style={styles.prefsTitle}>Tune your journey</Text>
              <Text style={styles.prefsHeading}>What should we look out for?</Text>

              <ScrollView
                style={styles.prefsScroll}
                contentContainerStyle={styles.prefsScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sectionLabel}>Place Types</Text>
                <View style={styles.grid}>
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
                          size={15}
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
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Minimum Rating</Text>
                <View style={styles.optionRow}>
                  {RATING_OPTIONS.map((opt) => {
                    const active = minRating === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.optionBtn, active && styles.optionBtnActive]}
                        onPress={() => setMinRating(opt.value)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[styles.optionBtnText, active && styles.optionBtnTextActive]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Max Discoveries</Text>
                <View style={styles.optionRow}>
                  {MAX_DISCOVERIES_OPTIONS.map((opt) => {
                    const active = maxDiscoveries === opt.value;
                    const isRecommended = opt.value === 20;
                    return (
                      <View key={opt.value} style={styles.optionBtnWrapper}>
                        {isRecommended && (
                          <View style={styles.recommendedTag}>
                            <Text style={styles.recommendedTagText}>Recommended</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.optionBtn,
                            active && styles.optionBtnActive,
                            isRecommended && styles.optionBtnRecommended,
                            isRecommended && active && styles.optionBtnActive,
                          ]}
                          onPress={() => setMaxDiscoveries(opt.value)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[styles.optionBtnText, active && styles.optionBtnTextActive]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.recommendationBanner}>
                  <Feather name="zap" size={14} color={Colors.gold} style={{ marginTop: 1 }} />
                  <Text style={styles.recommendationText}>
                    We suggest 20 — keeps each journey focused. The more you sort through your discoveries, the smarter Hero's Path gets at finding places you'll actually love.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={handleComplete}
                  activeOpacity={0.85}
                >
                  <Text style={styles.completeBtnText}>Begin Your Journey</Text>
                  <Feather name="chevron-right" size={18} color={Colors.background} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },

  slideContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  slideTopRow: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  skipLink: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipLinkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    textDecorationLine: "underline",
  },
  slideIconWrap: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  iconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.goldGlow,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  slideCopyWrap: {
    flex: 1,
    alignItems: "center",
    gap: 16,
  },
  slideTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.parchment,
    textAlign: "center",
    lineHeight: 34,
  },
  slideBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.parchmentMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.gold,
    width: 20,
    borderRadius: 4,
  },
  slideNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  backBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.parchmentMuted,
  },
  backBtnPlaceholder: {
    width: 80,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  nextBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.background,
  },

  prefsContainer: {
    flex: 1,
    paddingTop: 56,
  },
  prefsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  prefsTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  prefsHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.parchment,
    paddingHorizontal: 24,
    marginBottom: 16,
    lineHeight: 32,
  },
  prefsScroll: {
    flex: 1,
  },
  prefsScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: Colors.gold,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 13,
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
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  optionBtnWrapper: {
    position: "relative",
  },
  recommendedTag: {
    position: "absolute",
    top: -10,
    left: "50%",
    transform: [{ translateX: -36 }],
    backgroundColor: Colors.gold,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  recommendedTagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: Colors.background,
    letterSpacing: 0.3,
  },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  optionBtnRecommended: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
  },
  optionBtnActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  optionBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchment,
  },
  optionBtnTextActive: {
    color: Colors.background,
    fontFamily: "Inter_700Bold",
  },
  recommendationBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 16,
    marginBottom: 28,
  },
  recommendationText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    lineHeight: 18,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 8,
  },
  completeBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.background,
  },
});

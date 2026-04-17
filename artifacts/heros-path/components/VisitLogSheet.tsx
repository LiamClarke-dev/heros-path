import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { orderedTagGroups, TAG_BY_KEY } from "../constants/visitTags";
import { apiFetch } from "../lib/api";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.78;

export interface VisitRecord {
  id: string;
  googlePlaceId: string;
  visitedAt: string;
  reaction: string | null;
  tags: string[];
  notes: string | null;
  createdAt: string;
}

interface Props {
  visible: boolean;
  placeName: string;
  googlePlaceId: string;
  onClose: () => void;
  onSaved: (visit: VisitRecord) => void;
  token: string;
}

type Reaction = "thumbs_up" | "star" | "thumbs_down";

const REACTIONS: Array<{ value: Reaction; emoji: string; label: string }> = [
  { value: "thumbs_up",   emoji: "👍", label: "Liked" },
  { value: "star",        emoji: "⭐", label: "Loved" },
  { value: "thumbs_down", emoji: "👎", label: "Didn't like" },
];

const MAX_TAGS = 5;
const MAX_NOTES = 1000;

export function VisitLogSheet({ visible, placeName, googlePlaceId, onClose, onSaved, token }: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [visitDate, setVisitDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setReaction(null);
      setSelectedTags([]);
      setNotes("");
      setVisitDate(new Date());
      setError(null);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  const handleSelectReaction = useCallback((r: Reaction) => {
    setReaction(r);
    setTimeout(() => setStep(2), 160);
  }, []);

  const toggleTag = useCallback((key: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, key];
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const { visit } = (await apiFetch(`/api/places/${googlePlaceId}/visits`, {
        method: "POST",
        token,
        body: JSON.stringify({
          visitedAt: visitDate.toISOString(),
          reaction: reaction ?? undefined,
          tags: selectedTags,
          notes: notes.trim() || undefined,
        }),
      })) as { visit: VisitRecord };
      onSaved(visit);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }, [saving, googlePlaceId, token, visitDate, reaction, selectedTags, notes, onSaved, handleClose]);

  const tagGroups = orderedTagGroups(reaction);

  function formatDate(d: Date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); handleClose(); }}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.flex}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {step > 1 && (
                <TouchableOpacity onPress={() => setStep((s) => (s - 1) as 1 | 2 | 3)} style={styles.backBtn}>
                  <Feather name="arrow-left" size={20} color={Colors.parchmentMuted} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {step === 1 ? "How was it?" : step === 2 ? "Add tags" : "Add notes"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={Colors.parchmentMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.placeName} numberOfLines={1}>{placeName}</Text>

          {step === 3 && (
            <View style={styles.stepDots}>
              {[1, 2, 3].map((s) => (
                <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
              ))}
            </View>
          )}

          {step === 1 && (
            <View style={styles.reactionRow}>
              {REACTIONS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.reactionCard, reaction === r.value && styles.reactionCardActive]}
                  onPress={() => handleSelectReaction(r.value)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  <Text style={[styles.reactionLabel, reaction === r.value && styles.reactionLabelActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step === 2 && (
            <ScrollView
              style={styles.tagScroll}
              contentContainerStyle={styles.tagScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {tagGroups.map((group) => (
                <View key={group.title} style={styles.tagGroup}>
                  <Text style={styles.tagGroupTitle}>{group.title}</Text>
                  <View style={styles.tagChips}>
                    {group.tags.map((tag) => {
                      const active = selectedTags.includes(tag.key);
                      const disabled = !active && selectedTags.length >= MAX_TAGS;
                      return (
                        <TouchableOpacity
                          key={tag.key}
                          style={[
                            styles.chip,
                            active && styles.chipActive,
                            disabled && styles.chipDisabled,
                          ]}
                          onPress={() => toggleTag(tag.key)}
                          activeOpacity={disabled ? 1 : 0.75}
                        >
                          <Text style={styles.chipEmoji}>{tag.emoji}</Text>
                          <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                            {tag.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {step === 2 && (
            <View style={styles.step2Footer}>
              <Text style={styles.tagCount}>
                {selectedTags.length}/{MAX_TAGS} selected
              </Text>
              <TouchableOpacity onPress={() => setStep(3)} style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>
                  {selectedTags.length === 0 ? "Skip" : "Next"}
                </Text>
                <Feather name="arrow-right" size={16} color={Colors.gold} />
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <ScrollView
              style={styles.step3Container}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={true}
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={styles.notesInput}
                placeholder="Add a note… (optional)"
                placeholderTextColor={Colors.parchmentDim}
                multiline
                maxLength={MAX_NOTES}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Text style={styles.charCount}>{notes.length}/{MAX_NOTES}</Text>

              <TouchableOpacity
                style={styles.dateRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={16} color={Colors.gold} />
                <Text style={styles.dateText}>Visit date: {formatDate(visitDate)}</Text>
                <Feather name="chevron-right" size={14} color={Colors.parchmentDim} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={visitDate}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={(_e, date) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (date) setVisitDate(date);
                  }}
                />
              )}

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={saving}
              >
                <Feather name="check" size={18} color={Colors.background} />
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving…" : "Save Visit"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerLeft: { width: 36, alignItems: "flex-start" },
  backBtn: { padding: 4 },
  closeBtn: { padding: 4 },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.parchment,
    flex: 1,
    textAlign: "center",
  },
  placeName: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    textAlign: "center",
    marginBottom: 20,
  },
  stepDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: { backgroundColor: Colors.gold },
  // Step 1 — Reaction
  reactionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  reactionCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  reactionCardActive: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(212,160,23,0.12)",
  },
  reactionEmoji: { fontSize: 40 },
  reactionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  reactionLabelActive: { color: Colors.gold },
  // Step 2 — Tags
  tagScroll: { flex: 1, marginBottom: 8 },
  tagScrollContent: { paddingBottom: 8 },
  tagGroup: { marginBottom: 16 },
  tagGroupTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.parchmentDim,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  tagChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(212,160,23,0.15)",
  },
  chipDisabled: { opacity: 0.4 },
  chipEmoji: { fontSize: 14 },
  chipLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  chipLabelActive: { color: Colors.gold },
  step2Footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tagCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentDim,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  nextBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.gold,
  },
  // Step 3 — Notes + date
  step3Container: { flex: 1 },
  notesInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchment,
    height: 120,
    marginBottom: 4,
  },
  charCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentDim,
    textAlign: "right",
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  dateText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchment,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 12,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.background,
  },
});

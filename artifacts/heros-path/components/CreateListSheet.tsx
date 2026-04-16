import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import Colors from "../constants/colors";

const EMOJIS = ["📍", "⭐", "🍕", "☕", "🎭", "🌿", "🏛️", "🛍️", "🏖️", "🎵", "🏋️", "🌙"];

export const LIST_COLORS = [
  "#C9A84C",
  "#4C8DC9",
  "#7BC94C",
  "#C94C4C",
  "#C97C4C",
  "#9B4CC9",
  "#4CC9B0",
  "#C94C9B",
  "#6B7280",
  "#C9C44C",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, emoji: string, color: string) => Promise<void>;
}

export function CreateListSheet({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📍");
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = name.trim().length > 0 && color !== null;

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError("Enter a list name");
      return;
    }
    if (!color) {
      setError("Choose a color");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onCreate(name.trim(), emoji, color);
      setName("");
      setEmoji("📍");
      setColor(null);
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to create list");
    } finally {
      setLoading(false);
    }
  }, [name, emoji, color, onCreate, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>New List</Text>

        <Text style={styles.label}>Emoji</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.emojiRow}
        >
          {EMOJIS.map((e) => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
              onPress={() => setEmoji(e)}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Color <Text style={styles.required}>*</Text></Text>
        <View style={styles.colorRow}>
          {LIST_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                color === c && styles.colorSwatchActive,
              ]}
              onPress={() => setColor(c)}
              activeOpacity={0.8}
            />
          ))}
        </View>

        <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Weekend Eats"
          placeholderTextColor={Colors.parchmentDim}
          autoFocus
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, (!canCreate || loading) && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={!canCreate || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.btnText}>Create List</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.gold,
    marginBottom: 16,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.parchmentMuted,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  emojiRow: {
    gap: 8,
    paddingBottom: 12,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBtnActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldGlow,
  },
  emojiText: {
    fontSize: 22,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 16,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: Colors.parchment,
    transform: [{ scale: 1.15 }],
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.parchment,
    marginBottom: 12,
  },
  error: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.error,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
});

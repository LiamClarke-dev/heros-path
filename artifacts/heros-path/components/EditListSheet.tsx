import React, { useState, useCallback, useEffect } from "react";
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
} from "react-native";
import Colors from "../constants/colors";
import { LIST_COLORS } from "./CreateListSheet";

const EMOJIS = ["📍", "⭐", "🍕", "☕", "🎭", "🌿", "🏛️", "🛍️", "🏖️", "🎵", "🏋️", "🌙"];

export interface ListToEdit {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface Props {
  visible: boolean;
  list: ListToEdit | null;
  onClose: () => void;
  onSave: (listId: string, name: string, emoji: string, color: string) => Promise<void>;
}

export function EditListSheet({ visible, list, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📍");
  const [color, setColor] = useState(LIST_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (list) {
      setName(list.name);
      setEmoji(list.emoji || "📍");
      setColor(list.color || LIST_COLORS[0]);
      setError(null);
    }
  }, [list]);

  const canSave = name.trim().length > 0 && color.length > 0;

  const handleSave = useCallback(async () => {
    if (!list) return;
    if (!name.trim()) {
      setError("Enter a list name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(list.id, name.trim(), emoji, color);
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to update list");
    } finally {
      setLoading(false);
    }
  }, [list, name, emoji, color, onSave, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Edit List</Text>

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

        <Text style={styles.label}>Color</Text>
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

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Weekend Eats"
          placeholderTextColor={Colors.parchmentDim}
          maxLength={60}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, (!canSave || loading) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!canSave || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.btnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
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

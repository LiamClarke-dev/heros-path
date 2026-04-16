import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface EmojiPinProps {
  emoji: string;
  color?: string;
  size?: number;
}

export function EmojiPin({ emoji, color = "rgba(159,193,132,0.85)", size = 36 }: EmojiPinProps) {
  const fontSize = Math.round(size * 0.5);
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.emoji, { fontSize }]}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  emoji: {
    lineHeight: undefined,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});

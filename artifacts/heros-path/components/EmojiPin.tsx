import { View, Text, StyleSheet } from "react-native";

interface EmojiPinProps {
  emoji: string;
  color: string;
  size?: "sm" | "md";
}

export function EmojiPin({ emoji, color, size = "md" }: EmojiPinProps) {
  const dim = size === "sm" ? 28 : 36;
  const fontSize = size === "sm" ? 14 : 18;
  const tailH = size === "sm" ? 7 : 9;
  const tailW = size === "sm" ? 8 : 10;

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <View
        style={[
          styles.bubble,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: color,
          },
        ]}
      >
        <Text style={[styles.emoji, { fontSize }]}>{emoji}</Text>
      </View>
      <View
        style={[
          styles.tail,
          {
            borderTopColor: color,
            borderLeftWidth: tailW / 2,
            borderRightWidth: tailW / 2,
            borderTopWidth: tailH,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  bubble: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  emoji: {
    lineHeight: undefined,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  tail: {
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});

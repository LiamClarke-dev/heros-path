import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import Colors from "../constants/colors";

interface Props {
  title: string;
  progress: number;
  target: number;
  xpReward: number;
}

export default function QuestProgressBar({ title, progress, target, xpReward }: Props) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const ratio = Math.min(progress / Math.max(target, 1), 1);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: ratio,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.reward}>+{xpReward} XP</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: fillAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.count}>
        {progress}/{target}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.parchment,
    flex: 1,
    marginRight: 8,
  },
  reward: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.gold,
  },
  track: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 2,
  },
  fill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  count: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.parchmentMuted,
    textAlign: "right",
  },
});

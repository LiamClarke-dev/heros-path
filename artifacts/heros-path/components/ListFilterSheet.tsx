import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  Platform,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";

export interface ListInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
  itemCount: number;
}

interface Props {
  visible: boolean;
  lists: ListInfo[];
  activeListIds: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.55, 480);

export default function ListFilterSheet({
  visible,
  lists,
  activeListIds,
  onToggle,
  onClose,
}: Props) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
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

  if (Platform.OS === "web") return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTap} onPress={onClose} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Show List Pins</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={Colors.parchmentMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Tap a list to show its saved places on the map
          </Text>

          {lists.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="bookmark" size={36} color={Colors.parchmentDim} />
              <Text style={styles.emptyText}>
                You haven't created any lists yet.{"\n"}Save places to lists to see them here.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.chipGrid}
              showsVerticalScrollIndicator={false}
            >
              {lists.map((list) => {
                const active = activeListIds.has(list.id);
                return (
                  <TouchableOpacity
                    key={list.id}
                    style={[
                      styles.chip,
                      active && {
                        backgroundColor: list.color + "33",
                        borderColor: list.color,
                      },
                    ]}
                    onPress={() => onToggle(list.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.chipEmoji}>{list.emoji}</Text>
                    <View style={styles.chipTextCol}>
                      <Text
                        style={[styles.chipName, active && { color: Colors.parchment }]}
                        numberOfLines={1}
                      >
                        {list.name}
                      </Text>
                      <Text style={styles.chipCount}>
                        {list.itemCount} place{list.itemCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    {active && (
                      <View
                        style={[
                          styles.activeCheck,
                          { backgroundColor: list.color },
                        ]}
                      >
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.parchment,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  chipGrid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chipEmoji: {
    fontSize: 22,
  },
  chipTextCol: {
    flex: 1,
  },
  chipName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.parchmentMuted,
  },
  chipCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentDim,
    marginTop: 1,
  },
  activeCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
    lineHeight: 21,
  },
});

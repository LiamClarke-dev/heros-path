import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
  FlatList,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";

export interface DiscoveredPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  types: string[];
  address: string | null;
  distanceM: number;
}

interface PingResultsSheetProps {
  visible: boolean;
  places: DiscoveredPlace[];
  onDismiss: () => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

export default function PingResultsSheet({ visible, places, onDismiss }: PingResultsSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Feather name="radio" size={16} color={Colors.gold} />
              <Text style={styles.headerTitle}>
                {places.length} {places.length === 1 ? "Place" : "Places"} Nearby
              </Text>
            </View>
            <Pressable onPress={onDismiss} style={styles.closeBtn}>
              <Feather name="x" size={18} color={Colors.parchmentMuted} />
            </Pressable>
          </View>

          {places.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="map-pin" size={32} color={Colors.parchmentDim} />
              <Text style={styles.emptyTitle}>Nothing interesting nearby</Text>
              <Text style={styles.emptySubtitle}>
                Try pinging from a different location, or adjust your preferences.
              </Text>
            </View>
          ) : (
            <FlatList
              data={places}
              keyExtractor={(item) => item.googlePlaceId}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => <PingPlaceCard place={item} />}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function PingPlaceCard({ place }: { place: DiscoveredPlace }) {
  const mainType = place.types[0]?.replace(/_/g, " ") ?? "place";
  const typeIcon = getTypeIcon(place.types[0] ?? "");

  return (
    <View style={styles.card}>
      <View style={styles.cardIconWrap}>
        <Feather name={typeIcon} size={20} color={Colors.gold} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {place.name}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardType}>{mainType}</Text>
          {place.rating !== null && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={10} color={Colors.gold} />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            </View>
          )}
          {place.distanceM > 0 && (
            <Text style={styles.distanceText}>{formatDistance(place.distanceM)}</Text>
          )}
        </View>
        {place.address ? (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {place.address}
          </Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
    </View>
  );
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function getTypeIcon(type: string): React.ComponentProps<typeof Feather>["name"] {
  const map: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
    restaurant: "coffee",
    cafe: "coffee",
    bar: "coffee",
    night_club: "music",
    museum: "archive",
    park: "sun",
    shopping_mall: "shopping-bag",
    gym: "activity",
    library: "book",
    movie_theater: "film",
    tourist_attraction: "camera",
    bakery: "coffee",
    pharmacy: "plus-circle",
  };
  return map[type] ?? "map-pin";
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.goldDark,
    maxHeight: SHEET_HEIGHT,
    minHeight: 200,
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 10,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.goldDark,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  cardType: {
    fontSize: 11,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  distanceText: {
    fontSize: 11,
    color: Colors.info,
    fontFamily: "Inter_400Regular",
  },
  cardAddress: {
    fontSize: 11,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.parchmentDim,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});

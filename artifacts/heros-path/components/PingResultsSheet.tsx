import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
  FlatList,
  Dimensions,
  ScrollView,
  Linking,
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
  const [selectedPlace, setSelectedPlace] = useState<DiscoveredPlace | null>(null);

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
      setSelectedPlace(null);
    }
  }, [visible, translateY]);

  return (
    <>
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
                renderItem={({ item }) => (
                  <PingPlaceCard place={item} onPress={() => setSelectedPlace(item)} />
                )}
              />
            )}
          </Animated.View>
        </View>
      </Modal>

      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </>
  );
}

function PingPlaceCard({
  place,
  onPress,
}: {
  place: DiscoveredPlace;
  onPress: () => void;
}) {
  const mainType = place.types[0]?.replace(/_/g, " ") ?? "place";
  const typeIcon = getTypeIcon(place.types[0] ?? "");

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
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
      <Feather name="chevron-right" size={16} color={Colors.gold} />
    </Pressable>
  );
}

function PlaceDetailModal({
  place,
  onClose,
}: {
  place: DiscoveredPlace;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const typeIcon = getTypeIcon(place.types[0] ?? "");

  function openInMaps() {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.googlePlaceId}`;
    void Linking.openURL(url);
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={detailStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[detailStyles.modal, { paddingBottom: insets.bottom + 16 }]}>
          <View style={detailStyles.iconRow}>
            <View style={detailStyles.iconWrap}>
              <Feather name={typeIcon} size={28} color={Colors.gold} />
            </View>
          </View>

          <Text style={detailStyles.name}>{place.name}</Text>

          <View style={detailStyles.metaRow}>
            {place.rating !== null && (
              <View style={detailStyles.chip}>
                <Feather name="star" size={12} color={Colors.gold} />
                <Text style={detailStyles.chipText}>{place.rating.toFixed(1)}</Text>
              </View>
            )}
            {place.types.slice(0, 3).map((t) => (
              <View key={t} style={detailStyles.chip}>
                <Text style={detailStyles.chipText}>{t.replace(/_/g, " ")}</Text>
              </View>
            ))}
          </View>

          {place.address ? (
            <View style={detailStyles.addressRow}>
              <Feather name="map-pin" size={13} color={Colors.parchmentMuted} />
              <Text style={detailStyles.address}>{place.address}</Text>
            </View>
          ) : null}

          {place.distanceM > 0 && (
            <View style={detailStyles.addressRow}>
              <Feather name="navigation" size={13} color={Colors.parchmentMuted} />
              <Text style={detailStyles.address}>{formatDistance(place.distanceM)} away</Text>
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={detailStyles.actions}
          >
            <Pressable style={detailStyles.actionBtn} onPress={openInMaps}>
              <Feather name="map" size={14} color={Colors.gold} />
              <Text style={detailStyles.actionText}>View on Map</Text>
            </Pressable>
          </ScrollView>

          <Pressable style={detailStyles.closeBtn} onPress={onClose}>
            <Text style={detailStyles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  cardPressed: {
    opacity: 0.75,
    borderColor: Colors.gold,
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

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.goldDark,
    width: "100%",
    maxWidth: 360,
    padding: 20,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.goldGlow,
    borderWidth: 1.5,
    borderColor: Colors.goldDark,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  address: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.goldGlow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.goldDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  closeBtn: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_500Medium",
  },
});

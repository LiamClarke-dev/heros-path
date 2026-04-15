import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";

export interface DiscoveredPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  types: string[];
  primaryType: string | null;
  photoUrl: string | null;
  address: string | null;
  discoveryCount: number;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  isFavorited: boolean;
  isDismissed: boolean;
  isSnoozed: boolean;
}

interface Props {
  place: DiscoveredPlace;
  onFavorite: (id: string, current: boolean) => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string, duration: "1day" | "1week" | "1month") => void;
  onAddToList: (id: string) => void;
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={styles.stars}>
      {Array.from({ length: full }).map((_, i) => (
        <Feather key={`f${i}`} name="star" size={12} color={Colors.gold} />
      ))}
      {half && <Feather name="star" size={12} color={Colors.gold} />}
      {Array.from({ length: empty }).map((_, i) => (
        <Feather key={`e${i}`} name="star" size={12} color={Colors.parchmentDim} />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

export function PlaceCard({ place, onFavorite, onDismiss, onSnooze, onAddToList }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const height = useRef(new Animated.Value(1)).current;

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(height, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start(() => onDismiss(place.googlePlaceId));
  }, [opacity, height, onDismiss, place.googlePlaceId]);

  const handleSnooze = useCallback(() => {
    const options = ["Snooze 1 Day", "Snooze 1 Week", "Snooze 1 Month", "Cancel"] as const;
    const durations = ["1day", "1week", "1month"] as const;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options],
          cancelButtonIndex: 3,
          title: `Snooze "${place.name}"`,
        },
        (idx) => {
          if (idx < 3) onSnooze(place.googlePlaceId, durations[idx]);
        }
      );
    } else {
      Alert.alert(`Snooze "${place.name}"`, "For how long?", [
        { text: "1 Day", onPress: () => onSnooze(place.googlePlaceId, "1day") },
        { text: "1 Week", onPress: () => onSnooze(place.googlePlaceId, "1week") },
        { text: "1 Month", onPress: () => onSnooze(place.googlePlaceId, "1month") },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [place, onSnooze]);

  const typeLabel = place.primaryType
    ? place.primaryType.replace(/_/g, " ")
    : place.types[0]?.replace(/_/g, " ") ?? "";

  return (
    <Animated.View style={[styles.wrapper, { opacity, maxHeight: height.interpolate({ inputRange: [0, 1], outputRange: [0, 400] }) }]}>
      <View style={styles.card}>
        {place.photoUrl ? (
          <Image source={{ uri: place.photoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Feather name="image" size={28} color={Colors.parchmentDim} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
            {place.discoveryCount > 1 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{place.discoveryCount}x</Text>
              </View>
            )}
          </View>

          {typeLabel !== "" && (
            <Text style={styles.type}>{typeLabel}</Text>
          )}

          <RatingStars rating={place.rating} />

          {place.address ? (
            <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onFavorite(place.googlePlaceId, place.isFavorited)}
            >
              <Feather
                name="heart"
                size={18}
                color={place.isFavorited ? Colors.error : Colors.parchmentMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleSnooze}>
              <Feather name="moon" size={18} color={Colors.parchmentMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleDismiss}>
              <Feather name="x-circle" size={18} color={Colors.parchmentMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onAddToList(place.googlePlaceId)}
            >
              <Feather name="plus-square" size={18} color={Colors.parchmentMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    overflow: "hidden",
  },
  photo: {
    width: 90,
    aspectRatio: 1,
  },
  photoPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  name: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.parchment,
  },
  badge: {
    backgroundColor: Colors.goldGlow,
    borderColor: Colors.gold,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.gold,
  },
  type: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
    textTransform: "capitalize",
    marginBottom: 3,
  },
  stars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 3,
  },
  ratingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
    marginLeft: 2,
  },
  address: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentDim,
    marginBottom: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 4,
    marginTop: "auto" as any,
  },
  actionBtn: {
    padding: 6,
  },
});

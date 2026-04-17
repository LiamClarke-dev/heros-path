import React, { useRef, useCallback, useState, useEffect } from "react";
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
  Linking,
  Share,
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
  visitCount: number;
  lastVisitedAt: string | null;
  listIds: string[];
}

interface Props {
  place: DiscoveredPlace;
  onPress: (id: string) => void;
  onFavorite: (id: string, current: boolean) => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string, duration: "1day" | "1week" | "1month") => void;
  onAddToList: (id: string) => void;
  onMarkVisited: (id: string) => void;
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
      {half && <Feather key="h" name="star" size={12} color={Colors.gold} />}
      {Array.from({ length: empty }).map((_, i) => (
        <Feather key={`e${i}`} name="star" size={12} color={Colors.parchmentDim} />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

export function PlaceCard({
  place,
  onPress,
  onFavorite,
  onDismiss,
  onSnooze,
  onAddToList,
  onMarkVisited,
}: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const maxHeight = useRef(new Animated.Value(200)).current;
  const [photoLoaded, setPhotoLoaded] = useState(!place.photoUrl);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (photoLoaded) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [photoLoaded, shimmer]);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: false }),
      Animated.timing(maxHeight, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start(() => onDismiss(place.googlePlaceId));
  }, [opacity, maxHeight, onDismiss, place.googlePlaceId]);

  const handleShare = useCallback(() => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.googlePlaceId}`;
    Share.share({
      title: place.name,
      message: `Check out ${place.name}${place.address ? ` — ${place.address}` : ""}!\n${mapsUrl}`,
      url: mapsUrl,
    }).catch(() => {});
  }, [place]);

  const openMoreMenu = useCallback(() => {
    const mapsUrl =
      Platform.OS === "ios"
        ? `maps://?q=${encodeURIComponent(place.name)}&ll=${place.lat},${place.lng}`
        : `geo:${place.lat},${place.lng}?q=${encodeURIComponent(place.name)}`;

    const options = ["Snooze", "Dismiss", "View on Maps", "Share", "Cancel"] as const;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options], cancelButtonIndex: 4, destructiveButtonIndex: 1, title: place.name },
        (idx) => {
          if (idx === 0) openSnoozeMenu();
          else if (idx === 1) handleDismiss();
          else if (idx === 2) Linking.openURL(mapsUrl).catch(() => {});
          else if (idx === 3) handleShare();
        }
      );
    } else {
      Alert.alert(place.name, undefined, [
        { text: "Snooze", onPress: openSnoozeMenu },
        { text: "Dismiss", style: "destructive", onPress: handleDismiss },
        { text: "View on Maps", onPress: () => Linking.openURL(mapsUrl).catch(() => {}) },
        { text: "Share", onPress: handleShare },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [place, handleDismiss, handleShare]);

  const openSnoozeMenu = useCallback(() => {
    const options = ["Snooze 1 Day", "Snooze 1 Week", "Snooze 1 Month", "Cancel"] as const;
    const durations = ["1day", "1week", "1month"] as const;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options], cancelButtonIndex: 3, title: `Snooze "${place.name}"` },
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
    <Animated.View style={[styles.wrapper, { opacity, maxHeight }]}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => onPress(place.googlePlaceId)}
      >
        {place.photoUrl ? (
          <View style={styles.photo}>
            {!photoLoaded && (
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.photoSkeleton,
                  { opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] }) },
                ]}
              />
            )}
            <Image
              source={{ uri: place.photoUrl }}
              style={[styles.photo, !photoLoaded && { opacity: 0 }]}
              resizeMode="cover"
              onLoad={() => setPhotoLoaded(true)}
            />
          </View>
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Feather name="image" size={28} color={Colors.parchmentDim} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
            <View style={styles.badges}>
              {place.discoveryCount > 1 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{place.discoveryCount}x</Text>
                </View>
              )}
              {place.visitCount > 0 && (
                <View style={styles.visitBadge}>
                  <Feather name="check-circle" size={10} color="#22C55E" />
                  <Text style={styles.visitBadgeText}>
                    Visited{place.visitCount > 1 ? ` ${place.visitCount}x` : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {typeLabel !== "" && (
            <Text style={styles.type}>{typeLabel}</Text>
          )}

          <RatingStars rating={place.rating} />

          {place.address ? (
            <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
          ) : null}

          <View style={styles.spacer} />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, place.isFavorited && styles.actionBtnActive]}
              onPress={() => onFavorite(place.googlePlaceId, place.isFavorited)}
            >
              <Feather
                name="heart"
                size={16}
                color={place.isFavorited ? Colors.error : Colors.parchmentMuted}
              />
              <Text style={[styles.actionLabel, place.isFavorited && { color: Colors.error }]}>
                Fav
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, place.visitCount > 0 && styles.actionBtnVisited]}
              onPress={() => onMarkVisited(place.googlePlaceId)}
            >
              <Feather
                name="check-circle"
                size={16}
                color={place.visitCount > 0 ? "#22C55E" : Colors.parchmentMuted}
              />
              <Text style={[styles.actionLabel, place.visitCount > 0 && { color: "#22C55E" }]}>
                Visited
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, place.listIds?.length > 0 && styles.actionBtnListed]}
              onPress={() => onAddToList(place.googlePlaceId)}
            >
              <Feather
                name={place.listIds?.length > 0 ? "bookmark" : "plus-square"}
                size={16}
                color={place.listIds?.length > 0 ? Colors.gold : Colors.parchmentMuted}
              />
              <Text style={[styles.actionLabel, place.listIds?.length > 0 && { color: Colors.gold }]}>
                {place.listIds?.length > 0 ? `${place.listIds.length} List${place.listIds.length > 1 ? "s" : ""}` : "List"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={openMoreMenu}>
              <Feather name="more-horizontal" size={16} color={Colors.parchmentMuted} />
              <Text style={styles.actionLabel}>More</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
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
  photoSkeleton: {
    backgroundColor: Colors.surface,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.parchment,
    flex: 1,
  },
  badges: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    flexShrink: 0,
  },
  badge: {
    backgroundColor: Colors.goldGlow,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.gold,
  },
  visitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  visitBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#22C55E",
  },
  type: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    textTransform: "capitalize",
    marginBottom: 4,
  },
  stars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 4,
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
  },
  spacer: { flex: 1 },
  actions: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnActive: {
    borderColor: "#ef444440",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  actionBtnVisited: {
    borderColor: "rgba(34,197,94,0.3)",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  actionBtnListed: {
    borderColor: Colors.goldGlow40,
    backgroundColor: Colors.goldGlow10,
  },
  actionLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.parchmentMuted,
  },
});

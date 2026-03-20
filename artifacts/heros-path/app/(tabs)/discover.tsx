import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const REVEAL_WIDTH = 140;
const SWIPE_THRESHOLD = 60;

type PlaceFilter = "all" | "unreviewed" | "favorited" | "snoozed";

interface DiscoveredPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  types: string[];
  address: string | null;
  photoUrl: string | null;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  discoveryCount: number;
  isDismissed: boolean;
  isFavorited: boolean;
  isSnoozed: boolean;
  snoozedUntil: string | null;
}

interface PlaceList {
  id: string;
  name: string;
  isDefault: boolean;
  placeCount: number;
}

function useApiBase() {
  return process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";
}

export default function DiscoverScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<PlaceFilter>("all");
  const [listPickerPlace, setListPickerPlace] = useState<string | null>(null);

  const apiBase = useApiBase();
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["places", filter],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/places/discover?filter=${filter}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch places");
      return res.json() as Promise<{ places: DiscoveredPlace[] }>;
    },
  });

  const { data: listsData } = useQuery({
    queryKey: ["lists"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/lists`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch lists");
      return res.json() as Promise<{ lists: PlaceList[] }>;
    },
    enabled: listPickerPlace != null,
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      googlePlaceId,
      action,
      listId,
      snoozeDays,
    }: {
      googlePlaceId: string;
      action: string;
      listId?: string;
      snoozeDays?: number;
    }) => {
      const res = await fetch(`${apiBase}/places/${googlePlaceId}/action`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action, listId, snoozeDays }),
      });
      if (!res.ok) throw new Error("Action failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: () => Alert.alert("Error", "Action failed. Please try again."),
  });

  const handleAction = useCallback(
    (googlePlaceId: string, action: string, listId?: string, snoozeDays?: number) => {
      actionMutation.mutate({ googlePlaceId, action, listId, snoozeDays });
    },
    [actionMutation],
  );

  const places = data?.places ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discoveries</Text>
        <Text style={styles.subtitle}>{places.length} places</Text>
      </View>

      <View style={styles.filterRow}>
        {(["all", "unreviewed", "favorited", "snoozed"] as PlaceFilter[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.swipeHint}>← Swipe left to snooze/dismiss  ·  Swipe right to favorite →</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : places.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="map-pin" size={48} color={Colors.parchmentDim} />
          <Text style={styles.emptyTitle}>No places here yet</Text>
          <Text style={styles.emptySubtitle}>
            {filter === "snoozed"
              ? "No places are currently snoozed."
              : filter === "favorited"
              ? "Swipe right on a place to favorite it."
              : "Start a journey and use Ping to discover nearby places."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.googlePlaceId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
          renderItem={({ item }) => (
            <SwipeablePlaceCard
              place={item}
              onAction={(action, snoozeDays) => handleAction(item.googlePlaceId, action, undefined, snoozeDays)}
              onAddToList={() => setListPickerPlace(item.googlePlaceId)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <ListPickerModal
        visible={listPickerPlace != null}
        lists={listsData?.lists ?? []}
        onClose={() => setListPickerPlace(null)}
        onSelect={(listId) => {
          if (listPickerPlace) {
            handleAction(listPickerPlace, "add_to_list", listId);
          }
          setListPickerPlace(null);
        }}
      />
    </View>
  );
}

function SwipeablePlaceCard({
  place,
  onAction,
  onAddToList,
}: {
  place: DiscoveredPlace;
  onAction: (action: string, snoozeDays?: number) => void;
  onAddToList: () => void;
}) {
  const translateX = useSharedValue(0);
  const isRevealed = useSharedValue(false);

  const doAction = useCallback(
    (action: string, snoozeDays?: number) => {
      onAction(action, snoozeDays);
    },
    [onAction],
  );

  const snapBack = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20 });
    isRevealed.value = false;
  }, [translateX, isRevealed]);

  const snapToReveal = useCallback(() => {
    translateX.value = withSpring(-REVEAL_WIDTH, { damping: 20 });
    isRevealed.value = true;
  }, [translateX, isRevealed]);

  const triggerFavorite = useCallback(() => {
    doAction(place.isFavorited ? "unfavorite" : "favorite");
    translateX.value = withSpring(0, { damping: 20 });
    isRevealed.value = false;
  }, [doAction, place.isFavorited, translateX, isRevealed]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      if (isRevealed.value) {
        translateX.value = Math.min(0, -REVEAL_WIDTH + e.translationX);
      } else {
        translateX.value = Math.min(80, e.translationX);
      }
    })
    .onEnd((e) => {
      const vel = e.velocityX;
      if (isRevealed.value) {
        if (e.translationX > 50 || vel > 300) {
          runOnJS(snapBack)();
        } else {
          runOnJS(snapToReveal)();
        }
      } else {
        if (e.translationX < -SWIPE_THRESHOLD || vel < -300) {
          runOnJS(snapToReveal)();
        } else if (e.translationX > SWIPE_THRESHOLD || vel > 300) {
          runOnJS(triggerFavorite)();
        } else {
          runOnJS(snapBack)();
        }
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const mainType = place.types[0]?.replace(/_/g, " ") ?? "place";

  return (
    <View style={styles.swipeRow}>
      <View style={styles.revealPanel}>
        <Pressable
          style={[styles.revealBtn, { backgroundColor: Colors.info }]}
          onPress={() => {
            onAction("snooze", 7);
            snapBack();
          }}
        >
          <Feather name="clock" size={16} color="#fff" />
          <Text style={styles.revealBtnText}>7d</Text>
        </Pressable>
        <Pressable
          style={[styles.revealBtn, { backgroundColor: Colors.error }]}
          onPress={() => {
            onAction("dismiss");
            snapBack();
          }}
        >
          <Feather name="x" size={16} color="#fff" />
          <Text style={styles.revealBtnText}>Dismiss</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.cardRow}>
            {place.photoUrl ? (
              <Image source={{ uri: place.photoUrl }} style={styles.cardPhoto} resizeMode="cover" />
            ) : (
              <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder]}>
                <Feather name="image" size={20} color={Colors.parchmentDim} />
              </View>
            )}
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {place.name}
                </Text>
                <View style={styles.statusIcons}>
                  {place.isFavorited && (
                    <Feather name="heart" size={13} color={Colors.gold} />
                  )}
                  {place.isSnoozed && (
                    <Feather name="clock" size={13} color={Colors.info} />
                  )}
                </View>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardType}>{mainType}</Text>
                {place.rating !== null && (
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={10} color={Colors.gold} />
                    <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              {place.address && (
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {place.address}
                </Text>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.discoveryCount}>
                  Found {place.discoveryCount}x
                </Text>
                <View style={styles.inlineActions}>
                  <Pressable style={styles.inlineBtn} onPress={() => {
                    onAction(place.isFavorited ? "unfavorite" : "favorite");
                  }}>
                    <Feather
                      name="heart"
                      size={13}
                      color={place.isFavorited ? Colors.gold : Colors.parchmentDim}
                    />
                  </Pressable>
                  <Pressable style={styles.inlineBtn} onPress={onAddToList}>
                    <Feather name="plus-square" size={13} color={Colors.parchmentDim} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function ListPickerModal({
  visible,
  lists,
  onClose,
  onSelect,
}: {
  visible: boolean;
  lists: PlaceList[];
  onClose: () => void;
  onSelect: (listId: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to List</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={20} color={Colors.parchmentMuted} />
            </Pressable>
          </View>
          {lists.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>No lists yet. Create one in the Lists tab.</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 300 }}>
              {lists.map((list) => (
                <Pressable
                  key={list.id}
                  style={styles.listPickerItem}
                  onPress={() => onSelect(list.id)}
                >
                  <Feather
                    name={list.isDefault ? "heart" : "bookmark"}
                    size={16}
                    color={Colors.gold}
                  />
                  <View style={styles.listPickerItemContent}>
                    <Text style={styles.listPickerItemName}>{list.name}</Text>
                    <Text style={styles.listPickerItemCount}>
                      {list.placeCount} {list.placeCount === 1 ? "place" : "places"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.goldDark,
    borderColor: Colors.gold,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_500Medium",
  },
  filterChipTextActive: {
    color: Colors.gold,
  },
  swipeHint: {
    fontSize: 11,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 10,
    opacity: 0.7,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.parchmentMuted,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.parchmentDim,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  swipeRow: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
  },
  revealPanel: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: REVEAL_WIDTH,
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
  },
  revealBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  revealBtnText: {
    fontSize: 11,
    color: "#fff",
    fontFamily: "Inter_500Medium",
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
  },
  cardPhoto: {
    width: 80,
    height: 90,
    backgroundColor: Colors.surface,
  },
  cardPhotoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  statusIcons: {
    flexDirection: "row",
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardType: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  cardAddress: {
    fontSize: 12,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  discoveryCount: {
    fontSize: 11,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  inlineActions: {
    flexDirection: "row",
    gap: 8,
  },
  inlineBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  modalEmpty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 14,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  listPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listPickerItemContent: { flex: 1 },
  listPickerItemName: {
    fontSize: 15,
    color: Colors.parchment,
    fontFamily: "Inter_500Medium",
  },
  listPickerItemCount: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
});

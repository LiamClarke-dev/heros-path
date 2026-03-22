import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";

interface PlaceInList {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  types: string[];
  address: string | null;
  photoReference: string | null;
  photoUrl: string | null;
}

interface PlaceList {
  id: string;
  name: string;
}

export default function ListDetailScreen() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { listId, name } = useLocalSearchParams<{ listId: string; name: string }>();

  const [moveTarget, setMoveTarget] = useState<PlaceInList | null>(null);
  const [moveModalVisible, setMoveModalVisible] = useState(false);

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["list-places", listId],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/lists/${listId}/places`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch list places");
      return res.json() as Promise<{ places: PlaceInList[] }>;
    },
    enabled: !!listId,
  });

  const { data: listsData } = useQuery({
    queryKey: ["lists"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/lists`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch lists");
      return res.json() as Promise<{ lists: PlaceList[] }>;
    },
  });

  const otherLists = (listsData?.lists ?? []).filter((l) => l.id !== listId);

  const removeFromListMutation = useMutation({
    mutationFn: async (googlePlaceId: string) => {
      const res = await fetch(`${apiBase}/places/${googlePlaceId}/action`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action: "remove_from_list", listId }),
      });
      if (!res.ok) throw new Error("Failed to remove from list");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-places", listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: () => Alert.alert("Error", "Failed to remove place from list."),
  });

  const moveToListMutation = useMutation({
    mutationFn: async ({ googlePlaceId, targetListId }: { googlePlaceId: string; targetListId: string }) => {
      const res = await fetch(`${apiBase}/lists/${listId}/places/${googlePlaceId}/move`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ targetListId }),
      });
      if (!res.ok) throw new Error("Failed to move place");
      return res.json();
    },
    onSuccess: () => {
      setMoveModalVisible(false);
      setMoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["list-places", listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: () => Alert.alert("Error", "Failed to move place to list."),
  });

  function confirmRemove(place: PlaceInList) {
    Alert.alert(
      "Remove Place",
      `Remove "${place.name}" from this list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFromListMutation.mutate(place.googlePlaceId),
        },
      ],
    );
  }

  function openMoveModal(place: PlaceInList) {
    if (otherLists.length === 0) {
      Alert.alert("No Other Lists", "Create another list first to move this place.");
      return;
    }
    setMoveTarget(place);
    setMoveModalVisible(true);
  }

  function handleMove(targetListId: string) {
    if (!moveTarget) return;
    moveToListMutation.mutate({ googlePlaceId: moveTarget.googlePlaceId, targetListId });
  }

  const places = data?.places ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.gold} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {name ?? "List"}
          </Text>
          <Text style={styles.subtitle}>
            {isLoading ? "Loading…" : `${places.length} ${places.length === 1 ? "place" : "places"}`}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : places.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="bookmark" size={48} color={Colors.parchmentDim} />
          <Text style={styles.emptyTitle}>This list is empty</Text>
          <Text style={styles.emptySubtitle}>
            In the Discoveries tab, tap the bookmark icon on any place to add it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.googlePlaceId}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
          renderItem={({ item }) => (
            <PlaceCard
              place={item}
              onRemove={() => confirmRemove(item)}
              onMove={() => openMoveModal(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Move to list modal */}
      <Modal
        visible={moveModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoveModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMoveModalVisible(false)}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.modalTitle}>Move to list</Text>
            <Text style={styles.modalSubtitle} numberOfLines={1}>
              {moveTarget?.name}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {otherLists.map((list) => (
                <TouchableOpacity
                  key={list.id}
                  style={styles.modalListItem}
                  onPress={() => handleMove(list.id)}
                  disabled={moveToListMutation.isPending}
                >
                  <Feather name="list" size={16} color={Colors.gold} />
                  <Text style={styles.modalListName}>{list.name}</Text>
                  {moveToListMutation.isPending && (
                    <ActivityIndicator size="small" color={Colors.gold} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setMoveModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function PlaceCard({
  place,
  onRemove,
  onMove,
}: {
  place: PlaceInList;
  onRemove: () => void;
  onMove: () => void;
}) {
  const mainType = place.types[0]?.replace(/_/g, " ") ?? "place";

  return (
    <View style={styles.card}>
      {place.photoUrl ? (
        <Image source={{ uri: place.photoUrl }} style={styles.cardPhoto} resizeMode="cover" />
      ) : (
        <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder]}>
          <View style={styles.cardColorBar} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{place.name}</Text>
          <View style={styles.cardActions}>
            <Pressable style={styles.actionBtn} onPress={onMove} hitSlop={6}>
              <Feather name="shuffle" size={15} color={Colors.parchmentMuted} />
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={onRemove} hitSlop={6}>
              <Feather name="x" size={16} color={Colors.parchmentDim} />
            </Pressable>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardType}>{mainType}</Text>
          {place.rating !== null && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={11} color={Colors.gold} />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {place.address && (
          <Text style={styles.cardAddress} numberOfLines={1}>{place.address}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardPhoto: {
    width: 72,
    alignSelf: "stretch",
  },
  cardPhotoPlaceholder: {
    backgroundColor: Colors.surface,
  },
  cardColorBar: {
    width: 4,
    height: "100%",
    backgroundColor: Colors.gold,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionBtn: {
    padding: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 4,
  },
  modalListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalListName: {
    fontSize: 16,
    color: Colors.parchment,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_500Medium",
  },
});

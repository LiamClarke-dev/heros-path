import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { VisitLogSheet } from "../../components/VisitLogSheet";

interface ListPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  primaryType: string | null;
  types: string[];
  photoUrl: string | null;
  address: string | null;
  addedAt: string;
}

interface PlaceList {
  id: string;
  name: string;
  emoji: string | null;
}

export default function ListDetailScreen() {
  const insets = useSafeAreaInsets();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [list, setList] = useState<PlaceList | null>(null);
  const [places, setPlaces] = useState<ListPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [logSheetPlace, setLogSheetPlace] = useState<{ id: string; name: string } | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!token || !listId) return;
    setLoading(true);
    try {
      const data: { list: PlaceList; places: ListPlace[] } = await apiFetch(
        `/api/lists/${listId}`,
        { token }
      );
      setList(data.list);
      setPlaces(data.places);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token, listId]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  const handleRemove = useCallback(
    (googlePlaceId: string, name: string) => {
      Alert.alert(
        "Remove Place",
        `Remove "${name}" from this list?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              setPlaces((prev) =>
                prev.filter((p) => p.googlePlaceId !== googlePlaceId)
              );
              try {
                await apiFetch(
                  `/api/lists/${listId}/items/${googlePlaceId}`,
                  { method: "DELETE", token: token! }
                );
              } catch {
                fetchDetail();
              }
            },
          },
        ]
      );
    },
    [listId, token, fetchDetail]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListPlace }) => {
      const typeLabel = item.primaryType
        ? item.primaryType.replace(/_/g, " ")
        : item.types[0]?.replace(/_/g, " ") ?? "";

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => router.push(`/place-detail?googlePlaceId=${item.googlePlaceId}`)}
        >
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Feather name="image" size={24} color={Colors.parchmentDim} />
            </View>
          )}

          <View style={styles.cardContent}>
            <Text style={styles.placeName} numberOfLines={1}>
              {item.name}
            </Text>
            {typeLabel !== "" && (
              <Text style={styles.placeType}>{typeLabel}</Text>
            )}
            {item.rating !== null && (
              <Text style={styles.rating}>★ {item.rating.toFixed(1)}</Text>
            )}
            {item.address ? (
              <Text style={styles.address} numberOfLines={1}>
                {item.address}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionCol}>
            <TouchableOpacity
              style={styles.visitedBtn}
              onPress={() => setLogSheetPlace({ id: item.googlePlaceId, name: item.name })}
            >
              <Feather name="check-circle" size={18} color={Colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(item.googlePlaceId, item.name)}
            >
              <Feather name="trash-2" size={16} color={Colors.parchmentDim} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [handleRemove, router]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <Text style={styles.emoji}>{list?.emoji ?? "📍"}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {list?.name ?? ""}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(p) => p.googlePlaceId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No places yet</Text>
              <Text style={styles.emptySubtitle}>
                Add places from the Discover tab.
              </Text>
            </View>
          }
        />
      )}

      <VisitLogSheet
        visible={logSheetPlace !== null}
        googlePlaceId={logSheetPlace?.id ?? ""}
        placeName={logSheetPlace?.name ?? ""}
        token={token ?? ""}
        onClose={() => setLogSheetPlace(null)}
        onSaved={() => setLogSheetPlace(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 4,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.parchment,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  photo: {
    width: 72,
    height: 72,
  },
  photoPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  placeName: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.parchment,
    marginBottom: 2,
  },
  placeType: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
    textTransform: "capitalize",
    marginBottom: 2,
  },
  rating: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.gold,
    marginBottom: 2,
  },
  address: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentDim,
  },
  actionCol: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 8,
  },
  visitedBtn: {
    padding: 6,
  },
  removeBtn: {
    padding: 6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
  },
});

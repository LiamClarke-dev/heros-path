import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import { VisitLogSheet, VisitRecord } from "../components/VisitLogSheet";

interface VisitItem {
  id: string;
  googlePlaceId: string;
  visitedAt: string;
  reaction: string | null;
  tags: string[];
  notes: string | null;
  name: string;
  primaryType: string | null;
  address: string | null;
  photoUrl: string | null;
}

const REACTION_ICON: Record<string, string> = {
  thumbs_up: "👍",
  thumbs_down: "👎",
  star: "⭐",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function MyVisitsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [logSheetPlace, setLogSheetPlace] = useState<string | null>(null);

  const fetchVisits = useCallback(
    async (pageNum: number, replace = false) => {
      if (!token) return;
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const data: { visits: VisitItem[]; total: number; page: number } = await apiFetch(
          `/api/me/visits?page=${pageNum}&limit=20`,
          { token }
        );
        setTotal(data.total);
        setVisits((prev) => (replace ? data.visits : [...prev, ...data.visits]));
        setHasMore(data.visits.length === 20);
        setPage(pageNum);
      } catch {
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchVisits(1, true);
    }, [fetchVisits])
  );

  const handleEndReached = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchVisits(page + 1);
  }, [hasMore, loadingMore, page, fetchVisits]);

  const renderItem = useCallback(
    ({ item }: { item: VisitItem }) => {
      const typeLabel = item.primaryType?.replace(/_/g, " ") ?? "";
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() =>
            router.push(`/place-detail?googlePlaceId=${item.googlePlaceId}`)
          }
        >
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Feather name="map-pin" size={18} color={Colors.parchmentDim} />
            </View>
          )}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.placeName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.reaction && (
                <Text style={styles.reactionEmoji}>
                  {REACTION_ICON[item.reaction] ?? ""}
                </Text>
              )}
            </View>
            {typeLabel !== "" && (
              <Text style={styles.placeType}>{typeLabel}</Text>
            )}
            {item.address && (
              <Text style={styles.address} numberOfLines={1}>
                {item.address}
              </Text>
            )}
            <Text style={styles.visitDate}>{formatDate(item.visitedAt)}</Text>
            {item.tags.length > 0 && (
              <View style={styles.tagRow}>
                {item.tags.slice(0, 3).map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t.replace(/_/g, " ")}</Text>
                  </View>
                ))}
              </View>
            )}
            {item.notes ? (
              <Text style={styles.notes} numberOfLines={2}>
                {item.notes}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => setLogSheetPlace(item.googlePlaceId)}
          >
            <Feather name="plus-circle" size={18} color={Colors.gold} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <Text style={styles.title}>My Visits</Text>
        {total > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{total}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(v) => v.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={Colors.gold} style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No visits yet</Text>
              <Text style={styles.emptySubtitle}>
                Mark places as visited from the Discover tab or Place Detail screen.
              </Text>
            </View>
          }
        />
      )}

      <VisitLogSheet
        visible={logSheetPlace !== null}
        googlePlaceId={logSheetPlace ?? ""}
        placeName={
          visits.find((v) => v.googlePlaceId === logSheetPlace)?.name ?? ""
        }
        token={token ?? ""}
        onClose={() => setLogSheetPlace(null)}
        onSaved={(_visit: VisitRecord) => {
          setLogSheetPlace(null);
          fetchVisits(1, true);
        }}
      />
    </SafeAreaView>
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
  backBtn: { padding: 4 },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.parchment,
  },
  countBadge: {
    backgroundColor: Colors.goldGlow,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.gold,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  placeName: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.parchment,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  placeType: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
    textTransform: "capitalize",
    marginBottom: 2,
  },
  address: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentDim,
    marginBottom: 2,
  },
  visitDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.gold,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  tag: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.parchmentMuted,
    textTransform: "capitalize",
  },
  notes: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentDim,
    fontStyle: "italic",
  },
  logBtn: {
    padding: 14,
    alignSelf: "center",
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

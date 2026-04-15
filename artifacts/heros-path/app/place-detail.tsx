import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Share,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import { VisitLogSheet, type VisitRecord } from "../components/VisitLogSheet";
import { AddToListSheet } from "../components/AddToListSheet";
import { CreateListSheet } from "../components/CreateListSheet";
import { TAG_BY_KEY } from "../constants/visitTags";

interface PlaceDetail {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  primaryType: string | null;
  types: string[];
  editorialSummary: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  phoneNumber: string | null;
  address: string | null;
  photoUrl: string | null;
  openNow: boolean | null;
  openingHoursText: string[] | null;
}

interface PlaceState {
  isFavorited: boolean;
}

const REACTION_EMOJIS: Record<string, string> = {
  thumbs_up: "👍",
  star: "⭐",
  thumbs_down: "👎",
};

const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

export default function PlaceDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const { googlePlaceId } = useLocalSearchParams<{ googlePlaceId: string }>();

  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [state, setState] = useState<PlaceState>({ isFavorited: false });
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [showVisitSheet, setShowVisitSheet] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [allVisitsExpanded, setAllVisitsExpanded] = useState(false);

  const loadData = useCallback(async () => {
    if (!googlePlaceId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [placeData, visitsData, stateData] = await Promise.all([
        apiFetch(`/api/places/${googlePlaceId}`, { token }) as Promise<PlaceDetail>,
        apiFetch(`/api/places/${googlePlaceId}/visits`, { token }) as Promise<{
          visits: VisitRecord[];
          totalVisits: number;
          lastVisitedAt: string | null;
        }>,
        apiFetch(`/api/places/${googlePlaceId}/state`, { token }).catch(() => ({ isFavorited: false })) as Promise<PlaceState>,
      ]);
      setPlace(placeData);
      setVisits(visitsData.visits);
      setTotalVisits(visitsData.totalVisits);
      setState({ isFavorited: stateData.isFavorited ?? false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load place");
    } finally {
      setLoading(false);
    }
  }, [googlePlaceId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFavorite = useCallback(async () => {
    if (!place) return;
    const current = state.isFavorited;
    setState((s) => ({ ...s, isFavorited: !current }));
    try {
      await apiFetch(`/api/places/${place.googlePlaceId}/state`, {
        method: "POST",
        token: token!,
        body: JSON.stringify({ action: current ? "unfavorite" : "favorite" }),
      });
    } catch {
      setState((s) => ({ ...s, isFavorited: current }));
    }
  }, [place, state, token]);

  const handleShare = useCallback(async () => {
    if (!place) return;
    try {
      await Share.share({
        message: place.googleMapsUri
          ? `Check out ${place.name}! ${place.googleMapsUri}`
          : `Check out ${place.name}!`,
        title: place.name,
      });
    } catch {}
  }, [place]);

  const handleVisitSaved = useCallback((visit: VisitRecord) => {
    setVisits((prev) => [visit, ...prev]);
    setTotalVisits((n) => n + 1);
  }, []);

  const handleDeleteVisit = useCallback(async (visitId: string) => {
    try {
      await apiFetch(`/api/places/visits/${visitId}`, {
        method: "DELETE",
        token: token!,
      });
      setVisits((prev) => prev.filter((v) => v.id !== visitId));
      setTotalVisits((n) => Math.max(0, n - 1));
    } catch {}
  }, [token]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      </View>
    );
  }

  if (error || !place) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <View style={styles.loadingCenter}>
          <Feather name="alert-circle" size={40} color={Colors.error} />
          <Text style={styles.errorText}>{error ?? "Place not found"}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const typeLabel = place.primaryType
    ? place.primaryType.replace(/_/g, " ")
    : place.types[0]?.replace(/_/g, " ") ?? "";

  const priceLabel = place.priceLevel ? PRICE_LABELS[place.priceLevel] ?? null : null;
  const displayVisits = allVisitsExpanded ? visits : visits.slice(0, 3);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero photo */}
        <View style={styles.heroContainer}>
          {place.photoUrl ? (
            <Image source={{ uri: place.photoUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Feather name="image" size={48} color={Colors.parchmentDim} />
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(13,10,11,0.85)"]}
            style={styles.heroGradient}
          />
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={22} color={Colors.parchment} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Name + chips */}
          <View style={styles.titleRow}>
            <Text style={styles.placeName}>{place.name}</Text>
          </View>

          <View style={styles.metaRow}>
            {typeLabel !== "" && (
              <View style={styles.typeChip}>
                <Text style={styles.typeChipText}>{typeLabel}</Text>
              </View>
            )}
            {priceLabel && (
              <View style={styles.typeChip}>
                <Text style={styles.typeChipText}>{priceLabel}</Text>
              </View>
            )}
            {place.openNow !== null && (
              <View style={[styles.typeChip, place.openNow ? styles.openChip : styles.closedChip]}>
                <Text style={[styles.typeChipText, place.openNow ? styles.openText : styles.closedText]}>
                  {place.openNow ? "Open now" : "Closed"}
                </Text>
              </View>
            )}
          </View>

          {place.rating !== null && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={16} color={Colors.gold} />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
              {place.userRatingCount !== null && (
                <Text style={styles.ratingCount}>
                  ({place.userRatingCount.toLocaleString()} reviews)
                </Text>
              )}
            </View>
          )}

          {place.address && (
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={14} color={Colors.parchmentDim} />
              <Text style={styles.addressText}>{place.address}</Text>
            </View>
          )}

          {place.editorialSummary && (
            <Text style={styles.summary}>{place.editorialSummary}</Text>
          )}

          {/* Action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, state.isFavorited && styles.actionButtonFav]}
              onPress={handleFavorite}
            >
              <Feather
                name="heart"
                size={18}
                color={state.isFavorited ? Colors.error : Colors.parchmentMuted}
              />
              <Text style={[styles.actionButtonText, state.isFavorited && { color: Colors.error }]}>
                {state.isFavorited ? "Favorited" : "Favorite"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, totalVisits > 0 && styles.actionButtonVisited]}
              onPress={() => setShowVisitSheet(true)}
            >
              <Feather
                name="check-circle"
                size={18}
                color={totalVisits > 0 ? "#22C55E" : Colors.parchmentMuted}
              />
              <Text style={[styles.actionButtonText, totalVisits > 0 && { color: "#22C55E" }]}>
                {totalVisits > 0 ? `Visited ${totalVisits}x` : "Visit"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowAddToList(true)}
            >
              <Feather name="plus-square" size={18} color={Colors.parchmentMuted} />
              <Text style={styles.actionButtonText}>Add List</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Feather name="share-2" size={18} color={Colors.parchmentMuted} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Opening hours */}
          {place.openingHoursText && place.openingHoursText.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setHoursExpanded((x) => !x)}
                activeOpacity={0.8}
              >
                <Feather name="clock" size={16} color={Colors.gold} />
                <Text style={styles.sectionTitle}>Opening Hours</Text>
                <Feather
                  name={hoursExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.parchmentDim}
                />
              </TouchableOpacity>
              {hoursExpanded && (
                <View style={styles.hoursContent}>
                  {place.openingHoursText.map((line, i) => (
                    <Text key={i} style={styles.hoursLine}>{line}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Links */}
          {(place.websiteUri || place.googleMapsUri) && (
            <View style={styles.linksRow}>
              {place.websiteUri && (
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL(place.websiteUri!).catch(() => {})}
                >
                  <Feather name="globe" size={14} color={Colors.gold} />
                  <Text style={styles.linkText}>Website</Text>
                </TouchableOpacity>
              )}
              {place.googleMapsUri && (
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL(place.googleMapsUri!).catch(() => {})}
                >
                  <Feather name="navigation" size={14} color={Colors.gold} />
                  <Text style={styles.linkText}>Open in Maps</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Your Visits */}
          <View style={styles.section}>
            <View style={styles.visitsHeader}>
              <Feather name="check-circle" size={16} color={Colors.gold} />
              <Text style={styles.sectionTitle}>
                Your Visits{totalVisits > 0 ? ` (${totalVisits})` : ""}
              </Text>
            </View>

            {visits.length === 0 ? (
              <View style={styles.noVisits}>
                <Text style={styles.noVisitsText}>You haven't visited this place yet.</Text>
              </View>
            ) : (
              <>
                {displayVisits.map((v) => (
                  <VisitCard
                    key={v.id}
                    visit={v}
                    onDelete={() => handleDeleteVisit(v.id)}
                  />
                ))}

                {visits.length > 3 && (
                  <TouchableOpacity
                    style={styles.seeAllBtn}
                    onPress={() => setAllVisitsExpanded((x) => !x)}
                  >
                    <Text style={styles.seeAllText}>
                      {allVisitsExpanded
                        ? "Show fewer"
                        : `See all ${totalVisits} visits`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.logVisitBtn}
              onPress={() => setShowVisitSheet(true)}
            >
              <Feather name="plus" size={16} color={Colors.gold} />
              <Text style={styles.logVisitText}>Log a visit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <VisitLogSheet
        visible={showVisitSheet}
        placeName={place.name}
        googlePlaceId={place.googlePlaceId}
        token={token ?? ""}
        onClose={() => setShowVisitSheet(false)}
        onSaved={handleVisitSaved}
      />

      <AddToListSheet
        visible={showAddToList}
        googlePlaceId={place.googlePlaceId}
        onClose={() => setShowAddToList(false)}
        onCreateNew={() => {
          setShowAddToList(false);
          setShowCreateList(true);
        }}
      />

      <CreateListSheet
        visible={showCreateList}
        onClose={() => setShowCreateList(false)}
        onCreate={async (name, emoji) => {
          await apiFetch("/api/lists", {
            method: "POST",
            token: token!,
            body: JSON.stringify({ name, emoji }),
          });
        }}
      />
    </View>
  );
}

function VisitCard({ visit, onDelete }: { visit: VisitRecord; onDelete: () => void }) {
  const date = new Date(visit.visitedAt);
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={visitStyles.card}>
      <View style={visitStyles.topRow}>
        <Text style={visitStyles.emoji}>
          {visit.reaction ? (REACTION_EMOJIS[visit.reaction] ?? "📍") : "📍"}
        </Text>
        <Text style={visitStyles.date}>{dateStr}</Text>
        <TouchableOpacity onPress={onDelete} style={visitStyles.deleteBtn}>
          <Feather name="trash-2" size={13} color={Colors.parchmentDim} />
        </TouchableOpacity>
      </View>

      {visit.tags.length > 0 && (
        <View style={visitStyles.tags}>
          {visit.tags.map((key) => {
            const tag = TAG_BY_KEY.get(key);
            return tag ? (
              <View key={key} style={visitStyles.tag}>
                <Text style={visitStyles.tagText}>{tag.emoji} {tag.label}</Text>
              </View>
            ) : null;
          })}
        </View>
      )}

      {visit.notes && (
        <Text style={visitStyles.notes} numberOfLines={2}>{visit.notes}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  heroContainer: {
    height: 240,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 240,
  },
  heroPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    top: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(13,10,11,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  titleRow: { marginBottom: 8 },
  placeName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.parchment,
    lineHeight: 30,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    textTransform: "capitalize",
  },
  openChip: { borderColor: "#22C55E40", backgroundColor: "rgba(34,197,94,0.1)" },
  closedChip: { borderColor: "#ef444440", backgroundColor: "rgba(239,68,68,0.08)" },
  openText: { color: "#22C55E" },
  closedText: { color: Colors.error },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.parchment,
  },
  ratingCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    flex: 1,
  },
  summary: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    lineHeight: 21,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonFav: {
    borderColor: "#ef444440",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  actionButtonVisited: {
    borderColor: "rgba(34,197,94,0.3)",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  actionButtonText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.parchmentMuted,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  visitsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.parchment,
    flex: 1,
  },
  hoursContent: { marginTop: 10, gap: 3 },
  hoursLine: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  linksRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  linkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.goldGlow,
  },
  linkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.gold,
  },
  noVisits: { paddingVertical: 8 },
  noVisitsText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentDim,
  },
  seeAllBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  seeAllText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.gold,
  },
  logVisitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gold,
    marginTop: 8,
  },
  logVisitText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.gold,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.gold,
  },
});

const visitStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  emoji: { fontSize: 20 },
  date: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.parchmentMuted,
    flex: 1,
  },
  deleteBtn: { padding: 4 },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
  },
  notes: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    fontStyle: "italic",
    lineHeight: 18,
  },
});

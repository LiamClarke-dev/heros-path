import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  LayoutAnimation,
  UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import type { MapViewProps, MapMarkerProps, MapPolylineProps } from "react-native-maps";

let MapView: React.ComponentClass<MapViewProps> | null = null;
let Marker: React.ComponentType<MapMarkerProps> | null = null;
let Polyline: React.ComponentType<MapPolylineProps> | null = null;
try {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
} catch {}

interface JourneyPlace {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  primaryType: string | null;
  photoUrl: string | null;
  address: string | null;
}

interface XpBreakdown {
  newCells: number;
  revisitCells: number;
  newPlaces: number;
  completedQuests: Array<{ key: string; title: string; xpReward: number }>;
  newBadges: Array<{ key: string; name: string; description: string; icon: string }>;
}

interface JourneyDetail {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  totalDistanceM: number | null;
  xpEarned: number;
  pingCount: number;
  discoveryStatus: string;
  waypoints: Array<{ lat: number; lng: number }>;
  snappedRoute: Array<{ lat: number; lng: number }> | null;
  places: JourneyPlace[];
  placeCount: number;
  xpBreakdown: XpBreakdown | null;
}

function formatDurationSeconds(s: number | null): string {
  if (s === null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return "<1 min";
}

function formatDistance(m: number | null): string {
  if (m === null) return "—";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatType(type: string | null): string {
  if (!type) return "Place";
  return type
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function PlaceThumbnail({ place }: { place: JourneyPlace }) {
  return (
    <View style={styles.placeThumb}>
      {place.photoUrl ? (
        <Image source={{ uri: place.photoUrl }} style={styles.placePhoto} resizeMode="cover" />
      ) : (
        <View style={[styles.placePhoto, styles.placePhotoPlaceholder]}>
          <Feather name="compass" size={22} color={Colors.parchmentDim} />
        </View>
      )}
      <View style={styles.placeThumbInfo}>
        <Text style={styles.placeName} numberOfLines={2}>{place.name}</Text>
        <Text style={styles.placeType}>{formatType(place.primaryType)}</Text>
        {place.rating != null && (
          <View style={styles.ratingRow}>
            <Feather name="star" size={11} color={Colors.gold} />
            <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function XpBreakdownSection({ breakdown, xpEarned }: { breakdown: XpBreakdown; xpEarned: number }) {
  const [expanded, setExpanded] = useState(false);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }

  const rows: Array<{ emoji: string; label: string; xp: number }> = [];
  if (breakdown.newCells > 0) {
    rows.push({ emoji: "🗺️", label: `${breakdown.newCells} new street${breakdown.newCells !== 1 ? "s" : ""} × 10 XP`, xp: breakdown.newCells * 10 });
  }
  if (breakdown.revisitCells > 0) {
    rows.push({ emoji: "🔄", label: `${breakdown.revisitCells} revisited street${breakdown.revisitCells !== 1 ? "s" : ""} × 3 XP`, xp: breakdown.revisitCells * 3 });
  }
  if (breakdown.newPlaces > 0) {
    rows.push({ emoji: "📍", label: `${breakdown.newPlaces} new place${breakdown.newPlaces !== 1 ? "s" : ""} × 25 XP`, xp: breakdown.newPlaces * 25 });
  }
  for (const quest of breakdown.completedQuests) {
    rows.push({ emoji: "⚡", label: `Quest: ${quest.title}`, xp: quest.xpReward });
  }

  return (
    <View style={styles.xpSection}>
      <TouchableOpacity style={styles.xpSectionHeader} onPress={toggle} activeOpacity={0.8}>
        <Feather name="zap" size={16} color={Colors.gold} />
        <Text style={styles.xpSectionTitle}>XP Earned</Text>
        <Text style={styles.xpSectionTotal}>+{xpEarned} XP</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.parchmentDim} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.xpSectionBody}>
          {rows.length === 0 ? (
            <Text style={styles.xpNoBreakdown}>No XP breakdown available</Text>
          ) : (
            <>
              {rows.map((row, i) => (
                <View key={i} style={styles.xpRow}>
                  <Text style={styles.xpRowEmoji}>{row.emoji}</Text>
                  <Text style={styles.xpRowLabel} numberOfLines={1}>{row.label}</Text>
                  <Text style={styles.xpRowValue}>+{row.xp} XP</Text>
                </View>
              ))}
              <View style={styles.xpDivider} />
              <View style={styles.xpRow}>
                <Text style={styles.xpRowEmoji}></Text>
                <Text style={[styles.xpRowLabel, styles.xpTotalLabel]}>Total</Text>
                <Text style={[styles.xpRowValue, styles.xpTotalValue]}>+{xpEarned} XP</Text>
              </View>
            </>
          )}

          {breakdown.newBadges.length > 0 && (
            <View style={styles.newBadgesSection}>
              <Text style={styles.newBadgesTitle}>Badges Unlocked</Text>
              {breakdown.newBadges.map((badge) => (
                <View key={badge.key} style={styles.newBadgeRow}>
                  <Text style={styles.newBadgeIcon}>{badge.icon}</Text>
                  <View style={styles.newBadgeInfo}>
                    <Text style={styles.newBadgeName}>{badge.name}</Text>
                    <Text style={styles.newBadgeDesc}>{badge.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function JourneyDetailScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const router = useRouter();
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>();

  const [journey, setJourney] = useState<JourneyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const fetchJourney = useCallback(async () => {
    if (!token || !journeyId) return;
    try {
      const data = (await apiFetch(`/api/journeys/${journeyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })) as JourneyDetail;
      setJourney(data);
    } catch (err) {
      console.warn("[JourneyDetail] fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [token, journeyId]);

  useEffect(() => {
    fetchJourney();
  }, [fetchJourney]);

  async function handleRetryDiscovery() {
    if (!token || !journeyId || retrying) return;
    setRetrying(true);
    setRetryMsg(null);
    try {
      const result = (await apiFetch(`/api/journeys/${journeyId}/discover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })) as { newPlaces?: number; xpGained?: number; discoveryStatus?: string };
      const newPlaces = result.newPlaces ?? 0;
      const xpGained = result.xpGained ?? 0;
      setRetryMsg(
        newPlaces > 0
          ? `${newPlaces} new place${newPlaces !== 1 ? "s" : ""} found! +${xpGained} XP`
          : "No new places found along this route."
      );
      await fetchJourney();
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status: number }).status
          : 0;
      if (status === 409) {
        await fetchJourney();
      } else {
        setRetryMsg("Retry failed — check your connection.");
      }
    } finally {
      setRetrying(false);
    }
  }

  function openRenameModal() {
    if (!journey) return;
    setRenameValue(journey.name);
    setRenameModalOpen(true);
  }

  function closeRenameModal() {
    setRenameModalOpen(false);
    setRenameValue("");
    setRenaming(false);
  }

  async function submitRename() {
    if (!journey || !token || renaming) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setRenaming(true);
    try {
      await apiFetch(`/api/journeys/${journey.id}/rename`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      setJourney((prev) => (prev ? { ...prev, name: trimmed } : prev));
      closeRenameModal();
    } catch (err) {
      console.warn("[JourneyDetail] rename failed", err);
      setRenaming(false);
    }
  }

  // Compute map region from snappedRoute if available, else raw waypoints
  const mapRegion = useCallback(() => {
    if (!journey) return null;
    const pts = journey.snappedRoute ?? journey.waypoints;
    if (pts.length === 0) return null;
    const lats = pts.map((w) => w.lat);
    const lngs = pts.map((w) => w.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padding = 0.002;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + padding * 2, 0.005),
      longitudeDelta: Math.max(maxLng - minLng + padding * 2, 0.005),
    };
  }, [journey]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={["top"]}>
        <ActivityIndicator color={Colors.gold} />
      </SafeAreaView>
    );
  }

  if (!journey) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={["top"]}>
        <Text style={styles.errorText}>Journey not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const region = mapRegion();

  const showRetryBanner = journey.places.length === 0;

  const isFailedOrPending =
    journey.discoveryStatus === "failed" || journey.discoveryStatus === "pending";
  const retryBannerTitle = isFailedOrPending
    ? "Place discovery didn't complete"
    : "No places found";
  const retryBannerSubtitle = isFailedOrPending
    ? "Tap below to find places from this route."
    : "No places found — tap to retry discovery.";

  const routePoints = journey.snappedRoute ?? journey.waypoints;
  const polylineCoords = routePoints.map((w) => ({ latitude: w.lat, longitude: w.lng }));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerName} numberOfLines={1}>{journey.name}</Text>
            <TouchableOpacity
              onPress={openRenameModal}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.editBtn}
            >
              <Feather name="edit-2" size={14} color={Colors.parchmentDim} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerDate}>{formatDate(journey.startedAt)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Map */}
        <View style={styles.mapContainer}>
          {MapView && region ? (
            <MapView
              style={styles.map}
              initialRegion={region}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              customMapStyle={Colors.mapDark}
            >
              {Polyline && polylineCoords.length > 1 && (
                <Polyline
                  coordinates={polylineCoords}
                  strokeColor={Colors.gold}
                  strokeWidth={3}
                />
              )}
              {Marker &&
                journey.places.map((p) => (
                  <Marker
                    key={p.googlePlaceId}
                    coordinate={{ latitude: p.lat, longitude: p.lng }}
                    pinColor={Colors.gold}
                    title={p.name}
                  />
                ))}
            </MapView>
          ) : (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <Feather name="map" size={40} color={Colors.parchmentDim} />
              <Text style={styles.mapPlaceholderText}>Map unavailable</Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { icon: "navigation" as const, label: formatDistance(journey.totalDistanceM) },
            { icon: "clock" as const, label: formatDurationSeconds(journey.durationSeconds) },
            { icon: "compass" as const, label: `${journey.placeCount} places` },
            { icon: "zap" as const, label: `+${journey.xpEarned} XP` },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Feather name={s.icon} size={16} color={Colors.gold} />
              <Text style={styles.statText}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* XP Breakdown */}
        {journey.xpBreakdown && (
          <XpBreakdownSection breakdown={journey.xpBreakdown} xpEarned={journey.xpEarned} />
        )}

        {/* Discovery retry banner */}
        {showRetryBanner && (
          <View style={styles.retryBanner}>
            <View style={styles.retryBannerHeader}>
              <Feather name="alert-triangle" size={16} color={Colors.gold} />
              <Text style={styles.retryBannerTitle}>{retryBannerTitle}</Text>
            </View>
            <Text style={styles.retryBannerSubtitle}>{retryBannerSubtitle}</Text>
            {retryMsg && (
              <Text style={[styles.retryMsg, retryMsg.includes("failed") && styles.retryMsgError]}>
                {retryMsg}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.retryBtn, retrying && styles.retryBtnDisabled]}
              onPress={handleRetryDiscovery}
              disabled={retrying}
            >
              {retrying ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Text style={styles.retryBtnText}>Retry Discovery</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Success/info message for after retry */}
        {retryMsg && !showRetryBanner && (
          <View style={styles.infoToast}>
            <Feather name="check-circle" size={14} color={Colors.success} />
            <Text style={styles.infoToastText}>{retryMsg}</Text>
          </View>
        )}

        {/* Discovered places */}
        {journey.places.length > 0 && (
          <View style={styles.placesSection}>
            <Text style={styles.sectionTitle}>
              Discovered Places{" "}
              <Text style={styles.sectionCount}>({journey.places.length})</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.placesScroll}
            >
              {journey.places.map((p) => (
                <PlaceThumbnail key={p.googlePlaceId} place={p} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Rename Modal */}
      <Modal
        visible={renameModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeRenameModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rename Journey</Text>
            <TextInput
              style={styles.modalInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Journey name"
              placeholderTextColor={Colors.parchmentDim}
              maxLength={120}
              autoFocus
              onSubmitEditing={submitRename}
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeRenameModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, (!renameValue.trim() || renaming) && styles.modalSaveDisabled]}
                onPress={submitRename}
                disabled={!renameValue.trim() || renaming}
              >
                {renaming ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.parchment,
    flex: 1,
  },
  editBtn: {
    padding: 2,
  },
  headerDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
  },
  mapContainer: {
    width: "100%",
    height: 240,
    backgroundColor: Colors.card,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapPlaceholderText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentDim,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.parchment,
  },
  retryBanner: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: 16,
    gap: 8,
  },
  retryBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryBannerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.parchment,
    flex: 1,
  },
  retryBannerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  retryMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.success,
  },
  retryMsgError: {
    color: Colors.error,
  },
  retryBtn: {
    alignSelf: "flex-end",
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 140,
    alignItems: "center",
  },
  retryBtnDisabled: {
    opacity: 0.6,
  },
  retryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.background,
  },
  infoToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: "rgba(74,155,94,0.12)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  infoToastText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.success,
    flex: 1,
  },
  placesSection: {
    gap: 10,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.parchment,
    paddingHorizontal: 16,
  },
  sectionCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
  },
  placesScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  placeThumb: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  placePhoto: {
    width: "100%",
    height: 90,
    backgroundColor: Colors.card,
  },
  placePhotoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeThumbInfo: {
    padding: 10,
    gap: 3,
  },
  placeName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.parchment,
    lineHeight: 16,
  },
  placeType: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.gold,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.parchmentMuted,
  },
  backBtnFull: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    width: "100%",
    gap: 16,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
  },
  modalInput: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.parchment,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  modalCancel: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.parchmentMuted,
  },
  modalSave: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.gold,
    minWidth: 80,
    alignItems: "center",
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.background,
  },
  xpSection: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  xpSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
  },
  xpSectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.parchment,
    flex: 1,
  },
  xpSectionTotal: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.gold,
  },
  xpSectionBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  xpRowEmoji: {
    fontSize: 14,
    width: 22,
    textAlign: "center",
  },
  xpRowLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  xpRowValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.parchment,
    minWidth: 60,
    textAlign: "right",
  },
  xpDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  xpTotalLabel: {
    fontFamily: "Inter_700Bold",
    color: Colors.parchment,
    fontSize: 13,
  },
  xpTotalValue: {
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
    fontSize: 14,
  },
  xpNoBreakdown: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    textAlign: "center",
    paddingVertical: 8,
  },
  newBadgesSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    gap: 8,
  },
  newBadgesTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.gold,
  },
  newBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(212,160,23,0.08)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(212,160,23,0.3)",
  },
  newBadgeIcon: {
    fontSize: 22,
  },
  newBadgeInfo: {
    flex: 1,
    gap: 2,
  },
  newBadgeName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.parchment,
  },
  newBadgeDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
  },
});

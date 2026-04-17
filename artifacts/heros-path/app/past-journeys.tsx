import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";

interface JourneySummary {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  totalDistanceM: number | null;
  placeCount: number;
  xpEarned: number;
  discoveryStatus: string;
  staticMapUrl: string | null;
}

function formatDurationSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
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
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface JourneyCardProps {
  item: JourneySummary;
  onPress: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function JourneyCard({ item, onPress, onRename, onDelete }: JourneyCardProps) {
  function handleMenuPress() {
    Alert.alert(item.name, undefined, [
      { text: "Rename", onPress: onRename },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete Journey", "Are you sure you want to delete this journey? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: onDelete },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {item.staticMapUrl ? (
        <Image
          source={{ uri: item.staticMapUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Feather name="map" size={28} color={Colors.parchmentDim} />
          <Text style={styles.thumbnailPlaceholderText}>Map preview not available</Text>
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity
            onPress={handleMenuPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.menuBtn}
          >
            <Feather name="more-vertical" size={16} color={Colors.parchmentDim} />
          </TouchableOpacity>
        </View>
        <Text style={styles.dateText}>{formatDate(item.startedAt)}</Text>
        <Text style={styles.durationText}>{formatDurationSeconds(item.durationSeconds)}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Feather name="navigation" size={12} color={Colors.gold} />
            <Text style={styles.badgeText}>{formatDistance(item.totalDistanceM)}</Text>
          </View>
          <View style={styles.badge}>
            <Feather name="compass" size={12} color={Colors.gold} />
            <Text style={styles.badgeText}>
              {item.placeCount} {item.placeCount === 1 ? "place" : "places"}
            </Text>
          </View>
          {item.xpEarned > 0 && (
            <View style={[styles.badge, styles.xpBadge]}>
              <Text style={styles.xpBadgeText}>+{item.xpEarned} XP</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={[styles.thumbnail, styles.skeleton]} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { width: "60%" }]} />
        <View style={[styles.skeletonLine, { width: "40%", marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: "80%", marginTop: 8 }]} />
      </View>
    </View>
  );
}

export default function PastJourneysScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [renameTarget, setRenameTarget] = useState<JourneySummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const fetchJourneys = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = (await apiFetch("/api/journeys", {
          headers: { Authorization: `Bearer ${token}` },
        })) as { journeys: JourneySummary[] };
        setJourneys(data.journeys);
      } catch (err) {
        console.warn("[PastJourneys] fetch failed", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchJourneys();
    }, [fetchJourneys])
  );

  function openRename(item: JourneySummary) {
    setRenameTarget(item);
    setRenameValue(item.name);
  }

  function closeRename() {
    setRenameTarget(null);
    setRenameValue("");
    setRenaming(false);
  }

  async function submitRename() {
    if (!renameTarget || !token || renaming) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setRenaming(true);
    try {
      await apiFetch(`/api/journeys/${renameTarget.id}/rename`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      setJourneys((prev) =>
        prev.map((j) => (j.id === renameTarget.id ? { ...j, name: trimmed } : j))
      );
      closeRename();
    } catch (err) {
      console.warn("[PastJourneys] rename failed", err);
      setRenaming(false);
    }
  }

  async function handleDelete(journeyId: string) {
    if (!token) return;
    try {
      await apiFetch(`/api/journeys/${journeyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setJourneys((prev) => prev.filter((j) => j.id !== journeyId));
    } catch (err) {
      console.warn("[PastJourneys] delete failed", err);
      Alert.alert("Error", "Could not delete the journey. Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={Colors.parchment} />
        </TouchableOpacity>
        <Text style={styles.title}>Past Journeys</Text>
      </View>

      {loading ? (
        <View style={styles.listContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={journeys}
          keyExtractor={(j) => j.id}
          renderItem={({ item }) => (
            <JourneyCard
              item={item}
              onPress={() => router.push(`/journey-detail?journeyId=${item.id}`)}
              onRename={() => openRename(item)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchJourneys(true)}
              tintColor={Colors.gold}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="map" size={48} color={Colors.parchmentDim} />
              <Text style={styles.emptyTitle}>No journeys yet</Text>
              <Text style={styles.emptySubtitle}>
                Start exploring to create your first journey!
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={renameTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={closeRename}
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
              <TouchableOpacity style={styles.modalCancel} onPress={closeRename}>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.parchment,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.card,
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  thumbnailPlaceholderText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentDim,
  },
  cardBody: {
    padding: 14,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  nameText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.parchment,
    flex: 1,
  },
  menuBtn: {
    padding: 2,
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  durationText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.parchment,
  },
  xpBadge: {
    backgroundColor: Colors.goldGlow15,
    borderColor: Colors.gold,
  },
  xpBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.gold,
  },
  skeletonCard: {
    overflow: "hidden",
  },
  skeleton: {
    backgroundColor: Colors.card,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: Colors.card,
    borderRadius: 6,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
    textAlign: "center",
    paddingHorizontal: 32,
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
});

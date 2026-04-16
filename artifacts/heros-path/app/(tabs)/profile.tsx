import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  TextInput,
  Alert,
  ActionSheetIOS,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import Colors from "../../constants/colors";

const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  (process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "http://localhost:8080");

const LAST_LEVEL_KEY = "@heros_path/last_known_level";

interface Stats {
  xp: number;
  level: number;
  rankName: string;
  streakDays: number;
  displayName: string;
  email: string | null;
  profileImageUrl: string | null;
  xpCurrentLevel: number;
  xpNextLevel: number;
  totalJourneys: number;
  totalPlaces: number;
  totalStreetsWalked: number;
  totalDistanceM: number;
  joinedAt: string | null;
  suburbsCompleted?: number;
  // A7 contract field names (also provided by API)
  currentStreak?: number;
  longestStreak?: number;
  totalNewCells?: number;
}

interface BadgeItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
  progress: { progress: number; target: number } | null;
}

interface QuestItem {
  key: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  isCompleted: boolean;
  completedAt: string | null;
}

function Avatar({ name, imageUrl, size = 64 }: { name: string; imageUrl?: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const containerStyle = [styles.avatar, { width: size, height: size, borderRadius: size / 2 }];
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[...containerStyle, styles.avatarImage]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={containerStyle}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
        {initials || "A"}
      </Text>
    </View>
  );
}

function XpBar({ current, min, max }: { current: number; min: number; max: number }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const fillAnim = useRef(new Animated.Value(0)).current;
  const ratio = max > min ? Math.min((current - min) / (max - min), 1) : 0;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: ratio,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  return (
    <View
      style={styles.xpBarOuter}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.xpBarFill,
          {
            width: containerWidth > 0
              ? fillAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, containerWidth],
                })
              : 0,
          },
        ]}
      />
    </View>
  );
}

function formatEarnedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function BadgeGridItem({ badge, earned }: { badge: BadgeItem; earned: boolean }) {
  const prog = badge.progress;
  const showProgress = !earned && prog != null && prog.target > 1;
  const progressRatio = showProgress ? Math.min(prog.progress / prog.target, 1) : 0;

  return (
    <View style={[styles.badgeGridItem, !earned && styles.badgeGridItemLocked]}>
      <View style={styles.badgeIconContainer}>
        <Text style={styles.badgeGridIcon}>{badge.icon}</Text>
        {!earned && (
          <View style={styles.badgeLockOverlay}>
            <Feather name="lock" size={12} color={Colors.parchmentMuted} />
          </View>
        )}
        {earned && (
          <View style={styles.badgeEarnedOverlay}>
            <Feather name="check" size={10} color={Colors.background} />
          </View>
        )}
      </View>
      <Text style={[styles.badgeGridName, !earned && styles.badgeGridNameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
      <Text style={styles.badgeGridDesc} numberOfLines={2}>{badge.description}</Text>
      {earned && badge.earnedAt && (
        <Text style={styles.badgeEarnedDate}>{formatEarnedDate(badge.earnedAt)}</Text>
      )}
      {showProgress && (
        <View style={styles.badgeProgressContainer}>
          <View style={styles.badgeProgressBar}>
            <View style={[styles.badgeProgressFill, { width: `${Math.round(progressRatio * 100)}%` as `${number}%` }]} />
          </View>
          <Text style={styles.badgeProgressText}>{prog?.progress}/{prog?.target}</Text>
        </View>
      )}
    </View>
  );
}

function formatDistanceM(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${m} m`;
}

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, logout, updateProfile, applyAuthResponse } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [badges, setBadges] = useState<{ earned: BadgeItem[]; available: BadgeItem[] } | null>(null);
  const [quests, setQuests] = useState<{ active: QuestItem[]; completed: QuestItem[] } | null>(null);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [leveledUp, setLeveledUp] = useState(false);
  const [xpInfoVisible, setXpInfoVisible] = useState(false);
  const [visitSummary, setVisitSummary] = useState<{
    total: number;
    recent: Array<{ googlePlaceId: string; name: string; photoUrl: string | null; reaction: string | null }>;
  } | null>(null);

  const [editNameVisible, setEditNameVisible] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const rankAnim = useRef(new Animated.Value(1)).current;

  function triggerRankUpAnimation() {
    setLeveledUp(true);
    Animated.sequence([
      Animated.timing(rankAnim, { toValue: 1.25, duration: 200, useNativeDriver: true }),
      Animated.timing(rankAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(rankAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(rankAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setLeveledUp(false), 4000);
  }

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [statsData, badgesData, questsData, visitsData] = await Promise.all([
        apiFetch("/api/me/stats", { headers: { Authorization: `Bearer ${token}` } }) as Promise<Stats>,
        apiFetch("/api/badges", { headers: { Authorization: `Bearer ${token}` } }) as Promise<{
          earned: BadgeItem[];
          available: BadgeItem[];
        }>,
        apiFetch("/api/quests", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null) as Promise<{
          active: QuestItem[];
          completed: QuestItem[];
        } | null>,
        apiFetch("/api/me/visits?limit=3&sort=recent", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null) as Promise<{
          visits: Array<{ googlePlaceId: string; name: string; photoUrl: string | null; reaction: string | null }>;
          total: number;
        } | null>,
      ]);
      setStats(statsData);
      setBadges(badgesData);
      if (questsData) setQuests(questsData);
      if (visitsData) {
        setVisitSummary({ total: visitsData.total, recent: visitsData.visits });
      }

      const lastLevelStr = await AsyncStorage.getItem(LAST_LEVEL_KEY).catch(() => null);
      const lastLevel = lastLevelStr ? parseInt(lastLevelStr, 10) : null;
      if (lastLevel !== null && statsData.level > lastLevel) {
        triggerRankUpAnimation();
      }
      await AsyncStorage.setItem(LAST_LEVEL_KEY, String(statsData.level)).catch(() => {});
      apiFetch("/api/friends", { token })
        .then((fd: unknown) => {
          const count = (fd as { friends: unknown[] }).friends?.length ?? 0;
          setFriendCount(count);
        })
        .catch(() => {});
    } catch (err) {
      console.warn("[Profile] loadData failed", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAvatarPress = useCallback(() => {
    const options = ["Take Photo", "Choose from Library", "Remove Photo", "Cancel"];
    const cancelIdx = 3;
    const destructiveIdx = 2;

    const handleChoice = async (idx: number) => {
      if (idx === cancelIdx) return;

      if (idx === destructiveIdx) {
        try {
          await updateProfile({ profileImageUrl: null });
          setStats((prev) => prev ? { ...prev, profileImageUrl: null } : prev);
        } catch {
          Alert.alert("Error", "Failed to remove photo. Please try again.");
        }
        return;
      }

      const pickerFn = idx === 0
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

      const permResult = idx === 0
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permResult.granted) {
        Alert.alert("Permission Required", "Please allow access to continue.");
        return;
      }

      const result = await pickerFn({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setUploadingAvatar(true);
      try {
        const formData = new FormData();
        formData.append("avatar", {
          uri: asset.uri,
          name: "avatar.jpg",
          type: asset.mimeType ?? "image/jpeg",
        } as unknown as Blob);

        const res = await fetch(`${API_BASE}/api/profile/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Upload failed");
        }

        const data = (await res.json()) as {
          profileImageUrl: string;
          token: string;
          user: { id: string; email: string | null; displayName: string; xp: number; level: number; profileImageUrl: string | null };
        };

        await applyAuthResponse({ token: data.token, user: data.user });
        setStats((prev) =>
          prev ? { ...prev, profileImageUrl: data.profileImageUrl } : prev
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        Alert.alert("Upload Failed", msg);
      } finally {
        setUploadingAvatar(false);
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIdx, destructiveButtonIndex: destructiveIdx },
        handleChoice
      );
    } else {
      Alert.alert("Change Profile Photo", undefined, [
        { text: "Take Photo", onPress: () => handleChoice(0) },
        { text: "Choose from Library", onPress: () => handleChoice(1) },
        { text: "Remove Photo", style: "destructive", onPress: () => handleChoice(2) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [token, updateProfile, applyAuthResponse]);

  const handleSaveName = useCallback(async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert("Invalid Name", "Display name cannot be empty.");
      return;
    }
    setSavingName(true);
    try {
      await updateProfile({ displayName: trimmed });
      setStats((prev) => prev ? { ...prev, displayName: trimmed } : prev);
      setEditNameVisible(false);
    } catch {
      Alert.alert("Error", "Failed to update display name. Please try again.");
    } finally {
      setSavingName(false);
    }
  }, [nameInput, updateProfile]);

  if (loading || !stats) {
    return (
      <SafeAreaView style={styles.loader} edges={['top']}>
        <ActivityIndicator color={Colors.gold} />
      </SafeAreaView>
    );
  }

  const xpIntoLevel = stats.xp - stats.xpCurrentLevel;
  const xpNeeded = stats.xpNextLevel - stats.xpCurrentLevel;
  const allBadges: Array<{ badge: BadgeItem; earned: boolean }> = [
    ...(badges?.earned.map((b) => ({ badge: b, earned: true })) ?? []),
    ...(badges?.available.map((b) => ({ badge: b, earned: false })) ?? []),
  ];

  return (
    <SafeAreaView style={styles.scrollView} edges={['top']}>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Profile</Text>

      <View style={styles.heroCard}>
        <TouchableOpacity
          onPress={handleAvatarPress}
          activeOpacity={0.8}
          style={styles.avatarWrapper}
          disabled={uploadingAvatar}
        >
          <Avatar name={stats.displayName} imageUrl={stats.profileImageUrl} size={72} />
          <View style={styles.avatarEditBadge}>
            {uploadingAvatar
              ? <ActivityIndicator size="small" color={Colors.background} />
              : <Feather name="camera" size={13} color={Colors.background} />
            }
          </View>
        </TouchableOpacity>
        <View style={styles.heroInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.heroName} numberOfLines={1}>{stats.displayName}</Text>
            <TouchableOpacity
              onPress={() => {
                setNameInput(stats.displayName);
                setEditNameVisible(true);
              }}
              style={styles.editNameBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="edit-2" size={14} color={Colors.parchmentMuted} />
            </TouchableOpacity>
          </View>
          {stats.email ? (
            <Text style={styles.heroEmail}>{stats.email}</Text>
          ) : null}
          <Animated.View
            style={[styles.rankBadge, { transform: [{ scale: rankAnim }] }]}
          >
            <Feather name="award" size={14} color={Colors.gold} />
            <Text style={styles.rankText}>{stats.rankName}</Text>
            {leveledUp && (
              <View style={styles.rankUpPill}>
                <Text style={styles.rankUpText}>Level Up!</Text>
              </View>
            )}
          </Animated.View>
        </View>
      </View>

      <Modal
        visible={editNameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNameVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Display Name</Text>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your display name"
              placeholderTextColor={Colors.parchmentMuted}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditNameVisible(false)}
                disabled={savingName}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, savingName && styles.modalBtnDisabled]}
                onPress={handleSaveName}
                disabled={savingName}
              >
                {savingName
                  ? <ActivityIndicator size="small" color={Colors.background} />
                  : <Text style={styles.modalSaveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpLabel}>Level {stats.level}</Text>
          <View style={styles.xpHeaderRight}>
            <Text style={styles.xpNumbers}>
              {stats.xp.toLocaleString()} XP
            </Text>
            <TouchableOpacity
              onPress={() => setXpInfoVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.xpInfoBtn}
            >
              <Feather name="info" size={14} color={Colors.parchmentDim} />
            </TouchableOpacity>
          </View>
        </View>
        <XpBar current={stats.xp} min={stats.xpCurrentLevel} max={stats.xpNextLevel} />
        <Text style={styles.xpCaption}>
          {xpIntoLevel}/{xpNeeded} XP to Level {stats.level + 1}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: "Journeys", value: stats.totalJourneys.toLocaleString(), icon: "map" as const },
          { label: "Places Found", value: stats.totalPlaces.toLocaleString(), icon: "compass" as const },
          { label: "Distance", value: formatDistanceM(stats.totalDistanceM), icon: "navigation" as const },
          { label: "Day Streak", value: stats.streakDays.toLocaleString(), icon: "zap" as const },
          { label: "Suburbs Completed", value: (stats.suburbsCompleted ?? 0).toLocaleString(), icon: "map-pin" as const },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Feather name={stat.icon} size={18} color={Colors.gold} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.navCard}
        onPress={() => router.push("/past-journeys")}
        activeOpacity={0.8}
      >
        <Feather name="clock" size={18} color={Colors.gold} />
        <Text style={styles.navCardText}>View All Journeys</Text>
        <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navCard}
        onPress={() => router.push("/friends" as never)}
        activeOpacity={0.8}
      >
        <Feather name="users" size={18} color={Colors.gold} />
        <Text style={styles.navCardText}>Friends</Text>
        {friendCount !== null && friendCount > 0 && (
          <Text style={styles.navCardBadge}>{friendCount}</Text>
        )}
        <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navCard}
        onPress={() => router.push("/settings")}
        activeOpacity={0.8}
      >
        <Feather name="settings" size={18} color={Colors.parchmentMuted} />
        <Text style={styles.navCardText}>Settings</Text>
        <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
      </TouchableOpacity>

      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>My Activity</Text>
        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push("/my-visits")}
          activeOpacity={0.8}
        >
          <Feather name="check-square" size={18} color={Colors.gold} />
          <Text style={styles.navCardText}>
            My Visits
            {visitSummary !== null && visitSummary.total > 0
              ? ` · ${visitSummary.total}`
              : ""}
          </Text>
          <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
        </TouchableOpacity>
        {visitSummary && visitSummary.recent.length > 0 && (
          <View style={styles.recentVisits}>
            {visitSummary.recent.map((v, idx) => (
              <TouchableOpacity
                key={`${v.googlePlaceId}-${idx}`}
                style={styles.recentVisitChip}
                onPress={() => router.push(`/place-detail?googlePlaceId=${v.googlePlaceId}`)}
                activeOpacity={0.8}
              >
                {v.photoUrl ? (
                  <Image source={{ uri: v.photoUrl }} style={styles.recentVisitPhoto} />
                ) : (
                  <View style={[styles.recentVisitPhoto, styles.recentVisitPhotoFallback]}>
                    <Feather name="map-pin" size={12} color={Colors.parchmentDim} />
                  </View>
                )}
                <Text style={styles.recentVisitName} numberOfLines={1}>{v.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {allBadges.length > 0 && (
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>
            Badges{" "}
            <Text style={styles.sectionCount}>
              {badges?.earned.length ?? 0}/{allBadges.length}
            </Text>
          </Text>
          <View style={styles.badgeGrid}>
            {allBadges.map(({ badge, earned }) => (
              <BadgeGridItem key={badge.key} badge={badge} earned={earned} />
            ))}
          </View>
        </View>
      )}

      {quests && (quests.active.length > 0 || quests.completed.length > 0) && (
        <View style={styles.questsSection}>
          <Text style={styles.sectionTitle}>
            Quests{" "}
            <Text style={styles.sectionCount}>{quests.completed.length} completed</Text>
          </Text>
          {quests.active.map((quest) => {
            const ratio = quest.target > 0 ? Math.min(quest.progress / quest.target, 1) : 0;
            return (
              <View key={quest.key} style={styles.questCard}>
                <View style={styles.questHeader}>
                  <Text style={styles.questTitle}>{quest.title}</Text>
                  <Text style={styles.questXp}>+{quest.xpReward} XP</Text>
                </View>
                <Text style={styles.questDesc}>{quest.description}</Text>
                <View style={styles.questProgressRow}>
                  <View style={styles.questProgressBar}>
                    <View style={[styles.questProgressFill, { width: `${Math.round(ratio * 100)}%` as `${number}%` }]} />
                  </View>
                  <Text style={styles.questProgressText}>{quest.progress}/{quest.target}</Text>
                </View>
              </View>
            );
          })}
          {quests.active.length === 0 && (
            <Text style={styles.questEmptyText}>All quests completed — check back soon!</Text>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
        <Feather name="log-out" size={16} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>

    <Modal
      visible={xpInfoVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setXpInfoVisible(false)}
    >
      <TouchableOpacity
        style={styles.xpModalOverlay}
        activeOpacity={1}
        onPress={() => setXpInfoVisible(false)}
      >
        <TouchableOpacity activeOpacity={1} style={styles.xpModalBox}>
          <View style={styles.xpModalHeader}>
            <Feather name="zap" size={18} color={Colors.gold} />
            <Text style={styles.xpModalTitle}>How XP Works</Text>
            <TouchableOpacity onPress={() => setXpInfoVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={Colors.parchmentDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.xpModalRows}>
            {[
              { emoji: "🗺️", label: "Walk a new street", value: "+10 XP" },
              { emoji: "🔄", label: "Revisit a street", value: "+3 XP" },
              { emoji: "📍", label: "Discover a new place", value: "+25 XP" },
              { emoji: "⚡", label: "Complete a quest", value: "+30–90 XP" },
              { emoji: "🏅", label: "Unlock a badge", value: "bonus XP" },
              { emoji: "🔥", label: "Daily streak bonus", value: "+20% XP" },
            ].map((row) => (
              <View key={row.label} style={styles.xpModalRow}>
                <Text style={styles.xpModalEmoji}>{row.emoji}</Text>
                <Text style={styles.xpModalLabel}>{row.label}</Text>
                <Text style={styles.xpModalValue}>{row.value}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.xpModalFormula}>
            Level = √(Total XP ÷ 100) + 1
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.parchment,
    marginBottom: 4,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    backgroundColor: "rgba(212,160,23,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    color: Colors.gold,
  },
  avatarImage: {
    backgroundColor: Colors.border,
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
  },
  heroEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    flexWrap: "wrap",
  },
  rankText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.gold,
  },
  rankUpPill: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  rankUpText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: Colors.background,
  },
  xpCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 8,
  },
  xpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.parchment,
  },
  xpNumbers: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.gold,
  },
  xpBarOuter: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 4,
  },
  xpCaption: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
    textAlign: "right",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.parchment,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
    textAlign: "center",
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  navCardText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.parchment,
  },
  navCardBadge: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.gold,
    marginRight: 4,
  },
  activitySection: {
    gap: 10,
  },
  recentVisits: {
    flexDirection: "row",
    gap: 8,
  },
  recentVisitChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    minWidth: 0,
  },
  recentVisitPhoto: {
    width: "100%",
    height: 60,
  },
  recentVisitPhotoFallback: {
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  recentVisitName: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.parchmentMuted,
    padding: 6,
  },
  badgesSection: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.parchment,
  },
  sectionCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeGridItem: {
    width: "47%",
    backgroundColor: "rgba(212,160,23,0.1)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: 12,
    gap: 6,
    alignItems: "center",
  },
  badgeGridItemLocked: {
    opacity: 0.3,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  badgeIconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeGridIcon: {
    fontSize: 28,
  },
  badgeLockOverlay: {
    position: "absolute",
    bottom: -4,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeGridName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.parchment,
    textAlign: "center",
  },
  badgeGridNameLocked: {
    color: Colors.parchmentMuted,
  },
  badgeGridDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.parchmentMuted,
    textAlign: "center",
    lineHeight: 14,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.error,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  xpHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  xpInfoBtn: {
    padding: 2,
  },
  badgeEarnedOverlay: {
    position: "absolute",
    bottom: -4,
    right: -8,
    backgroundColor: Colors.gold,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.background,
  },
  badgeProgressContainer: {
    width: "100%",
    gap: 3,
  },
  badgeProgressBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  badgeProgressFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  badgeProgressText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.parchmentDim,
    textAlign: "right",
  },
  badgeEarnedDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.gold,
    textAlign: "center",
  },
  xpModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  xpModalBox: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    width: "100%",
    gap: 16,
  },
  xpModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  xpModalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.parchment,
    flex: 1,
  },
  xpModalRows: {
    gap: 10,
  },
  xpModalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  xpModalEmoji: {
    fontSize: 16,
    width: 24,
    textAlign: "center",
  },
  xpModalLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.parchmentMuted,
  },
  xpModalValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.gold,
  },
  xpModalFormula: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.parchmentDim,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  questsSection: {
    gap: 10,
  },
  questCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  questHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  questTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.parchment,
    flex: 1,
  },
  questXp: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.gold,
  },
  questDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.parchmentMuted,
  },
  questProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  questProgressFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  questProgressText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.parchmentMuted,
    minWidth: 36,
    textAlign: "right",
  },
  questEmptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.parchmentMuted,
    textAlign: "center",
    paddingVertical: 8,
  },
  editNameBtn: {
    padding: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.parchment,
    textAlign: "center",
  },
  nameInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.parchment,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  modalCancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.parchmentMuted,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    alignItems: "center",
  },
  modalSaveText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.background,
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },
});

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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import Colors from "../../constants/colors";

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
    <View style={styles.xpBarOuter}>
      <Animated.View
        style={[
          styles.xpBarFill,
          {
            width: fillAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

function BadgeGridItem({ badge, earned }: { badge: BadgeItem; earned: boolean }) {
  return (
    <View style={[styles.badgeGridItem, !earned && styles.badgeGridItemLocked]}>
      <View style={styles.badgeIconContainer}>
        <Text style={styles.badgeGridIcon}>{badge.icon}</Text>
        {!earned && (
          <View style={styles.badgeLockOverlay}>
            <Feather name="lock" size={12} color={Colors.parchmentMuted} />
          </View>
        )}
      </View>
      <Text style={[styles.badgeGridName, !earned && styles.badgeGridNameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
      {earned && (
        <Text style={styles.badgeGridDesc} numberOfLines={2}>{badge.description}</Text>
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
  const { token, logout } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [badges, setBadges] = useState<{ earned: BadgeItem[]; available: BadgeItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [leveledUp, setLeveledUp] = useState(false);

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
      const [statsData, badgesData] = await Promise.all([
        apiFetch("/api/me/stats", { headers: { Authorization: `Bearer ${token}` } }) as Promise<Stats>,
        apiFetch("/api/badges", { headers: { Authorization: `Bearer ${token}` } }) as Promise<{
          earned: BadgeItem[];
          available: BadgeItem[];
        }>,
      ]);
      setStats(statsData);
      setBadges(badgesData);

      const lastLevelStr = await AsyncStorage.getItem(LAST_LEVEL_KEY).catch(() => null);
      const lastLevel = lastLevelStr ? parseInt(lastLevelStr, 10) : null;
      if (lastLevel !== null && statsData.level > lastLevel) {
        triggerRankUpAnimation();
      }
      await AsyncStorage.setItem(LAST_LEVEL_KEY, String(statsData.level)).catch(() => {});
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

  if (loading || !stats) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  const xpIntoLevel = stats.xp - stats.xpCurrentLevel;
  const xpNeeded = stats.xpNextLevel - stats.xpCurrentLevel;
  const allBadges: Array<{ badge: BadgeItem; earned: boolean }> = [
    ...(badges?.earned.map((b) => ({ badge: b, earned: true })) ?? []),
    ...(badges?.available.map((b) => ({ badge: b, earned: false })) ?? []),
  ];

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Profile</Text>

      <View style={styles.heroCard}>
        <Avatar name={stats.displayName} imageUrl={stats.profileImageUrl} size={72} />
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{stats.displayName}</Text>
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

      <View style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpLabel}>Level {stats.level}</Text>
          <Text style={styles.xpNumbers}>
            {stats.xp.toLocaleString()} XP
          </Text>
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
        onPress={() => router.push("/settings")}
        activeOpacity={0.8}
      >
        <Feather name="settings" size={18} color={Colors.parchmentMuted} />
        <Text style={styles.navCardText}>Settings</Text>
        <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
      </TouchableOpacity>

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

      <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
        <Feather name="log-out" size={16} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
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
});

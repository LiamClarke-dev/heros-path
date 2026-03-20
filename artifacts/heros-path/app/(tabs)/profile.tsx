import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

interface ProfileStats {
  totalJourneys: number;
  totalDistanceM: number;
  totalPlacesDiscovered: number;
  totalFavorited: number;
  totalStreetsExplored: number;
  currentStreak: number;
  xp: number;
  level: number;
  rank: string;
  xpToNextLevel: number;
  levelProgress: number;
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
  expiresAt: string | null;
  type: string;
}

interface BadgeItem {
  key: string;
  name: string;
  description: string;
  iconName: string;
  isEarned: boolean;
  earnedAt: string | null;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const RANK_COLORS: Record<string, string> = {
  Wanderer: "#A08060",
  Scout: "#8BC34A",
  Pathfinder: "#29B6F6",
  Trailblazer: "#AB47BC",
  Cartographer: "#FF7043",
  Legend: Colors.gold,
};

const FEATHER_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  map: "map",
  activity: "activity",
  "map-pin": "map-pin",
  search: "search",
  star: "star",
  moon: "moon",
  globe: "globe",
  "trending-up": "trending-up",
  award: "award",
  zap: "zap",
  radio: "radio",
};

export default function ProfileScreen() {
  const { user, signOut, token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/profile/stats`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json() as Promise<ProfileStats>;
    },
    enabled: !!token,
  });

  const { data: questsData, isLoading: questsLoading } = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/quests`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch quests");
      return res.json() as Promise<{ active: QuestItem[]; completed: QuestItem[] }>;
    },
    enabled: !!token,
  });

  const { data: badgesData } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/me/badges`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch badges");
      return res.json() as Promise<{ badges: BadgeItem[] }>;
    },
    enabled: !!token,
  });

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }

  const levelProgress = stats?.levelProgress ?? 0;
  const activeQuests = questsData?.active ?? [];
  const completedQuests = (questsData?.completed ?? []).slice(0, 5);
  const earnedBadges = (badgesData?.badges ?? []).filter((b) => b.isEarned);
  const lockedBadges = (badgesData?.badges ?? []).filter((b) => !b.isEarned);
  const rank = stats?.rank ?? user?.rank ?? "Wanderer";
  const rankColor = RANK_COLORS[rank] ?? Colors.gold;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero card */}
      <LinearGradient
        colors={[Colors.surface, Colors.background]}
        style={styles.heroCard}
      >
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={32} color={Colors.gold} />
          </View>
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.displayName}>{user?.displayName ?? "Adventurer"}</Text>
          <View style={styles.rankRow}>
            <Feather name="shield" size={14} color={rankColor} />
            <Text style={[styles.rankText, { color: rankColor }]}>{rank}</Text>
            <Text style={styles.levelText}>Lv. {stats?.level ?? user?.level ?? 1}</Text>
          </View>
          <View style={styles.streakRow}>
            <Feather name="zap" size={12} color={Colors.gold} />
            <Text style={styles.streakText}>
              {stats?.currentStreak ?? 0}-day streak
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* XP Bar */}
      {statsLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <>
          <View style={styles.xpSection}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>{stats?.xp ?? 0} XP</Text>
              <Text style={styles.xpNextLabel}>
                {stats?.xpToNextLevel ?? 0} XP to Level {(stats?.level ?? 1) + 1}
              </Text>
            </View>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.round(levelProgress * 100)}%` }]} />
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatCard icon="compass" label="Journeys" value={`${stats?.totalJourneys ?? 0}`} color={Colors.gold} />
            <StatCard icon="navigation" label="Distance" value={formatDistance(stats?.totalDistanceM ?? 0)} color={Colors.info} />
            <StatCard icon="map-pin" label="Places" value={`${stats?.totalPlacesDiscovered ?? 0}`} color="#AB47BC" />
            <StatCard icon="activity" label="Streets" value={`${stats?.totalStreetsExplored ?? 0}`} color="#8BC34A" />
          </View>
        </>
      )}

      {/* Active Quests */}
      <Section title="Active Quests" icon="flag">
        {questsLoading ? (
          <ActivityIndicator color={Colors.gold} style={{ marginTop: 8 }} />
        ) : activeQuests.length === 0 ? (
          <Text style={styles.emptyText}>No active quests. Go on a journey!</Text>
        ) : (
          activeQuests.map((q) => <QuestCard key={q.key} quest={q} />)
        )}
      </Section>

      {/* Badges — earned */}
      <Section title="Badges" icon="award">
        {badgesData?.badges.length === 0 ? (
          <Text style={styles.emptyText}>Complete journeys to earn badges</Text>
        ) : (
          <>
            {earnedBadges.length > 0 && (
              <>
                <Text style={styles.badgeSectionLabel}>Earned</Text>
                <View style={styles.badgeGrid}>
                  {earnedBadges.map((b) => (
                    <BadgeTile key={b.key} badge={b} />
                  ))}
                </View>
              </>
            )}
            {lockedBadges.length > 0 && (
              <>
                <Text style={[styles.badgeSectionLabel, { marginTop: earnedBadges.length > 0 ? 12 : 0 }]}>
                  Locked
                </Text>
                <View style={styles.badgeGrid}>
                  {lockedBadges.map((b) => (
                    <BadgeTile key={b.key} badge={b} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </Section>

      {/* Recently completed quests */}
      {completedQuests.length > 0 && (
        <Section title="Completed Quests" icon="check-circle">
          {completedQuests.map((q) => (
            <CompletedQuestRow key={q.key} quest={q} />
          ))}
        </Section>
      )}

      {/* Journey History */}
      <Section title="Journey History" icon="compass">
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/past-journeys")}
        >
          <Feather name="map" size={16} color={Colors.gold} />
          <Text style={styles.menuItemText}>Past Journeys</Text>
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeText}>{stats?.totalJourneys ?? 0}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
        </Pressable>
      </Section>

      {/* Settings */}
      <Section title="Settings" icon="sliders">
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/settings/preferences")}
        >
          <Feather name="map-pin" size={16} color={Colors.gold} />
          <Text style={styles.menuItemText}>Discovery Preferences</Text>
          <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
        </Pressable>
      </Section>

      {__DEV__ && (
        <Section title="Dev Tools" icon="settings">
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push("/dev/simulate")}
          >
            <Feather name="play-circle" size={16} color={Colors.info} />
            <Text style={[styles.menuItemText, { color: Colors.info }]}>Simulate Journey</Text>
            <Feather name="chevron-right" size={16} color={Colors.parchmentDim} />
          </Pressable>
        </Section>
      )}

      <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
        <Feather name="log-out" size={16} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Feather name={icon} size={14} color={Colors.gold} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Feather name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuestCard({ quest }: { quest: QuestItem }) {
  const pct = Math.min(1, quest.progress / quest.target);
  const isWeekly = quest.type === "weekly";
  return (
    <View style={styles.questCard}>
      <View style={styles.questHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.questTitle}>{quest.title}</Text>
          {isWeekly && quest.expiresAt && (
            <Text style={styles.questExpiry}>Resets {formatDate(quest.expiresAt)}</Text>
          )}
        </View>
        <Text style={styles.questXp}>+{quest.xpReward} XP</Text>
      </View>
      <Text style={styles.questDesc}>{quest.description}</Text>
      <View style={styles.questProgressRow}>
        <View style={styles.questBar}>
          <View style={[styles.questFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <Text style={styles.questProgressText}>
          {quest.progress}/{quest.target}
        </Text>
      </View>
    </View>
  );
}

function CompletedQuestRow({ quest }: { quest: QuestItem }) {
  return (
    <View style={styles.completedQuestRow}>
      <Feather name="check-circle" size={14} color={Colors.gold} />
      <View style={{ flex: 1 }}>
        <Text style={styles.completedQuestTitle}>{quest.title}</Text>
        {quest.completedAt && (
          <Text style={styles.completedQuestDate}>Completed {formatDate(quest.completedAt)}</Text>
        )}
      </View>
      <Text style={styles.completedQuestXp}>+{quest.xpReward} XP</Text>
    </View>
  );
}

function BadgeTile({ badge }: { badge: BadgeItem }) {
  const iconName = FEATHER_ICONS[badge.iconName] ?? "award";
  return (
    <View style={[styles.badgeTile, !badge.isEarned && styles.badgeTileLocked]}>
      <View style={[styles.badgeIconBg, !badge.isEarned && styles.badgeIconBgLocked]}>
        <Feather
          name={badge.isEarned ? iconName : "lock"}
          size={18}
          color={badge.isEarned ? Colors.gold : Colors.parchmentDim}
        />
      </View>
      <Text style={[styles.badgeTileName, !badge.isEarned && styles.badgeTileNameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
      {badge.isEarned && badge.earnedAt && (
        <Text style={styles.badgeTileDate}>{formatDate(badge.earnedAt)}</Text>
      )}
      {!badge.isEarned && (
        <Text style={styles.badgeTileDesc} numberOfLines={2}>{badge.description}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, gap: 16 },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: Colors.gold },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.goldDark,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInfo: { flex: 1, gap: 4 },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rankText: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: "Inter_600SemiBold",
  },
  levelText: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  loadingRow: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  xpSection: { gap: 8 },
  xpLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpLabel: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: "Inter_600SemiBold",
  },
  xpNextLabel: {
    fontSize: 12,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  xpBar: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  xpFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.parchment,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    paddingVertical: 4,
  },
  questCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  questHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
  },
  questExpiry: {
    fontSize: 11,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  questXp: {
    fontSize: 12,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  questDesc: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  questProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questBar: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  questFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  questProgressText: {
    fontSize: 11,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
    minWidth: 30,
    textAlign: "right",
  },
  completedQuestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  completedQuestTitle: {
    fontSize: 13,
    color: Colors.parchment,
    fontFamily: "Inter_500Medium",
  },
  completedQuestDate: {
    fontSize: 11,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
  },
  completedQuestXp: {
    fontSize: 12,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  badgeSectionLabel: {
    fontSize: 12,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeTile: {
    width: "30%",
    minWidth: 90,
    flex: 1,
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.goldDark,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 6,
  },
  badgeTileLocked: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  badgeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(212,160,23,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIconBgLocked: {
    backgroundColor: "rgba(160,128,96,0.1)",
  },
  badgeTileName: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.gold,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  badgeTileNameLocked: {
    color: Colors.parchmentDim,
  },
  badgeTileDate: {
    fontSize: 10,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  badgeTileDesc: {
    fontSize: 10,
    color: Colors.parchmentDim,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.parchment,
    fontFamily: "Inter_500Medium",
  },
  statBadge: {
    backgroundColor: Colors.goldDark,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statBadgeText: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 14,
    color: Colors.error,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});

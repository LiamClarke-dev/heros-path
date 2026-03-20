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
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

interface ProfileStats {
  totalJourneys: number;
  totalDistanceM: number;
  totalPlacesDiscovered: number;
  totalFavorited: number;
  currentStreak: number;
  xp: number;
  level: number;
  rank: string;
  xpToNextLevel: number;
}

interface QuestItem {
  key: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  isCompleted: boolean;
}

interface BadgeItem {
  key: string;
  name: string;
  description: string;
  isEarned: boolean;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function ProfileScreen() {
  const { user, signOut, token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:3000/api";

  const authHeaders = { Authorization: `Bearer ${token}` };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/profile/stats`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json() as Promise<ProfileStats>;
    },
    enabled: !!token,
  });

  const { data: questsData } = useQuery({
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

  const xpPercent = stats
    ? Math.min(1, (stats.xp % 150) / 150)
    : 0;

  const activeQuests = questsData?.active.slice(0, 3) ?? [];
  const earnedBadges = badgesData?.badges.filter((b) => b.isEarned) ?? [];
  const lockedBadges = badgesData?.badges.filter((b) => !b.isEarned).slice(0, 3) ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
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
            <Feather name="shield" size={14} color={Colors.gold} />
            <Text style={styles.rankText}>{stats?.rank ?? user?.rank ?? "Wanderer"}</Text>
            <Text style={styles.levelText}>Level {stats?.level ?? user?.level ?? 1}</Text>
          </View>
        </View>
      </LinearGradient>

      {statsLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : (
        <>
          <View style={styles.xpSection}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>
                {stats?.xp ?? 0} XP
              </Text>
              <Text style={styles.xpNextLabel}>
                {stats?.xpToNextLevel ?? 150} to next level
              </Text>
            </View>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.round(xpPercent * 100)}%` }]} />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard icon="compass" label="Journeys" value={`${stats?.totalJourneys ?? 0}`} />
            <StatCard icon="navigation" label="Distance" value={formatDistance(stats?.totalDistanceM ?? 0)} />
            <StatCard icon="map-pin" label="Discovered" value={`${stats?.totalPlacesDiscovered ?? 0}`} />
            <StatCard icon="zap" label="Streak" value={`${stats?.currentStreak ?? 0}d`} />
          </View>
        </>
      )}

      {activeQuests.length > 0 && (
        <Section title="Active Quests" icon="flag">
          {activeQuests.map((q) => (
            <QuestCard key={q.key} quest={q} />
          ))}
        </Section>
      )}

      {(earnedBadges.length > 0 || lockedBadges.length > 0) && (
        <Section title="Badges" icon="award">
          <View style={styles.badgeGrid}>
            {earnedBadges.map((b) => (
              <BadgeChip key={b.key} badge={b} />
            ))}
            {lockedBadges.map((b) => (
              <BadgeChip key={b.key} badge={b} />
            ))}
          </View>
        </Section>
      )}

      {__DEV__ && (
        <Section title="Dev Tools" icon="settings">
          <Pressable
            style={styles.devButton}
            onPress={() => router.push("/dev/simulate")}
          >
            <Feather name="play-circle" size={16} color={Colors.info} />
            <Text style={styles.devButtonText}>Simulate Journey</Text>
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
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <Feather name={icon} size={18} color={Colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuestCard({ quest }: { quest: QuestItem }) {
  const pct = Math.min(1, quest.progress / quest.target);
  return (
    <View style={styles.questCard}>
      <View style={styles.questHeader}>
        <Text style={styles.questTitle}>{quest.title}</Text>
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

function BadgeChip({ badge }: { badge: BadgeItem }) {
  return (
    <View style={[styles.badgeChip, !badge.isEarned && styles.badgeChipLocked]}>
      <Feather
        name={badge.isEarned ? "award" : "lock"}
        size={16}
        color={badge.isEarned ? Colors.gold : Colors.parchmentDim}
      />
      <Text style={[styles.badgeName, !badge.isEarned && styles.badgeNameLocked]}>
        {badge.name}
      </Text>
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
  heroInfo: { flex: 1 },
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
    marginTop: 4,
  },
  rankText: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  levelText: {
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
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
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
    alignItems: "center",
  },
  questTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.parchment,
    fontFamily: "Inter_600SemiBold",
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
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: "hidden",
  },
  questFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  questProgressText: {
    fontSize: 11,
    color: Colors.parchmentMuted,
    fontFamily: "Inter_400Regular",
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.goldDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeChipLocked: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  badgeName: {
    fontSize: 12,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  badgeNameLocked: {
    color: Colors.parchmentDim,
  },
  devButton: {
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
  devButtonText: {
    flex: 1,
    fontSize: 14,
    color: Colors.info,
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

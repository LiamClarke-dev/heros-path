export interface VisitTag {
  key: string;
  label: string;
  emoji: string;
}

export const VISIT_TAGS: { positive: VisitTag[]; negative: VisitTag[]; neutral: VisitTag[] } = {
  positive: [
    { key: "great_food",      label: "Great food",       emoji: "🍽️" },
    { key: "great_coffee",    label: "Great coffee",     emoji: "☕" },
    { key: "cozy_atmosphere", label: "Cozy atmosphere",  emoji: "🛋️" },
    { key: "great_views",     label: "Great views",      emoji: "🏔️" },
    { key: "hidden_gem",      label: "Hidden gem",       emoji: "💎" },
    { key: "would_return",    label: "Would return",     emoji: "🔄" },
    { key: "great_service",   label: "Great service",    emoji: "⭐" },
    { key: "good_value",      label: "Good value",       emoji: "💰" },
    { key: "lively_vibe",     label: "Lively vibe",      emoji: "🎉" },
    { key: "great_for_dates", label: "Great for dates",  emoji: "❤️" },
  ],
  negative: [
    { key: "overpriced",      label: "Overpriced",       emoji: "💸" },
    { key: "slow_service",    label: "Slow service",     emoji: "🐌" },
    { key: "disappointing",   label: "Disappointing",    emoji: "😕" },
    { key: "too_crowded",     label: "Too crowded",      emoji: "🫷" },
    { key: "poor_quality",    label: "Poor quality",     emoji: "👎" },
    { key: "not_worth_it",    label: "Not worth it",     emoji: "❌" },
  ],
  neutral: [
    { key: "good_for_work",       label: "Good for work",      emoji: "💻" },
    { key: "bring_a_friend",      label: "Bring a friend",     emoji: "👥" },
    { key: "unique_experience",   label: "Unique experience",  emoji: "🦄" },
    { key: "instagrammable",      label: "Instagrammable",     emoji: "📸" },
  ],
};

export const ALL_TAG_KEYS = new Set([
  ...VISIT_TAGS.positive.map((t) => t.key),
  ...VISIT_TAGS.negative.map((t) => t.key),
  ...VISIT_TAGS.neutral.map((t) => t.key),
]);

export const TAG_BY_KEY = new Map<string, VisitTag>(
  [...VISIT_TAGS.positive, ...VISIT_TAGS.negative, ...VISIT_TAGS.neutral].map((t) => [t.key, t])
);

export function orderedTagGroups(reaction: string | null): Array<{ title: string; tags: VisitTag[] }> {
  const groups = [
    { title: "Positive", tags: VISIT_TAGS.positive },
    { title: "Negative", tags: VISIT_TAGS.negative },
    { title: "Other",    tags: VISIT_TAGS.neutral },
  ];
  if (reaction === "thumbs_down") {
    return [groups[1], groups[0], groups[2]];
  }
  return groups;
}

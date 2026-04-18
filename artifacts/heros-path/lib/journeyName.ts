const JOURNEY_ACTIVITIES = ["Walk", "Expedition", "Stroll", "Adventure"];

export function defaultJourneyName(startedAt: Date | string): string {
  const d = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const hour = d.getHours();
  let prefix: string;
  if (hour >= 5 && hour < 12) prefix = "Morning";
  else if (hour >= 12 && hour < 17) prefix = "Afternoon";
  else if (hour >= 17 && hour < 21) prefix = "Evening";
  else prefix = "Night";

  const activity = JOURNEY_ACTIVITIES[hour % JOURNEY_ACTIVITIES.length];

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${prefix} ${activity} · ${timeStr}`;
}

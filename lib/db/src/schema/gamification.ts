import {
  pgTable,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const userBadges = pgTable(
  "user_badges",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeKey: text("badge_key").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("user_badges_user_badge_unique").on(t.userId, t.badgeKey)]
);

export const userQuests = pgTable(
  "user_quests",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questKey: text("quest_key").notNull(),
    progress: integer("progress").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("user_quests_user_quest_unique").on(t.userId, t.questKey)]
);

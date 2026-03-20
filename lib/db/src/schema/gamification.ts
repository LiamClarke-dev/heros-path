import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userBadgesTable = pgTable("user_badges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  badgeKey: text("badge_key").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userQuestsTable = pgTable("user_quests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  questKey: text("quest_key").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  progressJson: jsonb("progress_json").notNull().default({}),
});

export const insertUserBadgeSchema = createInsertSchema(userBadgesTable);
export const insertUserQuestSchema = createInsertSchema(userQuestsTable);

export type UserBadge = typeof userBadgesTable.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserQuest = typeof userQuestsTable.$inferSelect;
export type InsertUserQuest = z.infer<typeof insertUserQuestSchema>;

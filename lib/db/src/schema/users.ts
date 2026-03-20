import { pgTable, text, integer, timestamp, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  googleId: text("google_id").unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakDays: integer("streak_days").notNull().default(0),
  lastJourneyDate: date("last_journey_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferencesTable = pgTable("user_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  placeTypes: text("place_types").array().notNull().default([]),
  minRating: numeric("min_rating", { precision: 2, scale: 1 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable);
export const insertSessionSchema = createInsertSchema(sessionsTable);

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessionsTable.$inferSelect;

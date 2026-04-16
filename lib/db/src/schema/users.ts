import {
  pgTable,
  text,
  integer,
  timestamp,
  date,
  numeric,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  replitId: text("replit_id").unique(),
  passwordHash: text("password_hash"),
  email: text("email").unique(),
  displayName: text("display_name").notNull().default("Adventurer"),
  profileImageUrl: text("profile_image_url"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakDays: integer("streak_days").notNull().default(0),
  lastJourneyDate: date("last_journey_date"),
  dailyPingCount: integer("daily_ping_count").notNull().default(0),
  dailyPingResetDate: date("daily_ping_reset_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { withTimezone: false }).notNull(),
});

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placeTypes: text("place_types").array().notNull().default(sql`'{}'`),
    minRating: numeric("min_rating", { precision: 2, scale: 1 })
      .notNull()
      .default("0"),
    maxDiscoveries: integer("max_discoveries").notNull().default(20),
    tokyoWards: text("tokyo_wards").array().notNull().default(sql`'{}'`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("user_preferences_user_id_unique").on(t.userId)]
);

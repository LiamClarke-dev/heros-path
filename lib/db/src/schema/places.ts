import { pgTable, text, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { journeysTable } from "./journeys";

export const placeCacheTable = pgTable("place_cache", {
  googlePlaceId: text("google_place_id").primaryKey(),
  name: text("name").notNull(),
  lat: numeric("lat", { precision: 10, scale: 7 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 7 }).notNull(),
  rating: numeric("rating", { precision: 3, scale: 1 }),
  types: text("types").array().notNull().default([]),
  photoReference: text("photo_reference"),
  address: text("address"),
  cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userDiscoveredPlacesTable = pgTable("user_discovered_places", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  googlePlaceId: text("google_place_id").notNull().references(() => placeCacheTable.googlePlaceId),
  firstJourneyId: text("first_journey_id").references(() => journeysTable.id, { onDelete: "set null" }),
  firstDiscoveredAt: timestamp("first_discovered_at", { withTimezone: true }).notNull().defaultNow(),
  lastDiscoveredAt: timestamp("last_discovered_at", { withTimezone: true }).notNull().defaultNow(),
  discoveryCount: integer("discovery_count").notNull().default(1),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  isFavorited: boolean("is_favorited").notNull().default(false),
  isSnoozed: boolean("is_snoozed").notNull().default(false),
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journeyDiscoveredPlacesTable = pgTable("journey_discovered_places", {
  id: text("id").primaryKey(),
  journeyId: text("journey_id").notNull().references(() => journeysTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  googlePlaceId: text("google_place_id").notNull().references(() => placeCacheTable.googlePlaceId),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
  discoverySource: text("discovery_source").notNull().default("ping"),
});

export const insertPlaceCacheSchema = createInsertSchema(placeCacheTable);
export const insertUserDiscoveredPlaceSchema = createInsertSchema(userDiscoveredPlacesTable);
export const insertJourneyDiscoveredPlaceSchema = createInsertSchema(journeyDiscoveredPlacesTable);

export type PlaceCache = typeof placeCacheTable.$inferSelect;
export type UserDiscoveredPlace = typeof userDiscoveredPlacesTable.$inferSelect;
export type JourneyDiscoveredPlace = typeof journeyDiscoveredPlacesTable.$inferSelect;

import { pgTable, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const journeysTable = pgTable("journeys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  polylineEncoded: text("polyline_encoded"),
  totalDistanceM: numeric("total_distance_m"),
  isDevSimulated: boolean("is_dev_simulated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journeyWaypointsTable = pgTable("journey_waypoints", {
  id: text("id").primaryKey(),
  journeyId: text("journey_id").notNull().references(() => journeysTable.id, { onDelete: "cascade" }),
  lat: numeric("lat", { precision: 10, scale: 7 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 7 }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJourneySchema = createInsertSchema(journeysTable);
export const insertWaypointSchema = createInsertSchema(journeyWaypointsTable);

export type Journey = typeof journeysTable.$inferSelect;
export type InsertJourney = z.infer<typeof insertJourneySchema>;
export type JourneyWaypoint = typeof journeyWaypointsTable.$inferSelect;
export type InsertJourneyWaypoint = z.infer<typeof insertWaypointSchema>;

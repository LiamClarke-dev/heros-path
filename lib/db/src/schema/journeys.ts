import {
  pgTable,
  text,
  integer,
  timestamp,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const journeys = pgTable("journeys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  totalDistanceM: numeric("total_distance_m", { precision: 10, scale: 2 }),
  polylineEncoded: text("polyline_encoded"),
  xpEarned: integer("xp_earned").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const journeyWaypoints = pgTable(
  "journey_waypoints",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    journeyId: text("journey_id")
      .notNull()
      .references(() => journeys.id, { onDelete: "cascade" }),
    lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
    lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    journeyIdRecordedAtUnique: uniqueIndex(
      "journey_waypoints_journey_id_recorded_at_unique"
    ).on(table.journeyId, table.recordedAt),
  })
);

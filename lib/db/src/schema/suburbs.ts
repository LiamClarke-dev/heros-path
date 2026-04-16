import {
  pgTable,
  text,
  integer,
  timestamp,
  real,
  jsonb,
  bigint,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const suburbs = pgTable("suburbs", {
  id: text("id").primaryKey(),
  city: text("city").notNull(),
  name: text("name").notNull(),
  boundaryGeoJSON: jsonb("boundary_geo_json").notNull(),
  centroidLat: real("centroid_lat").notNull(),
  centroidLng: real("centroid_lng").notNull(),
  totalSegments: integer("total_segments").notNull().default(0),
});

export const suburbRoadSegments = pgTable("suburb_road_segments", {
  id: text("id").primaryKey(),
  suburbId: text("suburb_id")
    .notNull()
    .references(() => suburbs.id, { onDelete: "cascade" }),
  geom: jsonb("geom").notNull(),
  osmWayId: bigint("osm_way_id", { mode: "number" }),
});

export const userExploredSegments = pgTable(
  "user_explored_segments",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    segmentId: text("segment_id")
      .notNull()
      .references(() => suburbRoadSegments.id, { onDelete: "cascade" }),
    firstExploredAt: timestamp("first_explored_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.segmentId] })]
);

export const suburbCompletions = pgTable(
  "suburb_completions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    suburbId: text("suburb_id")
      .notNull()
      .references(() => suburbs.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
    completionPct: real("completion_pct").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.suburbId] })]
);

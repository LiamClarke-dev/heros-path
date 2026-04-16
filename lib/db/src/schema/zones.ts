import {
  pgTable,
  text,
  integer,
  timestamp,
  real,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const zones = pgTable("zones", {
  id: text("id").primaryKey(),
  city: text("city").notNull(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  wardId: text("ward_id"),
  boundaryGeoJSON: jsonb("boundary_geo_json").notNull(),
  centroidLat: real("centroid_lat").notNull(),
  centroidLng: real("centroid_lng").notNull(),
  totalCells: integer("total_cells").notNull().default(0),
});

export const zoneCoverage = pgTable(
  "zone_coverage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    zoneId: text("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    visitedCells: integer("visited_cells").notNull().default(0),
    coveragePct: real("coverage_pct").notNull().default(0),
    lastVisitedAt: timestamp("last_visited_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.zoneId] })]
);

export const zoneCompletions = pgTable(
  "zone_completions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    zoneId: text("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
    coveragePct: real("coverage_pct").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.zoneId] })]
);

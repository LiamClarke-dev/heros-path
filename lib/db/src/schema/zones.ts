import {
  pgTable,
  text,
  integer,
  timestamp,
  real,
  jsonb,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

const integerArray = customType<{ data: number[]; driverData: number[] }>({
  dataType() {
    return "integer[]";
  },
  toDriver(value: number[]) {
    return value;
  },
  fromDriver(value: number[]) {
    return value ?? [];
  },
});

export const zones = pgTable("zones", {
  id: text("id").primaryKey(),
  city: text("city").notNull(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  wardId: text("ward_id"),
  boundaryGeoJSON: jsonb("boundary_geo_json").notNull(),
  centroidLat: real("centroid_lat").notNull(),
  centroidLng: real("centroid_lng").notNull(),
  totalCells: integer("total_cells").notNull().default(400),
  bboxMinLat: real("bbox_min_lat"),
  bboxMaxLat: real("bbox_max_lat"),
  bboxMinLng: real("bbox_min_lng"),
  bboxMaxLng: real("bbox_max_lng"),
  gridSize: integer("grid_size").notNull().default(20),
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
    visitedCells: integerArray("visited_cells").notNull().default(sql`'{}'::integer[]`),
    coveragePct: real("coverage_pct").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
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

import {
  pgTable,
  text,
  integer,
  timestamp,
  numeric,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { journeys } from "./journeys";

export const placeCache = pgTable("place_cache", {
  googlePlaceId: text("google_place_id").primaryKey(),
  name: text("name").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
  rating: numeric("rating", { precision: 2, scale: 1 }),
  userRatingCount: integer("user_rating_count"),
  priceLevel: text("price_level"),
  primaryType: text("primary_type"),
  types: text("types").array().notNull().default(sql`'{}'`),
  editorialSummary: text("editorial_summary"),
  websiteUri: text("website_uri"),
  googleMapsUri: text("google_maps_uri"),
  phoneNumber: text("phone_number"),
  photoReference: text("photo_reference"),
  address: text("address"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const journeyDiscoveredPlaces = pgTable(
  "journey_discovered_places",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    journeyId: text("journey_id")
      .notNull()
      .references(() => journeys.id, { onDelete: "cascade" }),
    googlePlaceId: text("google_place_id")
      .notNull()
      .references(() => placeCache.googlePlaceId, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    discoverySource: text("discovery_source").notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("journey_discovered_places_journey_place_unique").on(
      t.journeyId,
      t.googlePlaceId
    ),
  ]
);

export const userDiscoveredPlaces = pgTable(
  "user_discovered_places",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googlePlaceId: text("google_place_id")
      .notNull()
      .references(() => placeCache.googlePlaceId, { onDelete: "cascade" }),
    firstDiscoveredAt: timestamp("first_discovered_at", {
      withTimezone: true,
    }).defaultNow(),
    lastDiscoveredAt: timestamp("last_discovered_at", {
      withTimezone: true,
    }).defaultNow(),
    discoveryCount: integer("discovery_count").notNull().default(1),
  },
  (t) => [
    uniqueIndex("user_discovered_places_user_id_place_id_unique").on(
      t.userId,
      t.googlePlaceId
    ),
  ]
);

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { placeCache } from "./places";

export const placeVisits = pgTable("place_visits", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  googlePlaceId: text("google_place_id")
    .notNull()
    .references(() => placeCache.googlePlaceId, { onDelete: "cascade" }),
  visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
  reaction: text("reaction"),
  tags: text("tags").array().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

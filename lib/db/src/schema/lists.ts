import { pgTable, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { placeCache } from "./places";

export const userPlaceStates = pgTable(
  "user_place_states",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    googlePlaceId: text("google_place_id")
      .notNull()
      .references(() => placeCache.googlePlaceId, { onDelete: "cascade" }),
    isFavorited: boolean("is_favorited").notNull().default(false),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    isSnoozed: boolean("is_snoozed").notNull().default(false),
    snoozeUntil: timestamp("snooze_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("user_place_states_user_place_unique").on(t.userId, t.googlePlaceId),
  ]
);

export const placeLists = pgTable("place_lists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emoji: text("emoji"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const placeListItems = pgTable(
  "place_list_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    listId: text("list_id")
      .notNull()
      .references(() => placeLists.id, { onDelete: "cascade" }),
    googlePlaceId: text("google_place_id")
      .notNull()
      .references(() => placeCache.googlePlaceId, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("place_list_items_list_place_unique").on(t.listId, t.googlePlaceId),
  ]
);

import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { placeCacheTable } from "./places";

export const placeListsTable = pgTable("place_lists", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const placeListItemsTable = pgTable("place_list_items", {
  id: text("id").primaryKey(),
  listId: text("list_id").notNull().references(() => placeListsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  googlePlaceId: text("google_place_id").notNull().references(() => placeCacheTable.googlePlaceId),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlaceListSchema = createInsertSchema(placeListsTable);
export const insertPlaceListItemSchema = createInsertSchema(placeListItemsTable);

export type PlaceList = typeof placeListsTable.$inferSelect;
export type InsertPlaceList = z.infer<typeof insertPlaceListSchema>;
export type PlaceListItem = typeof placeListItemsTable.$inferSelect;

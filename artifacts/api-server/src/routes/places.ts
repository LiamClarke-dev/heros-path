import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  userDiscoveredPlacesTable,
  placeCacheTable,
  placeListItemsTable,
  placeListsTable,
  userPlaceActionsTable,
  PLACE_ACTIONS,
  type PlaceAction,
} from "@workspace/db";
import { eq, and, desc, lt, isNotNull } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function buildPhotoUrl(photoReference: string | null, apiKey: string): string | null {
  if (!photoReference || !apiKey) return null;
  if (photoReference.includes("/")) {
    return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&key=${apiKey}`;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
}

router.get("/places/discover", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const filter = (req.query.filter as string) ?? "all";
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  // Auto-expire snoozed places whose snooze window has passed
  await db
    .update(userDiscoveredPlacesTable)
    .set({ isSnoozed: false, snoozedUntil: null, updatedAt: new Date() })
    .where(
      and(
        eq(userDiscoveredPlacesTable.userId, user.id),
        eq(userDiscoveredPlacesTable.isSnoozed, true),
        isNotNull(userDiscoveredPlacesTable.snoozedUntil),
        lt(userDiscoveredPlacesTable.snoozedUntil, new Date()),
      ),
    );

  const userPlaces = await db
    .select({
      discovery: userDiscoveredPlacesTable,
      place: placeCacheTable,
    })
    .from(userDiscoveredPlacesTable)
    .innerJoin(placeCacheTable, eq(userDiscoveredPlacesTable.googlePlaceId, placeCacheTable.googlePlaceId))
    .where(
      and(
        eq(userDiscoveredPlacesTable.userId, user.id),
        filter === "favorited" ? eq(userDiscoveredPlacesTable.isFavorited, true) : undefined,
        filter === "snoozed" ? eq(userDiscoveredPlacesTable.isSnoozed, true) : undefined,
        filter === "unreviewed"
          ? and(
              eq(userDiscoveredPlacesTable.isFavorited, false),
              eq(userDiscoveredPlacesTable.isDismissed, false),
              eq(userDiscoveredPlacesTable.isSnoozed, false),
            )
          : undefined,
        filter === "all" ? eq(userDiscoveredPlacesTable.isDismissed, false) : undefined,
      ),
    )
    .orderBy(desc(userDiscoveredPlacesTable.lastDiscoveredAt))
    .limit(limit)
    .offset(offset);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  res.json({
    places: userPlaces.map(({ discovery, place }) => ({
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      lat: Number(place.lat),
      lng: Number(place.lng),
      rating: place.rating ? Number(place.rating) : null,
      types: place.types,
      photoReference: place.photoReference,
      photoUrl: buildPhotoUrl(place.photoReference, apiKey),
      address: place.address,
      firstDiscoveredAt: discovery.firstDiscoveredAt,
      lastDiscoveredAt: discovery.lastDiscoveredAt,
      discoveryCount: discovery.discoveryCount,
      isDismissed: discovery.isDismissed,
      isFavorited: discovery.isFavorited,
      isSnoozed: discovery.isSnoozed,
      snoozedUntil: discovery.snoozedUntil,
    })),
    total: userPlaces.length,
  });
});

router.post("/places/:googlePlaceId/action", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { googlePlaceId } = req.params;
  const { action, listId, snoozeDays = 7 } = req.body as {
    action: PlaceAction;
    listId?: string;
    snoozeDays?: number;
  };

  // Application-level guard (mirrors DB check constraint)
  if (!PLACE_ACTIONS.includes(action as PlaceAction)) {
    res.status(400).json({
      error: "Bad Request",
      message: `action must be one of: ${PLACE_ACTIONS.join(", ")}`,
    });
    return;
  }

  const existing = await db
    .select()
    .from(userDiscoveredPlacesTable)
    .where(
      and(eq(userDiscoveredPlacesTable.userId, user.id), eq(userDiscoveredPlacesTable.googlePlaceId, googlePlaceId)),
    )
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Place not found in discoveries" });
    return;
  }

  type UpdateFields = {
    isDismissed?: boolean;
    isFavorited?: boolean;
    isSnoozed?: boolean;
    snoozedUntil?: Date | null;
    updatedAt: Date;
  };
  const updates: UpdateFields = { updatedAt: new Date() };

  switch (action) {
    case "dismiss":
      updates.isDismissed = true;
      updates.isSnoozed = false;
      updates.snoozedUntil = null;
      break;
    case "snooze":
      updates.isSnoozed = true;
      updates.snoozedUntil = new Date(Date.now() + snoozeDays * 24 * 60 * 60 * 1000);
      break;
    case "favorite":
      updates.isFavorited = true;
      break;
    case "unfavorite":
      updates.isFavorited = false;
      break;
    case "add_to_list":
      if (!listId) {
        res.status(400).json({ error: "listId is required for add_to_list" });
        return;
      }
      {
        // Verify the target list belongs to the authenticated user
        const ownedList = await db
          .select({ id: placeListsTable.id })
          .from(placeListsTable)
          .where(and(eq(placeListsTable.id, listId), eq(placeListsTable.userId, user.id)))
          .limit(1);
        if (!ownedList.length) {
          res.status(403).json({ error: "List not found or access denied" });
          return;
        }
        const existingItem = await db
          .select()
          .from(placeListItemsTable)
          .where(
            and(
              eq(placeListItemsTable.listId, listId),
              eq(placeListItemsTable.googlePlaceId, googlePlaceId),
              eq(placeListItemsTable.userId, user.id),
            ),
          )
          .limit(1);
        if (!existingItem.length) {
          await db.insert(placeListItemsTable).values({
            id: crypto.randomUUID(),
            listId,
            userId: user.id,
            googlePlaceId,
          });
        }
      }
      break;
    case "remove_from_list":
      if (!listId) {
        res.status(400).json({ error: "listId is required for remove_from_list" });
        return;
      }
      {
        // Verify the target list belongs to the authenticated user
        const ownedList = await db
          .select({ id: placeListsTable.id })
          .from(placeListsTable)
          .where(and(eq(placeListsTable.id, listId), eq(placeListsTable.userId, user.id)))
          .limit(1);
        if (!ownedList.length) {
          res.status(403).json({ error: "List not found or access denied" });
          return;
        }
        await db
          .delete(placeListItemsTable)
          .where(
            and(
              eq(placeListItemsTable.listId, listId),
              eq(placeListItemsTable.googlePlaceId, googlePlaceId),
              eq(placeListItemsTable.userId, user.id),
            ),
          );
      }
      break;
    default:
      res.status(400).json({ error: "Invalid action" });
      return;
  }

  if (Object.keys(updates).length > 1) {
    await db
      .update(userDiscoveredPlacesTable)
      .set(updates)
      .where(
        and(
          eq(userDiscoveredPlacesTable.userId, user.id),
          eq(userDiscoveredPlacesTable.googlePlaceId, googlePlaceId),
        ),
      );
  }

  // Audit log: append every place action to user_place_actions
  await db.insert(userPlaceActionsTable).values({
    id: crypto.randomUUID(),
    userId: user.id,
    googlePlaceId,
    action,
    snoozedUntil: "snoozedUntil" in updates ? (updates.snoozedUntil ?? null) : null,
    listId: listId ?? null,
  });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  const updated = await db
    .select({
      discovery: userDiscoveredPlacesTable,
      place: placeCacheTable,
    })
    .from(userDiscoveredPlacesTable)
    .innerJoin(placeCacheTable, eq(userDiscoveredPlacesTable.googlePlaceId, placeCacheTable.googlePlaceId))
    .where(
      and(eq(userDiscoveredPlacesTable.userId, user.id), eq(userDiscoveredPlacesTable.googlePlaceId, googlePlaceId)),
    )
    .limit(1);

  const { discovery, place } = updated[0];
  res.json({
    googlePlaceId: place.googlePlaceId,
    name: place.name,
    lat: Number(place.lat),
    lng: Number(place.lng),
    rating: place.rating ? Number(place.rating) : null,
    types: place.types,
    photoReference: place.photoReference,
    photoUrl: buildPhotoUrl(place.photoReference, apiKey),
    address: place.address,
    firstDiscoveredAt: discovery.firstDiscoveredAt,
    lastDiscoveredAt: discovery.lastDiscoveredAt,
    discoveryCount: discovery.discoveryCount,
    isDismissed: discovery.isDismissed,
    isFavorited: discovery.isFavorited,
    isSnoozed: discovery.isSnoozed,
    snoozedUntil: discovery.snoozedUntil,
  });
});

export default router;

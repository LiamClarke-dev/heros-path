import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { placeListsTable, placeListItemsTable, placeCacheTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";

function buildPhotoUrl(photoReference: string | null, apiKey: string): string | null {
  if (!photoReference || !apiKey) return null;
  if (photoReference.includes("/")) {
    return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&key=${apiKey}`;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
}

const router: IRouter = Router();

async function ensureDefaultList(userId: string) {
  const existing = await db
    .select()
    .from(placeListsTable)
    .where(and(eq(placeListsTable.userId, userId), eq(placeListsTable.isDefault, true)))
    .limit(1);

  if (!existing.length) {
    await db.insert(placeListsTable).values({
      id: crypto.randomUUID(),
      userId,
      name: "Future Visits",
      isDefault: true,
    });
  }
}

router.get("/lists", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  await ensureDefaultList(user.id);

  const lists = await db
    .select()
    .from(placeListsTable)
    .where(eq(placeListsTable.userId, user.id))
    .orderBy(placeListsTable.createdAt);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  const listsWithCounts = await Promise.all(
    lists.map(async (list) => {
      const countResult = await db
        .select({ count: count() })
        .from(placeListItemsTable)
        .where(eq(placeListItemsTable.listId, list.id));

      const firstPhotoItem = await db
        .select({ photoReference: placeCacheTable.photoReference })
        .from(placeListItemsTable)
        .innerJoin(placeCacheTable, eq(placeListItemsTable.googlePlaceId, placeCacheTable.googlePlaceId))
        .where(and(eq(placeListItemsTable.listId, list.id), eq(placeListItemsTable.userId, user.id)))
        .limit(1);

      const photoReference = firstPhotoItem[0]?.photoReference ?? null;

      return {
        ...list,
        placeCount: Number(countResult[0]?.count ?? 0),
        coverPhotoUrl: buildPhotoUrl(photoReference, apiKey),
      };
    }),
  );

  res.json({ lists: listsWithCounts });
});

router.post("/lists", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  const { name } = req.body as { name?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const list = await db
    .insert(placeListsTable)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: name.trim(),
      isDefault: false,
    })
    .returning();

  res.status(201).json({ ...list[0], placeCount: 0 });
});

router.put("/lists/:listId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  const { listId } = req.params;
  const { name } = req.body as { name?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const existing = await db
    .select()
    .from(placeListsTable)
    .where(and(eq(placeListsTable.id, listId), eq(placeListsTable.userId, user.id)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const updated = await db
    .update(placeListsTable)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(placeListsTable.id, listId))
    .returning();

  const countResult = await db
    .select({ count: count() })
    .from(placeListItemsTable)
    .where(eq(placeListItemsTable.listId, listId));

  res.json({ ...updated[0], placeCount: Number(countResult[0]?.count ?? 0) });
});

router.delete("/lists/:listId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  const { listId } = req.params;

  const existing = await db
    .select()
    .from(placeListsTable)
    .where(and(eq(placeListsTable.id, listId), eq(placeListsTable.userId, user.id)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (existing[0].isDefault) {
    res.status(400).json({ error: "Cannot delete default list" });
    return;
  }

  await db.delete(placeListsTable).where(eq(placeListsTable.id, listId));
  res.status(204).send();
});

router.post("/lists/:listId/places/:googlePlaceId/move", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  const { listId, googlePlaceId } = req.params;
  const { targetListId } = req.body as { targetListId: string };

  if (!targetListId) {
    res.status(400).json({ error: "targetListId is required" });
    return;
  }

  if (listId === targetListId) {
    res.status(400).json({ error: "Source and target lists must be different" });
    return;
  }

  const ownedLists = await db
    .select({ id: placeListsTable.id })
    .from(placeListsTable)
    .where(and(eq(placeListsTable.userId, user.id)));

  const ownedIds = new Set(ownedLists.map((l) => l.id));
  if (!ownedIds.has(listId) || !ownedIds.has(targetListId)) {
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

  const existingInTarget = await db
    .select({ id: placeListItemsTable.id })
    .from(placeListItemsTable)
    .where(
      and(
        eq(placeListItemsTable.listId, targetListId),
        eq(placeListItemsTable.googlePlaceId, googlePlaceId),
        eq(placeListItemsTable.userId, user.id),
      ),
    )
    .limit(1);

  if (!existingInTarget.length) {
    await db.insert(placeListItemsTable).values({
      id: crypto.randomUUID(),
      listId: targetListId,
      userId: user.id,
      googlePlaceId,
    });
  }

  res.json({ success: true });
});

router.get("/lists/:listId/places", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  const { listId } = req.params;

  const existing = await db
    .select()
    .from(placeListsTable)
    .where(and(eq(placeListsTable.id, listId), eq(placeListsTable.userId, user.id)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const items = await db
    .select({ place: placeCacheTable })
    .from(placeListItemsTable)
    .innerJoin(placeCacheTable, eq(placeListItemsTable.googlePlaceId, placeCacheTable.googlePlaceId))
    .where(and(eq(placeListItemsTable.listId, listId), eq(placeListItemsTable.userId, user.id)));

  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  res.json({
    places: items.map(({ place }) => ({
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      lat: Number(place.lat),
      lng: Number(place.lng),
      rating: place.rating ? Number(place.rating) : null,
      types: place.types,
      photoReference: place.photoReference,
      photoUrl: buildPhotoUrl(place.photoReference, apiKey),
      address: place.address,
      distanceM: null,
    })),
  });
});

export default router;

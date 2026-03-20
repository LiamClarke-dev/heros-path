import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { placeListsTable, placeListItemsTable, placeCacheTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

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

router.get("/lists", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await ensureDefaultList(user.id);

  const lists = await db
    .select()
    .from(placeListsTable)
    .where(eq(placeListsTable.userId, user.id))
    .orderBy(placeListsTable.createdAt);

  const listsWithCounts = await Promise.all(
    lists.map(async (list) => {
      const countResult = await db
        .select({ count: count() })
        .from(placeListItemsTable)
        .where(eq(placeListItemsTable.listId, list.id));
      return { ...list, placeCount: Number(countResult[0]?.count ?? 0) };
    }),
  );

  res.json({ lists: listsWithCounts });
});

router.post("/lists", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
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

router.put("/lists/:listId", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
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

router.delete("/lists/:listId", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
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

router.get("/lists/:listId/places", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
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
    .where(eq(placeListItemsTable.listId, listId));

  res.json({
    places: items.map(({ place }) => ({
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      lat: Number(place.lat),
      lng: Number(place.lng),
      rating: place.rating ? Number(place.rating) : null,
      types: place.types,
      photoReference: place.photoReference,
      address: place.address,
      distanceM: null,
    })),
  });
});

export default router;

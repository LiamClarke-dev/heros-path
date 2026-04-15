import { Router, type Request, type Response } from "express";
import {
  db,
  placeLists,
  placeListItems,
  placeCache,
} from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import logger from "../logger.js";

const router = Router();

function photoUrl(ref: string | null | undefined, width = 400): string | null {
  if (!ref) return null;
  const key = process.env.GOOGLE_MAPS_API_KEY ?? "";
  if (ref.includes("/")) {
    return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${width}&key=${key}`;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photoreference=${ref}&key=${key}`;
}

router.get("/", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const rows = await db
    .select({
      id: placeLists.id,
      name: placeLists.name,
      emoji: placeLists.emoji,
      createdAt: placeLists.createdAt,
      itemCount: sql<number>`count(${placeListItems.id})::int`,
    })
    .from(placeLists)
    .leftJoin(placeListItems, eq(placeListItems.listId, placeLists.id))
    .where(eq(placeLists.userId, user.id))
    .groupBy(placeLists.id)
    .orderBy(placeLists.createdAt);

  res.json({ lists: rows });
});

router.post("/", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { name, emoji } = req.body as { name?: unknown; emoji?: unknown };

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [list] = await db
    .insert(placeLists)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: name.trim(),
      emoji: typeof emoji === "string" ? emoji : null,
    })
    .returning();

  res.status(201).json({ list: { ...list, itemCount: 0 } });
});

router.delete("/:listId", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;

  const [deleted] = await db
    .delete(placeLists)
    .where(and(eq(placeLists.id, listId), eq(placeLists.userId, user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  res.json({ ok: true });
});

router.get("/:listId", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;

  const [list] = await db
    .select()
    .from(placeLists)
    .where(and(eq(placeLists.id, listId), eq(placeLists.userId, user.id)));

  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  const items = await db
    .select({
      googlePlaceId: placeCache.googlePlaceId,
      name: placeCache.name,
      lat: placeCache.lat,
      lng: placeCache.lng,
      rating: placeCache.rating,
      primaryType: placeCache.primaryType,
      types: placeCache.types,
      photoReference: placeCache.photoReference,
      address: placeCache.address,
      addedAt: placeListItems.addedAt,
    })
    .from(placeListItems)
    .innerJoin(
      placeCache,
      eq(placeListItems.googlePlaceId, placeCache.googlePlaceId)
    )
    .where(eq(placeListItems.listId, listId))
    .orderBy(placeListItems.addedAt);

  const places = items.map((p) => ({
    ...p,
    lat: parseFloat(String(p.lat)),
    lng: parseFloat(String(p.lng)),
    rating: p.rating !== null ? parseFloat(String(p.rating)) : null,
    photoUrl: photoUrl(p.photoReference),
  }));

  res.json({ list, places });
});

router.post("/:listId/items", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const listId = req.params.listId as string;
  const { googlePlaceId } = req.body as { googlePlaceId?: unknown };

  if (!googlePlaceId || typeof googlePlaceId !== "string") {
    res.status(400).json({ error: "googlePlaceId is required" });
    return;
  }

  const [list] = await db
    .select()
    .from(placeLists)
    .where(and(eq(placeLists.id, listId), eq(placeLists.userId, user.id)));

  if (!list) {
    res.status(404).json({ error: "List not found" });
    return;
  }

  try {
    await db
      .insert(placeListItems)
      .values({
        id: crypto.randomUUID(),
        listId: listId,
        googlePlaceId: googlePlaceId,
        addedAt: new Date(),
      })
      .onConflictDoNothing();
  } catch (err) {
    logger.warn({ err }, "Add to list failed");
    res.status(400).json({ error: "Could not add place to list" });
    return;
  }

  res.status(201).json({ ok: true });
});

router.delete(
  "/:listId/items/:googlePlaceId",
  async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const listId = req.params.listId as string;
    const googlePlaceId = req.params.googlePlaceId as string;

    const [list] = await db
      .select()
      .from(placeLists)
      .where(and(eq(placeLists.id, listId), eq(placeLists.userId, user.id)));

    if (!list) {
      res.status(404).json({ error: "List not found" });
      return;
    }

    await db
      .delete(placeListItems)
      .where(
        and(
          eq(placeListItems.listId, listId),
          eq(placeListItems.googlePlaceId, googlePlaceId)
        )
      );

    res.json({ ok: true });
  }
);

export default router;

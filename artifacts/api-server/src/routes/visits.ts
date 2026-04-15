import { Router, type Request, type Response } from "express";
import { db, placeVisits, placeCache } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

const VALID_REACTIONS = new Set(["thumbs_up", "thumbs_down", "star"]);

const ALL_VALID_TAGS = new Set([
  "great_food","great_coffee","cozy_atmosphere","great_views","hidden_gem",
  "would_return","great_service","good_value","lively_vibe","great_for_dates",
  "overpriced","slow_service","disappointing","too_crowded","poor_quality","not_worth_it",
  "good_for_work","bring_a_friend","unique_experience","instagrammable",
]);

function validateVisitBody(body: Record<string, unknown>): string | null {
  const { reaction, tags, notes } = body;
  if (reaction !== undefined && reaction !== null && !VALID_REACTIONS.has(String(reaction))) {
    return `reaction must be one of: ${[...VALID_REACTIONS].join(", ")}`;
  }
  if (tags !== undefined) {
    if (!Array.isArray(tags)) return "tags must be an array";
    const invalid = (tags as string[]).filter((t) => !ALL_VALID_TAGS.has(t));
    if (invalid.length > 0) return `unknown tag keys: ${invalid.join(", ")}`;
    if (tags.length > 5) return "maximum 5 tags allowed";
  }
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== "string") return "notes must be a string";
    if (notes.length > 1000) return "notes must be 1000 characters or fewer";
  }
  return null;
}

function makePhotoUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const key = process.env.GOOGLE_MAPS_API_KEY ?? "";
  if (ref.includes("/")) {
    return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=200&key=${key}`;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${ref}&key=${key}`;
}

// ── /api/places/:googlePlaceId/visits  +  /api/places/visits/:visitId ──────
export const placeVisitsRouter = Router();

placeVisitsRouter.post("/:googlePlaceId/visits", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const googlePlaceId = String(req.params.googlePlaceId);
  const body = req.body as {
    visitedAt?: string;
    reaction?: string;
    tags?: string[];
    notes?: string;
  };

  const validationError = validateVisitBody(body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const rows = await db
    .select({ id: placeCache.googlePlaceId })
    .from(placeCache)
    .where(eq(placeCache.googlePlaceId, googlePlaceId));

  if (rows.length === 0) {
    res.status(404).json({ error: "Place not found" });
    return;
  }

  let visitedAt: Date;
  if (body.visitedAt) {
    const parsed = new Date(body.visitedAt);
    if (isNaN(parsed.getTime())) {
      res.status(400).json({ error: "visitedAt must be a valid ISO date string" });
      return;
    }
    visitedAt = parsed;
  } else {
    visitedAt = new Date();
  }

  const newId = crypto.randomUUID();
  await db.insert(placeVisits).values({
    id: newId,
    userId: user.id,
    googlePlaceId,
    visitedAt,
    reaction: body.reaction ?? null,
    tags: body.tags ?? [],
    notes: body.notes ?? null,
  } as typeof placeVisits.$inferInsert);

  const [visit] = await db
    .select()
    .from(placeVisits)
    .where(eq(placeVisits.id, newId));

  res.status(201).json({ visit });
});

placeVisitsRouter.get("/:googlePlaceId/visits", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const googlePlaceId = String(req.params.googlePlaceId);

  const visits = await db
    .select()
    .from(placeVisits)
    .where(
      and(
        eq(placeVisits.userId, user.id),
        eq(placeVisits.googlePlaceId, googlePlaceId)
      )
    )
    .orderBy(desc(placeVisits.visitedAt));

  const totalVisits = visits.length;
  const lastVisitedAt = visits[0]?.visitedAt?.toISOString() ?? null;

  res.json({ visits, totalVisits, lastVisitedAt });
});

placeVisitsRouter.patch("/visits/:visitId", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const visitId = String(req.params.visitId);

  const existing = await db
    .select()
    .from(placeVisits)
    .where(and(eq(placeVisits.id, visitId), eq(placeVisits.userId, user.id)));

  if (existing.length === 0) {
    res.status(404).json({ error: "Visit not found" });
    return;
  }

  const body = req.body as {
    reaction?: string;
    tags?: string[];
    notes?: string;
    visitedAt?: string;
  };

  const validationError = validateVisitBody(body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.reaction !== undefined) updates.reaction = body.reaction ?? null;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.notes !== undefined) updates.notes = body.notes ?? null;
  if (body.visitedAt !== undefined) {
    const parsed = new Date(body.visitedAt);
    if (isNaN(parsed.getTime())) {
      res.status(400).json({ error: "visitedAt must be a valid ISO date string" });
      return;
    }
    updates.visitedAt = parsed;
  }

  const [updated] = await db
    .update(placeVisits)
    .set(updates)
    .where(and(eq(placeVisits.id, visitId), eq(placeVisits.userId, user.id)))
    .returning();

  res.json({ visit: updated });
});

placeVisitsRouter.delete("/visits/:visitId", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const visitId = String(req.params.visitId);

  const deleted = await db
    .delete(placeVisits)
    .where(and(eq(placeVisits.id, visitId), eq(placeVisits.userId, user.id)))
    .returning({ id: placeVisits.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "Visit not found" });
    return;
  }

  res.json({ ok: true });
});

// ── /api/me/visits ───────────────────────────────────────────────────────────
export const meVisitsRouter = Router();

meVisitsRouter.get("/visits", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  const sort = String(req.query.sort ?? "recent");
  const offset = (page - 1) * limit;

  const orderClauses =
    sort === "reaction"
      ? ([placeVisits.reaction, desc(placeVisits.visitedAt)] as const)
      : ([desc(placeVisits.visitedAt)] as const);

  const [visits, countRow] = await Promise.all([
    db
      .select({
        id: placeVisits.id,
        googlePlaceId: placeVisits.googlePlaceId,
        visitedAt: placeVisits.visitedAt,
        reaction: placeVisits.reaction,
        tags: placeVisits.tags,
        notes: placeVisits.notes,
        createdAt: placeVisits.createdAt,
        name: placeCache.name,
        primaryType: placeCache.primaryType,
        photoReference: placeCache.photoReference,
        address: placeCache.address,
      })
      .from(placeVisits)
      .innerJoin(placeCache, eq(placeVisits.googlePlaceId, placeCache.googlePlaceId))
      .where(eq(placeVisits.userId, user.id))
      .orderBy(...orderClauses)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(placeVisits)
      .where(eq(placeVisits.userId, user.id)),
  ]);

  const total = countRow[0]?.total ?? 0;

  const formatted = visits.map((v) => ({
    id: v.id,
    googlePlaceId: v.googlePlaceId,
    visitedAt: v.visitedAt,
    reaction: v.reaction,
    tags: v.tags,
    notes: v.notes,
    createdAt: v.createdAt,
    name: v.name,
    primaryType: v.primaryType,
    address: v.address,
    photoUrl: makePhotoUrl(v.photoReference),
  }));

  res.json({ visits: formatted, total, page });
});

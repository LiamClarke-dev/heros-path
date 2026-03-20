import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  journeysTable,
  journeyWaypointsTable,
  journeyDiscoveredPlacesTable,
  userDiscoveredPlacesTable,
  placeCacheTable,
  userPreferencesTable,
} from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/journeys", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { isDevSimulated = false } = req.body as { isDevSimulated?: boolean };

  const journey = await db
    .insert(journeysTable)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      isDevSimulated,
    })
    .returning();

  const placeCount = 0;
  res.status(201).json({ ...journey[0], placeCount });
});

router.get("/journeys", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const journeys = await db
    .select()
    .from(journeysTable)
    .where(eq(journeysTable.userId, user.id))
    .orderBy(desc(journeysTable.startedAt))
    .limit(limit)
    .offset(offset);

  const journeysWithCount = await Promise.all(
    journeys.map(async (j) => {
      const placeCountResult = await db
        .select({ count: count() })
        .from(journeyDiscoveredPlacesTable)
        .where(eq(journeyDiscoveredPlacesTable.journeyId, j.id));
      return { ...j, placeCount: placeCountResult[0]?.count ?? 0 };
    }),
  );

  res.json({ journeys: journeysWithCount, total: journeysWithCount.length });
});

router.get("/journeys/:journeyId", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { journeyId } = req.params;

  const journeys = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, user.id)))
    .limit(1);

  if (!journeys.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const waypoints = await db
    .select()
    .from(journeyWaypointsTable)
    .where(eq(journeyWaypointsTable.journeyId, journeyId))
    .orderBy(journeyWaypointsTable.recordedAt);

  const placeCountResult = await db
    .select({ count: count() })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));

  const journey = { ...journeys[0], placeCount: placeCountResult[0]?.count ?? 0 };

  res.json({
    journey,
    waypoints: waypoints.map((w) => ({
      id: w.id,
      lat: Number(w.lat),
      lng: Number(w.lng),
      recordedAt: w.recordedAt,
    })),
  });
});

router.patch("/journeys/:journeyId", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { journeyId } = req.params;
  const { waypoints, status } = req.body as {
    waypoints?: Array<{ lat: number; lng: number; recordedAt?: string }>;
    status?: "active" | "ended";
  };

  const existing = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, user.id)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (waypoints?.length) {
    await db.insert(journeyWaypointsTable).values(
      waypoints.map((w) => ({
        id: crypto.randomUUID(),
        journeyId,
        lat: w.lat.toString(),
        lng: w.lng.toString(),
        recordedAt: w.recordedAt ? new Date(w.recordedAt) : new Date(),
      })),
    );
  }

  type JourneyUpdate = {
    endedAt?: Date;
    totalDistanceM?: string;
  };
  const updates: JourneyUpdate = {};
  if (status === "ended") {
    updates.endedAt = new Date();
    const allWaypoints = await db
      .select()
      .from(journeyWaypointsTable)
      .where(eq(journeyWaypointsTable.journeyId, journeyId))
      .orderBy(journeyWaypointsTable.recordedAt);

    if (allWaypoints.length > 1) {
      let totalDist = 0;
      for (let i = 1; i < allWaypoints.length; i++) {
        totalDist += haversineDistance(
          Number(allWaypoints[i - 1].lat),
          Number(allWaypoints[i - 1].lng),
          Number(allWaypoints[i].lat),
          Number(allWaypoints[i].lng),
        );
      }
      updates.totalDistanceM = totalDist.toFixed(2);
    }
  }

  const updated = await db
    .update(journeysTable)
    .set(updates)
    .where(eq(journeysTable.id, journeyId))
    .returning();

  const placeCountResult = await db
    .select({ count: count() })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));

  res.json({ ...updated[0], placeCount: placeCountResult[0]?.count ?? 0 });
});

router.post("/journeys/:journeyId/ping", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { journeyId } = req.params;
  const { lat, lng } = req.body as { lat?: number; lng?: number };

  if (lat == null || lng == null) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  const existing = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, user.id)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    res.json({ places: [] });
    return;
  }

  const prefs = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, user.id))
    .limit(1);

  const minRating = prefs[0]?.minRating ?? 0;
  const placeTypes = prefs[0]?.placeTypes ?? [];

  const dismissed = await db
    .select({ googlePlaceId: userDiscoveredPlacesTable.googlePlaceId })
    .from(userDiscoveredPlacesTable)
    .where(and(eq(userDiscoveredPlacesTable.userId, user.id), eq(userDiscoveredPlacesTable.isDismissed, true)));

  const dismissedIds = new Set(dismissed.map((d) => d.googlePlaceId));

  const typeQuery = placeTypes.length ? `&type=${placeTypes[0]}` : "";
  const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&key=${apiKey}${typeQuery}`;

  const nearbyRes = await fetch(nearbyUrl);
  if (!nearbyRes.ok) {
    res.json({ places: [] });
    return;
  }

  const nearbyData = (await nearbyRes.json()) as {
    results: Array<{
      place_id: string;
      name: string;
      geometry: { location: { lat: number; lng: number } };
      rating?: number;
      types?: string[];
      photos?: Array<{ photo_reference: string }>;
      vicinity?: string;
    }>;
  };

  const places = (nearbyData.results ?? [])
    .filter((p) => !dismissedIds.has(p.place_id))
    .filter((p) => !minRating || (p.rating ?? 0) >= minRating)
    .slice(0, 10)
    .map((p) => ({
      googlePlaceId: p.place_id,
      name: p.name,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      rating: p.rating ?? null,
      types: p.types ?? [],
      photoReference: p.photos?.[0]?.photo_reference ?? null,
      address: p.vicinity ?? null,
      distanceM: haversineDistance(lat, lng, p.geometry.location.lat, p.geometry.location.lng),
    }));

  await upsertPlaceCache(places);

  res.json({ places });
});

router.get("/journeys/:journeyId/discoveries", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { journeyId } = req.params;

  const existing = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, user.id)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const journeyPlaces = await db
    .select({
      googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId,
      discoveredAt: journeyDiscoveredPlacesTable.discoveredAt,
      place: placeCacheTable,
    })
    .from(journeyDiscoveredPlacesTable)
    .innerJoin(placeCacheTable, eq(journeyDiscoveredPlacesTable.googlePlaceId, placeCacheTable.googlePlaceId))
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));

  res.json({
    places: journeyPlaces.map((p) => ({
      googlePlaceId: p.place.googlePlaceId,
      name: p.place.name,
      lat: Number(p.place.lat),
      lng: Number(p.place.lng),
      rating: p.place.rating ? Number(p.place.rating) : null,
      types: p.place.types,
      photoReference: p.place.photoReference,
      address: p.place.address,
      distanceM: null,
    })),
  });
});

async function upsertPlaceCache(
  places: Array<{
    googlePlaceId: string;
    name: string;
    lat: number;
    lng: number;
    rating: number | null;
    types: string[];
    photoReference: string | null;
    address: string | null;
  }>,
) {
  for (const p of places) {
    await db
      .insert(placeCacheTable)
      .values({
        googlePlaceId: p.googlePlaceId,
        name: p.name,
        lat: p.lat.toString(),
        lng: p.lng.toString(),
        rating: p.rating?.toString() ?? null,
        types: p.types,
        photoReference: p.photoReference,
        address: p.address,
      })
      .onConflictDoUpdate({
        target: placeCacheTable.googlePlaceId,
        set: {
          name: p.name,
          rating: p.rating?.toString() ?? null,
          types: p.types,
          photoReference: p.photoReference,
          address: p.address,
          cachedAt: new Date(),
        },
      });
  }
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default router;

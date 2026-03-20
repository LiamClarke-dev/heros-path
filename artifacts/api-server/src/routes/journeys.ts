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
import { eq, and, count, desc, isNotNull, inArray } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// ─── POST /journeys ─────────────────────────────────────────────────────────

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

  res.status(201).json({ ...journey[0], placeCount: 0 });
});

// ─── GET /journeys ───────────────────────────────────────────────────────────

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

// ─── GET /journeys/history (historical polylines for map overlay) ─────────────

router.get("/journeys/history", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;

  const completed = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.userId, user.id), isNotNull(journeysTable.endedAt)))
    .orderBy(desc(journeysTable.startedAt))
    .limit(20);

  const journeyData = await Promise.all(
    completed.map(async (j) => {
      const waypoints = await db
        .select({ lat: journeyWaypointsTable.lat, lng: journeyWaypointsTable.lng })
        .from(journeyWaypointsTable)
        .where(eq(journeyWaypointsTable.journeyId, j.id))
        .orderBy(journeyWaypointsTable.recordedAt);

      // Sample every 3rd waypoint to reduce payload size
      const sampled = waypoints.filter((_, i) => i % 3 === 0);

      return {
        id: j.id,
        startedAt: j.startedAt,
        waypoints: sampled.map((w) => ({ lat: Number(w.lat), lng: Number(w.lng) })),
      };
    }),
  );

  res.json({ journeys: journeyData.filter((j) => j.waypoints.length > 1) });
});

// ─── GET /journeys/:journeyId ────────────────────────────────────────────────

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

// ─── PATCH /journeys/:journeyId ──────────────────────────────────────────────

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
    polylineEncoded?: string;
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
      updates.polylineEncoded = encodePolyline(
        allWaypoints.map((w) => ({ lat: Number(w.lat), lng: Number(w.lng) })),
      );

      // Trigger end-of-journey place discovery (non-blocking)
      void discoverPlacesAlongRoute(journeyId, user.id, allWaypoints).catch((err) =>
        console.error("end-of-journey discovery failed", err),
      );
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

// ─── POST /journeys/:journeyId/ping ─────────────────────────────────────────

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
    res.json({ places: [], source: "no_api_key" });
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

  const rawPlaces = (nearbyData.results ?? [])
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

  if (rawPlaces.length > 0) {
    await upsertPlaceCache(rawPlaces);
    await saveDiscoveredPlaces(rawPlaces, journeyId, user.id, "ping");
  }

  res.json({ places: rawPlaces });
});

// ─── GET /journeys/:journeyId/discoveries ────────────────────────────────────

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
      discoverySource: journeyDiscoveredPlacesTable.discoverySource,
      place: placeCacheTable,
    })
    .from(journeyDiscoveredPlacesTable)
    .innerJoin(placeCacheTable, eq(journeyDiscoveredPlacesTable.googlePlaceId, placeCacheTable.googlePlaceId))
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));

  // Join with user's action state
  const placeIds = journeyPlaces.map((p) => p.googlePlaceId);
  const userStates =
    placeIds.length > 0
      ? await db
          .select()
          .from(userDiscoveredPlacesTable)
          .where(
            and(
              eq(userDiscoveredPlacesTable.userId, user.id),
              inArray(userDiscoveredPlacesTable.googlePlaceId, placeIds),
            ),
          )
      : [];

  const stateByPlaceId = new Map(userStates.map((s) => [s.googlePlaceId, s]));

  res.json({
    places: journeyPlaces.map((p) => {
      const state = stateByPlaceId.get(p.place.googlePlaceId);
      return {
        googlePlaceId: p.place.googlePlaceId,
        name: p.place.name,
        lat: Number(p.place.lat),
        lng: Number(p.place.lng),
        rating: p.place.rating ? Number(p.place.rating) : null,
        types: p.place.types,
        photoReference: p.place.photoReference,
        address: p.place.address,
        discoverySource: p.discoverySource,
        discoveredAt: p.discoveredAt,
        isFavorited: state?.isFavorited ?? false,
        isDismissed: state?.isDismissed ?? false,
        isSnoozed: state?.isSnoozed ?? false,
      };
    }),
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function discoverPlacesAlongRoute(
  journeyId: string,
  userId: string,
  waypoints: Array<{ lat: string | number; lng: string | number }>,
) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || waypoints.length < 2) return;

  const prefs = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId))
    .limit(1);

  const minRating = prefs[0]?.minRating ?? 0;
  const placeTypes = prefs[0]?.placeTypes ?? [];
  const typeQuery = placeTypes.length ? `&type=${placeTypes[0]}` : "";

  const dismissed = await db
    .select({ googlePlaceId: userDiscoveredPlacesTable.googlePlaceId })
    .from(userDiscoveredPlacesTable)
    .where(and(eq(userDiscoveredPlacesTable.userId, userId), eq(userDiscoveredPlacesTable.isDismissed, true)));
  const dismissedIds = new Set(dismissed.map((d) => d.googlePlaceId));

  // Already discovered in this journey (from pings)
  const alreadyFound = await db
    .select({ googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));
  const alreadyFoundIds = new Set(alreadyFound.map((d) => d.googlePlaceId));

  // Search at start, 25%, 50%, 75%, end
  const samplePoints = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const idx = Math.min(Math.floor(t * (waypoints.length - 1)), waypoints.length - 1);
    return { lat: Number(waypoints[idx].lat), lng: Number(waypoints[idx].lng) };
  });

  interface PlaceResult {
    googlePlaceId: string;
    name: string;
    lat: number;
    lng: number;
    rating: number | null;
    types: string[];
    photoReference: string | null;
    address: string | null;
    distanceM: number;
  }

  const allFound = new Map<string, PlaceResult>();

  for (const point of samplePoints) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${point.lat},${point.lng}&radius=300&key=${apiKey}${typeQuery}`;
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) continue;

    const data = (await res.json()) as {
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

    for (const p of data.results ?? []) {
      if (dismissedIds.has(p.place_id) || alreadyFoundIds.has(p.place_id)) continue;
      if (!minRating || (p.rating ?? 0) >= minRating) {
        if (!allFound.has(p.place_id)) {
          allFound.set(p.place_id, {
            googlePlaceId: p.place_id,
            name: p.name,
            lat: p.geometry.location.lat,
            lng: p.geometry.location.lng,
            rating: p.rating ?? null,
            types: p.types ?? [],
            photoReference: p.photos?.[0]?.photo_reference ?? null,
            address: p.vicinity ?? null,
            distanceM: 0,
          });
        }
      }
    }
  }

  const places = Array.from(allFound.values());
  if (places.length > 0) {
    await upsertPlaceCache(places);
    await saveDiscoveredPlaces(places, journeyId, userId, "route");
  }
}

async function saveDiscoveredPlaces(
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
  journeyId: string,
  userId: string,
  source: string,
) {
  const existingDiscoveries = await db
    .select({ googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));
  const existingIds = new Set(existingDiscoveries.map((d) => d.googlePlaceId));

  const newPlaces = places.filter((p) => !existingIds.has(p.googlePlaceId));
  if (newPlaces.length === 0) return;

  // Save to journey_discovered_places
  await db.insert(journeyDiscoveredPlacesTable).values(
    newPlaces.map((p) => ({
      id: crypto.randomUUID(),
      journeyId,
      userId,
      googlePlaceId: p.googlePlaceId,
      discoverySource: source,
    })),
  );

  // Upsert to user_discovered_places
  for (const p of newPlaces) {
    const existing = await db
      .select()
      .from(userDiscoveredPlacesTable)
      .where(
        and(
          eq(userDiscoveredPlacesTable.userId, userId),
          eq(userDiscoveredPlacesTable.googlePlaceId, p.googlePlaceId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userDiscoveredPlacesTable)
        .set({
          lastDiscoveredAt: new Date(),
          discoveryCount: existing[0].discoveryCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(userDiscoveredPlacesTable.id, existing[0].id));
    } else {
      await db.insert(userDiscoveredPlacesTable).values({
        id: crypto.randomUUID(),
        userId,
        googlePlaceId: p.googlePlaceId,
        firstJourneyId: journeyId,
      });
    }
  }
}

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

function encodePolyline(coords: { lat: number; lng: number }[]): string {
  let result = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const coord of coords) {
    const lat = Math.round(coord.lat * 1e5);
    const lng = Math.round(coord.lng * 1e5);
    result += encodeValue(lat - prevLat);
    result += encodeValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return result;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let result = "";
  while (v >= 0x20) {
    result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  result += String.fromCharCode(v + 63);
  return result;
}

export default router;

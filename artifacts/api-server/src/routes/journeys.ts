import { Router, type Request, type Response } from "express";
import { db, journeys, journeyWaypoints, journeyDiscoveredPlaces, placeCache } from "@workspace/db";
import { eq, and, desc, gte, lte, isNotNull, inArray, count, sql } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import {
  haversineDistance,
  totalDistance,
  encodePolyline,
  decodePolyline,
  snapRouteToRoads,
  type Coord,
} from "../lib/geo.js";
import {
  discoverPlacesAlongRoute,
  discoverNearbyForPing,
  retryDiscovery,
} from "../lib/discovery.js";
import { awardJourneyGamification } from "../lib/gamification.js";
import logger from "../logger.js";

const router = Router();

function buildStaticMapUrl(polylineEncoded: string | null): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !polylineEncoded) return null;
  const base = "https://maps.googleapis.com/maps/api/staticmap";
  const styles = [
    "element:geometry|color:0x1A1510",
    "element:labels.text.fill|color:0xA08060",
    "element:labels.text.stroke|color:0x0D0A0B",
    "feature:road|element:geometry|color:0x2A2018",
    "feature:water|element:geometry|color:0x0A0E14",
    "feature:poi|visibility:off",
    "feature:transit|visibility:off",
  ];
  const size = "600x160";
  const stylePart = styles.map((s) => `style=${encodeURIComponent(s)}`).join("&");
  const pathPart = `path=weight:3|color:0xD4A017FF|enc:${encodeURIComponent(polylineEncoded)}`;
  return `${base}?size=${size}&scale=2&${stylePart}&${pathPart}&key=${key}`;
}

function makePhotoUrl(ref: string | null | undefined, width = 400): string | null {
  if (!ref) return null;
  const key = process.env.GOOGLE_MAPS_API_KEY ?? "";
  if (ref.includes("/")) {
    return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${width}&key=${key}`;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photoreference=${ref}&key=${key}`;
}

// GET /api/journeys — list of completed journeys with thumbnails
router.get("/", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const limit = Math.min(parseInt(String(req.query.limit ?? "50")), 100);

  const completed = await db
    .select()
    .from(journeys)
    .where(and(eq(journeys.userId, user.id), isNotNull(journeys.endedAt)))
    .orderBy(desc(journeys.startedAt))
    .limit(limit);

  if (completed.length === 0) {
    res.json({ journeys: [] });
    return;
  }

  const journeyIds = completed.map((j) => j.id);
  const placeCountRows = await db
    .select({ journeyId: journeyDiscoveredPlaces.journeyId, c: count() })
    .from(journeyDiscoveredPlaces)
    .where(inArray(journeyDiscoveredPlaces.journeyId, journeyIds))
    .groupBy(journeyDiscoveredPlaces.journeyId);

  const placeCountMap = new Map(placeCountRows.map((r) => [r.journeyId, Number(r.c)]));

  const result = completed.map((j) => {
    const durationSeconds =
      j.endedAt && j.startedAt
        ? Math.round((j.endedAt.getTime() - j.startedAt.getTime()) / 1000)
        : null;
    return {
      id: j.id,
      startedAt: j.startedAt,
      endedAt: j.endedAt,
      durationSeconds,
      totalDistanceM: j.totalDistanceM !== null ? parseFloat(String(j.totalDistanceM)) : null,
      placeCount: placeCountMap.get(j.id) ?? 0,
      xpEarned: j.xpEarned,
      discoveryStatus: j.discoveryStatus,
      staticMapUrl: buildStaticMapUrl(j.polylineEncoded),
    };
  });

  res.json({ journeys: result });
});

router.post("/", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const id = crypto.randomUUID();
  const [journey] = await db
    .insert(journeys)
    .values({ id, userId: user.id })
    .returning();
  res.json({ id: journey.id, startedAt: journey.startedAt });
});

router.patch("/:journeyId", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const journeyId = req.params.journeyId as string;

  const body = req.body as {
    status?: unknown;
    waypoints?: unknown;
  };

  if (body.status !== undefined && body.status !== "ended") {
    res.status(400).json({ error: "status must be 'ended' when provided" });
    return;
  }
  if (body.waypoints !== undefined && !Array.isArray(body.waypoints)) {
    res.status(400).json({ error: "waypoints must be an array when provided" });
    return;
  }
  if (body.status === undefined && !Array.isArray(body.waypoints)) {
    res.status(400).json({ error: "Provide status or waypoints" });
    return;
  }

  const status = body.status as "ended" | undefined;
  const incomingWaypoints =
    (body.waypoints as Array<{
      lat: unknown;
      lng: unknown;
      recordedAt: unknown;
    }>) ?? [];

  const [existing] = await db
    .select()
    .from(journeys)
    .where(and(eq(journeys.id, journeyId), eq(journeys.userId, user.id)));

  if (!existing) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }

  if (
    existing.endedAt !== null &&
    (status === "ended" || incomingWaypoints?.length)
  ) {
    res.status(409).json({ error: "Journey already ended" });
    return;
  }

  if (incomingWaypoints?.length) {
    const validWaypoints = incomingWaypoints.filter(
      (wp): wp is { lat: number; lng: number; recordedAt: string } => {
        if (
          typeof wp.lat !== "number" ||
          typeof wp.lng !== "number" ||
          typeof wp.recordedAt !== "string"
        )
          return false;
        const ts = new Date(wp.recordedAt);
        return (
          wp.lat >= -90 &&
          wp.lat <= 90 &&
          wp.lng >= -180 &&
          wp.lng <= 180 &&
          !isNaN(ts.getTime())
        );
      }
    );
    if (validWaypoints.length > 0) {
      const rows = validWaypoints.map((wp) => ({
        id: crypto.randomUUID(),
        journeyId,
        lat: String(wp.lat),
        lng: String(wp.lng),
        recordedAt: new Date(wp.recordedAt),
      }));
      await db
        .insert(journeyWaypoints)
        .values(rows)
        .onConflictDoNothing({
          target: [journeyWaypoints.journeyId, journeyWaypoints.recordedAt],
        });
    }
  }

  if (status === "ended") {
    const allWaypoints = await db
      .select()
      .from(journeyWaypoints)
      .where(eq(journeyWaypoints.journeyId, journeyId))
      .orderBy(journeyWaypoints.recordedAt);

    const coords: Coord[] = allWaypoints.map((wp) => ({
      lat: parseFloat(String(wp.lat)),
      lng: parseFloat(String(wp.lng)),
    }));

    const distM = coords.length >= 2 ? totalDistance(coords) : 0;
    let polylineEncoded = coords.length >= 2 ? encodePolyline(coords) : null;

    if (coords.length >= 2) {
      const snapped = await snapRouteToRoads(coords);
      if (snapped) polylineEncoded = encodePolyline(snapped);
    }

    await db
      .update(journeys)
      .set({
        endedAt: new Date(),
        totalDistanceM: String(distM.toFixed(2)),
        polylineEncoded,
        discoveryStatus: "pending",
      })
      .where(and(eq(journeys.id, journeyId), eq(journeys.userId, user.id)));

    const userId = user.id;

    // Step 1: Await discovery (not fire-and-forget) so gamification sees new places
    let placeCount = 0;
    if (polylineEncoded) {
      try {
        const disc = await discoverPlacesAlongRoute(journeyId, userId, polylineEncoded);
        placeCount = disc.placesFound;
      } catch (err) {
        logger.warn({ err }, "discoverPlacesAlongRoute failed during end-journey");
      }
    } else {
      await db
        .update(journeys)
        .set({ discoveryStatus: "completed" })
        .where(eq(journeys.id, journeyId))
        .catch((err) => logger.warn({ err }, "Short journey status finalization failed"));
    }

    // Step 2: Fetch current journey's ping count and compute duration
    const [journeyRow] = await db
      .select()
      .from(journeys)
      .where(eq(journeys.id, journeyId));

    const pingCount = journeyRow?.pingCount ?? 0;
    const startedAt = journeyRow?.startedAt ?? new Date();
    const durationSeconds = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);

    // Step 3: Award gamification
    let gamificationResult = {
      xpGained: 0,
      newLevel: 1,
      newBadges: [] as Array<{ key: string; name: string; description: string; icon: string }>,
      completedQuests: [] as Array<{ key: string; title: string; xpReward: number }>,
      newStreak: 0,
    };
    try {
      gamificationResult = await awardJourneyGamification(
        userId,
        journeyId,
        pingCount,
        distM,
        durationSeconds
      );
    } catch (err) {
      logger.warn({ err }, "awardJourneyGamification failed");
    }

    // Step 4: Store xpEarned on the journey
    await db
      .update(journeys)
      .set({ xpEarned: gamificationResult.xpGained })
      .where(eq(journeys.id, journeyId));

    res.json({
      id: journeyId,
      placeCount,
      totalDistanceM: distM,
      xpGained: gamificationResult.xpGained,
      newLevel: gamificationResult.newLevel,
      newBadges: gamificationResult.newBadges,
      completedQuests: gamificationResult.completedQuests,
      newStreak: gamificationResult.newStreak,
    });
    return;
  }

  const [fresh] = await db.select().from(journeys).where(eq(journeys.id, journeyId));
  const record = fresh ?? existing;
  res.json({
    ...record,
    totalDistanceM:
      record.totalDistanceM !== null
        ? parseFloat(String(record.totalDistanceM))
        : null,
    placeCount: 0,
  });
});

router.get("/history", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const completed = await db
    .select()
    .from(journeys)
    .where(and(eq(journeys.userId, user.id), isNotNull(journeys.endedAt)))
    .orderBy(desc(journeys.startedAt))
    .limit(20);

  const result = await Promise.all(
    completed
      .filter((j) => j.endedAt !== null)
      .map(async (j) => {
        let waypoints: Coord[];
        if (j.polylineEncoded) {
          waypoints = decodePolyline(j.polylineEncoded);
        } else {
          const raw = await db
            .select()
            .from(journeyWaypoints)
            .where(eq(journeyWaypoints.journeyId, j.id))
            .orderBy(journeyWaypoints.recordedAt);
          waypoints = raw
            .filter((_, i) => i % 3 === 0)
            .map((wp) => ({
              lat: parseFloat(String(wp.lat)),
              lng: parseFloat(String(wp.lng)),
            }));
        }
        return {
          id: j.id,
          startedAt: j.startedAt,
          waypoints,
          discoveryStatus: j.discoveryStatus,
        };
      })
  );

  res.json({ journeys: result });
});

router.get("/explored-cells", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat((req.query.radius as string) ?? "0.01");

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  const clampedRadius = Math.min(Math.max(radius, 0.001), 0.05);
  const CELL = 0.0005;

  const allWaypoints = await db
    .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
    .from(journeyWaypoints)
    .innerJoin(journeys, eq(journeyWaypoints.journeyId, journeys.id))
    .where(
      and(
        eq(journeys.userId, user.id),
        gte(journeyWaypoints.lat, String(lat - clampedRadius * 2)),
        lte(journeyWaypoints.lat, String(lat + clampedRadius * 2)),
        gte(journeyWaypoints.lng, String(lng - clampedRadius * 2)),
        lte(journeyWaypoints.lng, String(lng + clampedRadius * 2))
      )
    );

  const exploredSet = new Set<string>();
  for (const wp of allWaypoints) {
    const cellLat = Math.floor(parseFloat(String(wp.lat)) / CELL) * CELL;
    const cellLng = Math.floor(parseFloat(String(wp.lng)) / CELL) * CELL;
    exploredSet.add(`${cellLat.toFixed(4)},${cellLng.toFixed(4)}`);
  }

  const explored: Array<{ lat: number; lng: number }> = [];
  for (const key of exploredSet) {
    const [cLat, cLng] = key.split(",").map(Number);
    const dist = haversineDistance(lat, lng, cLat, cLng);
    if (dist <= clampedRadius * 111000) {
      explored.push({ lat: cLat, lng: cLng });
    }
  }

  const unexplored: Array<{ lat: number; lng: number }> = [];
  const steps = Math.ceil(clampedRadius / CELL);
  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      const cLat = Math.floor(lat / CELL) * CELL + i * CELL;
      const cLng = Math.floor(lng / CELL) * CELL + j * CELL;
      const key = `${cLat.toFixed(4)},${cLng.toFixed(4)}`;
      if (!exploredSet.has(key)) {
        const dist = haversineDistance(lat, lng, cLat, cLng);
        if (dist <= clampedRadius * 111000) {
          unexplored.push({ lat: cLat, lng: cLng });
        }
      }
    }
  }

  res.json({ explored, unexplored });
});

router.get("/:journeyId", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const journeyId = req.params.journeyId as string;

  const [journey] = await db
    .select()
    .from(journeys)
    .where(and(eq(journeys.id, journeyId), eq(journeys.userId, user.id)));

  if (!journey) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }

  // Decode waypoints
  let waypoints: Array<{ lat: number; lng: number }> = [];
  if (journey.polylineEncoded) {
    waypoints = decodePolyline(journey.polylineEncoded);
  } else {
    const raw = await db
      .select({ lat: journeyWaypoints.lat, lng: journeyWaypoints.lng })
      .from(journeyWaypoints)
      .where(eq(journeyWaypoints.journeyId, journeyId))
      .orderBy(journeyWaypoints.recordedAt);
    waypoints = raw.map((wp) => ({
      lat: parseFloat(String(wp.lat)),
      lng: parseFloat(String(wp.lng)),
    }));
  }

  // Fetch discovered places joined with cache
  const discovered = await db
    .select({
      googlePlaceId: journeyDiscoveredPlaces.googlePlaceId,
      discoveredAt: journeyDiscoveredPlaces.discoveredAt,
      name: placeCache.name,
      lat: placeCache.lat,
      lng: placeCache.lng,
      rating: placeCache.rating,
      primaryType: placeCache.primaryType,
      photoReference: placeCache.photoReference,
      address: placeCache.address,
    })
    .from(journeyDiscoveredPlaces)
    .innerJoin(placeCache, eq(journeyDiscoveredPlaces.googlePlaceId, placeCache.googlePlaceId))
    .where(eq(journeyDiscoveredPlaces.journeyId, journeyId));

  const places = discovered.map((p) => ({
    googlePlaceId: p.googlePlaceId,
    name: p.name,
    lat: parseFloat(String(p.lat)),
    lng: parseFloat(String(p.lng)),
    rating: p.rating !== null ? parseFloat(String(p.rating)) : null,
    primaryType: p.primaryType,
    photoUrl: makePhotoUrl(p.photoReference, 400),
    address: p.address,
    discoveredAt: p.discoveredAt,
  }));

  const durationSeconds =
    journey.endedAt && journey.startedAt
      ? Math.round((journey.endedAt.getTime() - journey.startedAt.getTime()) / 1000)
      : null;

  res.json({
    id: journey.id,
    startedAt: journey.startedAt,
    endedAt: journey.endedAt,
    durationSeconds,
    totalDistanceM: journey.totalDistanceM !== null ? parseFloat(String(journey.totalDistanceM)) : null,
    xpEarned: journey.xpEarned,
    pingCount: journey.pingCount,
    discoveryStatus: journey.discoveryStatus,
    waypoints,
    places,
    placeCount: places.length,
  });
});

router.post("/:journeyId/ping", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const journeyId = req.params.journeyId as string;
  const body = req.body as { lat?: unknown; lng?: unknown };

  const lat = typeof body.lat === "number" ? body.lat : parseFloat(String(body.lat));
  const lng = typeof body.lng === "number" ? body.lng : parseFloat(String(body.lng));

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  const [journey] = await db
    .select()
    .from(journeys)
    .where(and(eq(journeys.id, journeyId), eq(journeys.userId, user.id)));

  if (!journey) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }

  if (journey.endedAt !== null) {
    res.status(409).json({ error: "Journey already ended" });
    return;
  }

  try {
    const { places, newCount, apiError } = await discoverNearbyForPing(
      journeyId,
      user.id,
      lat,
      lng
    );
    if (apiError) {
      res.status(503).json({ error: "Places API unavailable — try again shortly" });
      return;
    }
    // Increment ping count on journey
    await db
      .update(journeys)
      .set({ pingCount: sql`${journeys.pingCount} + 1` })
      .where(eq(journeys.id, journeyId));
    res.json({ places, newCount });
  } catch (err) {
    logger.warn({ err }, "Ping discovery failed");
    res.status(500).json({ error: "Discovery failed" });
  }
});

router.post("/:journeyId/discover", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const journeyId = req.params.journeyId as string;

  try {
    const result = await retryDiscovery(journeyId, user.id);
    if (result.discoveryStatus === "failed") {
      res.status(502).json({
        ...result,
        error: "Discovery failed — Places API could not be reached. Try again later.",
      });
      return;
    }
    res.json(result);
  } catch (err) {
    const status =
      err !== null &&
      typeof err === "object" &&
      "status" in err &&
      typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : 500;
    const message =
      err instanceof Error ? err.message : "Discovery failed";
    res.status(status).json({ error: message });
  }
});

export default router;

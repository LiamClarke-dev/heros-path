import { Router, type Request, type Response } from "express";
import { db, journeys, journeyWaypoints } from "@workspace/db";
import { eq, and, desc, gte, lte, isNotNull } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import {
  haversineDistance,
  totalDistance,
  encodePolyline,
  decodePolyline,
  snapRouteToRoads,
  type Coord,
} from "../lib/geo.js";
import logger from "../logger.js";

const router = Router();

async function discoverPlacesAlongRoute(_journeyId: string, _coords: Coord[]) {
  // Stub — implemented in A4 (Place Discovery & Ping)
}

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
  const {
    status,
    waypoints: incomingWaypoints,
  } = req.body as {
    status?: "ended";
    waypoints?: Array<{ lat: number; lng: number; recordedAt: string }>;
  };

  const [existing] = await db
    .select()
    .from(journeys)
    .where(and(eq(journeys.id, journeyId), eq(journeys.userId, user.id)));

  if (!existing) {
    res.status(404).json({ error: "Journey not found" });
    return;
  }

  if (existing.endedAt !== null && (status === "ended" || incomingWaypoints?.length)) {
    res.status(409).json({ error: "Journey already ended" });
    return;
  }

  if (incomingWaypoints?.length) {
    const validWaypoints = incomingWaypoints.filter((wp) => {
      const ts = new Date(wp.recordedAt);
      return (
        typeof wp.lat === "number" &&
        typeof wp.lng === "number" &&
        wp.lat >= -90 && wp.lat <= 90 &&
        wp.lng >= -180 && wp.lng <= 180 &&
        !isNaN(ts.getTime())
      );
    });
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

    const [updated] = await db
      .update(journeys)
      .set({
        endedAt: new Date(),
        totalDistanceM: String(distM.toFixed(2)),
        polylineEncoded,
      })
      .where(and(eq(journeys.id, journeyId), eq(journeys.userId, user.id)))
      .returning();

    setImmediate(() => {
      discoverPlacesAlongRoute(journeyId, coords).catch((err) =>
        logger.warn({ err }, "discoverPlacesAlongRoute failed")
      );
    });

    const placeCount = 0;
    res.json({
      ...updated,
      placeCount,
      totalDistanceM: distM,
    });
    return;
  }

  const [fresh] = await db.select().from(journeys).where(eq(journeys.id, journeyId));
  const record = fresh ?? existing;
  res.json({
    ...record,
    totalDistanceM: record.totalDistanceM !== null ? parseFloat(String(record.totalDistanceM)) : null,
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
        return { id: j.id, startedAt: j.startedAt, waypoints };
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

export default router;

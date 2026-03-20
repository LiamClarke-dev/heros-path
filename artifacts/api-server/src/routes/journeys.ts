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

  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  const journeysWithCount = await Promise.all(
    journeys.map(async (j) => {
      const placeCountResult = await db
        .select({ count: count() })
        .from(journeyDiscoveredPlacesTable)
        .where(eq(journeyDiscoveredPlacesTable.journeyId, j.id));

      let staticMapUrl: string | null = null;
      if (j.polylineEncoded && apiKey) {
        const styles = [
          "feature:all|element:geometry|color:0x1A1510",
          "feature:all|element:labels.text.fill|color:0xA08060",
          "feature:road|element:geometry|color:0x3A2E20",
          "feature:road.highway|element:geometry|color:0x4A3C28",
          "feature:water|element:geometry|color:0x0A0E14",
          "feature:poi|visibility:off",
          "feature:transit|visibility:off",
        ];
        const styleParams = styles.map((s) => `style=${encodeURIComponent(s)}`).join("&");
        const pathParam = `path=color:0xD4A017ff|weight:3|enc:${encodeURIComponent(j.polylineEncoded)}`;
        staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&${pathParam}&${styleParams}&key=${apiKey}`;
      }

      return {
        ...j,
        placeCount: placeCountResult[0]?.count ?? 0,
        staticMapUrl,
        totalDistanceM: j.totalDistanceM ? Number(j.totalDistanceM) : null,
      };
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
    }
  }

  // Only call db.update() when there are journey-level fields to persist
  let updated: (typeof journeysTable.$inferSelect)[];
  if (Object.keys(updates).length > 0) {
    updated = await db
      .update(journeysTable)
      .set(updates)
      .where(eq(journeysTable.id, journeyId))
      .returning();
  } else {
    updated = existing;
  }

  // Trigger end-of-journey place discovery after polyline is persisted
  if (status === "ended" && updates.polylineEncoded) {
    void discoverPlacesAlongRoute(journeyId, user.id, updates.polylineEncoded).catch((err) =>
      console.error("end-of-journey discovery failed", err),
    );
  }

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

  const minRating = parseFloat(String(prefs[0]?.minRating ?? "0"));
  const placeTypes = prefs[0]?.placeTypes ?? [];
  const allowedTypesSet = placeTypes.length ? new Set(placeTypes) : null;

  // Exclude ALL places already known to this user (dismissed, snoozed, or previously found)
  // This ensures ping results only surface net-new discoveries.
  const knownPlaces = await db
    .select({ googlePlaceId: userDiscoveredPlacesTable.googlePlaceId })
    .from(userDiscoveredPlacesTable)
    .where(eq(userDiscoveredPlacesTable.userId, user.id));

  const knownIds = new Set(knownPlaces.map((d) => d.googlePlaceId));

  // For a single type, pass it as a filter to Google. For multiple types,
  // fetch without a type filter and post-filter by the allowed set.
  const typeQuery = placeTypes.length === 1 ? `&type=${placeTypes[0]}` : "";
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
    .filter((p) => !knownIds.has(p.place_id))
    .filter((p) => minRating === 0 || (p.rating ?? 0) >= minRating)
    .filter((p) => !allowedTypesSet || (p.types ?? []).some((t) => allowedTypesSet.has(t)))
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

  const journey = existing[0];

  // If journey has ended, check whether route discovery has run yet.
  // If no route discoveries exist (e.g., the fire-and-forget finished before polyline
  // was persisted), run it inline so the client gets deterministic results on first fetch.
  if (journey.endedAt != null && journey.polylineEncoded) {
    const hasRouteDiscoveries = await db
      .select({ googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId })
      .from(journeyDiscoveredPlacesTable)
      .where(
        and(
          eq(journeyDiscoveredPlacesTable.journeyId, journeyId),
          eq(journeyDiscoveredPlacesTable.discoverySource, "route"),
        ),
      )
      .limit(1);

    if (!hasRouteDiscoveries.length) {
      await discoverPlacesAlongRoute(journeyId, user.id, journey.polylineEncoded).catch((err) =>
        console.error("inline discovery failed", err),
      );
    }
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

// Default place type queries used when the user has no specific preferences set
const DEFAULT_ROUTE_QUERIES = ["restaurant", "cafe", "museum", "park", "tourist_attraction"];

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

// Response shape for the Google Places (New) API
interface PlacesNewApiResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    location?: { latitude: number; longitude: number };
    rating?: number;
    types?: string[];
    formattedAddress?: string;
    photos?: Array<{ name: string }>;
  }>;
}

/**
 * Uses the Google Places (New) API — Text Search with searchAlongRouteParameters —
 * to discover places along the journey's encoded polyline. Makes one request per
 * place-type category (up to 5), deduplicates, and stores results in the DB.
 */
async function discoverPlacesAlongRoute(
  journeyId: string,
  userId: string,
  encodedPolyline: string,
) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !encodedPolyline) return;

  const prefs = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId))
    .limit(1);

  const minRating = parseFloat(String(prefs[0]?.minRating ?? "0"));
  const placeTypes = prefs[0]?.placeTypes ?? [];

  // Use user's selected types (up to 5) or fall back to default discovery categories
  const queries = placeTypes.length > 0 ? placeTypes.slice(0, 5) : DEFAULT_ROUTE_QUERIES;

  // Globally deduplicate: exclude all places the user has already seen at any point,
  // including places discovered on previous journeys (favorited, dismissed, or viewed).
  const previouslySeen = await db
    .select({ googlePlaceId: userDiscoveredPlacesTable.googlePlaceId })
    .from(userDiscoveredPlacesTable)
    .where(eq(userDiscoveredPlacesTable.userId, userId));
  const seenIds = new Set(previouslySeen.map((d) => d.googlePlaceId));

  // Also exclude places already discovered in THIS journey (from pings)
  const alreadyFound = await db
    .select({ googlePlaceId: journeyDiscoveredPlacesTable.googlePlaceId })
    .from(journeyDiscoveredPlacesTable)
    .where(eq(journeyDiscoveredPlacesTable.journeyId, journeyId));
  const alreadyFoundIds = new Set(alreadyFound.map((d) => d.googlePlaceId));

  const allFound = new Map<string, PlaceResult>();

  const SEARCH_ALONG_ROUTE_URL = "https://places.googleapis.com/v1/places:searchText";
  const FIELD_MASK = "places.id,places.displayName,places.location,places.rating,places.types,places.formattedAddress,places.photos";

  for (const query of queries) {
    const res = await fetch(SEARCH_ALONG_ROUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 20,
        searchAlongRouteParameters: {
          polyline: { encodedPolyline },
        },
      }),
    }).catch(() => null);

    if (!res?.ok) continue;

    const data = (await res.json()) as PlacesNewApiResponse;

    for (const p of data.places ?? []) {
      if (!p.id || !p.location) continue;
      if (seenIds.has(p.id) || alreadyFoundIds.has(p.id) || allFound.has(p.id)) continue;
      // Apply rating filter (0 = no filter)
      if (minRating > 0 && (p.rating ?? 0) < minRating) continue;

      allFound.set(p.id, {
        googlePlaceId: p.id,
        name: p.displayName?.text ?? "Unknown Place",
        lat: p.location.latitude,
        lng: p.location.longitude,
        rating: p.rating ?? null,
        types: p.types ?? [],
        // photos[0].name is the resource name — store it for later rendering
        photoReference: p.photos?.[0]?.name ?? null,
        address: p.formattedAddress ?? null,
        distanceM: 0,
      });
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

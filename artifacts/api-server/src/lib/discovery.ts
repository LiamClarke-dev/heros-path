import { db, journeys, journeyWaypoints, placeCache, journeyDiscoveredPlaces, userDiscoveredPlaces, userPreferences, users } from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";
import logger from "../logger.js";
import { searchAlongRoute, searchNearby, type PlaceResult } from "./placesApi.js";
import { decodePolyline, encodePolyline, snapRouteToRoads, type Coord } from "./geo.js";

// TODO: route segment caching — cache which route segments have already been searched
// using a geospatial grid. Before calling the Places API for a point along a new route,
// check if that grid cell has been searched in the last 30 days. If yes, use cached results.
// This requires a `places_search_cache` table keyed by grid cell + timestamp.

const DEFAULT_ROUTE_QUERIES = [
  "restaurant",
  "cafe",
  "bar",
  "museum",
  "park",
  "tourist_attraction",
];

const DEFAULT_MAX_DISCOVERIES = 20;

const XP_NEW_PLACE = 25;

async function getUserPreferences(
  userId: string
): Promise<{ placeTypes: string[]; minRating: number; maxDiscoveries: number }> {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));
  if (!prefs) return { placeTypes: [], minRating: 0, maxDiscoveries: DEFAULT_MAX_DISCOVERIES };
  return {
    placeTypes: prefs.placeTypes ?? [],
    minRating: parseFloat(String(prefs.minRating ?? "0")),
    maxDiscoveries: prefs.maxDiscoveries ?? DEFAULT_MAX_DISCOVERIES,
  };
}

function deduplicatePlaces(places: PlaceResult[]): PlaceResult[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    if (seen.has(p.googlePlaceId)) return false;
    seen.add(p.googlePlaceId);
    return true;
  });
}

async function filterOutSeenPlaces(
  places: PlaceResult[],
  userId: string
): Promise<PlaceResult[]> {
  if (!places.length) return places;

  const existingGoogleIds = await db
    .select({ googlePlaceId: userDiscoveredPlaces.googlePlaceId })
    .from(userDiscoveredPlaces)
    .where(eq(userDiscoveredPlaces.userId, userId));

  const seenIds = new Set(existingGoogleIds.map((r) => r.googlePlaceId));

  return places.filter((p) => !seenIds.has(p.googlePlaceId));
}

function sortByPopularity(places: PlaceResult[]): PlaceResult[] {
  return [...places].sort((a, b) => {
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
  });
}

async function upsertPlacesToDB(
  places: PlaceResult[],
  journeyId: string,
  userId: string,
  source: "route" | "ping"
): Promise<{ newUserDiscoveries: number }> {
  if (!places.length) return { newUserDiscoveries: 0 };

  for (const place of places) {
    await db
      .insert(placeCache)
      .values({
        googlePlaceId: place.googlePlaceId,
        name: place.name,
        lat: String(place.lat),
        lng: String(place.lng),
        rating: place.rating !== null ? String(place.rating) : null,
        userRatingCount: place.userRatingCount,
        priceLevel: place.priceLevel,
        primaryType: place.primaryType,
        types: place.types,
        editorialSummary: place.editorialSummary,
        websiteUri: place.websiteUri,
        googleMapsUri: place.googleMapsUri,
        phoneNumber: place.phoneNumber,
        photoReference: place.photoReference,
        address: place.address,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: placeCache.googlePlaceId,
        set: {
          name: place.name,
          lat: String(place.lat),
          lng: String(place.lng),
          rating: place.rating !== null ? String(place.rating) : null,
          userRatingCount: place.userRatingCount,
          priceLevel: place.priceLevel,
          primaryType: place.primaryType,
          types: place.types,
          editorialSummary: place.editorialSummary,
          websiteUri: place.websiteUri,
          googleMapsUri: place.googleMapsUri,
          phoneNumber: place.phoneNumber,
          photoReference: place.photoReference,
          address: place.address,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .insert(journeyDiscoveredPlaces)
    .values(
      places.map((p) => ({
        id: crypto.randomUUID(),
        journeyId,
        googlePlaceId: p.googlePlaceId,
        userId,
        discoverySource: source,
      }))
    )
    .onConflictDoNothing({
      target: [journeyDiscoveredPlaces.journeyId, journeyDiscoveredPlaces.googlePlaceId],
    });

  const upsertResult = await db
    .insert(userDiscoveredPlaces)
    .values(
      places.map((p) => ({
        id: crypto.randomUUID(),
        userId,
        googlePlaceId: p.googlePlaceId,
        firstDiscoveredAt: new Date(),
        lastDiscoveredAt: new Date(),
        discoveryCount: 1,
      }))
    )
    .onConflictDoUpdate({
      target: [userDiscoveredPlaces.userId, userDiscoveredPlaces.googlePlaceId],
      set: {
        lastDiscoveredAt: new Date(),
        discoveryCount: sql`${userDiscoveredPlaces.discoveryCount} + 1`,
      },
    })
    .returning({ isInsert: sql<boolean>`(xmax = 0)` });

  const newUserDiscoveries = upsertResult.filter((r) => r.isInsert).length;
  return { newUserDiscoveries };
}

async function countNewPlaces(
  places: PlaceResult[],
  userId: string
): Promise<number> {
  if (!places.length) return 0;
  const existing = await db
    .select({ googlePlaceId: userDiscoveredPlaces.googlePlaceId })
    .from(userDiscoveredPlaces)
    .where(eq(userDiscoveredPlaces.userId, userId));
  const existingSet = new Set(existing.map((r) => r.googlePlaceId));
  return places.filter((p) => !existingSet.has(p.googlePlaceId)).length;
}

export async function discoverPlacesAlongRoute(
  journeyId: string,
  userId: string,
  encodedPolyline: string
): Promise<{ placesFound: number; newUserDiscoveries: number }> {
  logger.info(`[discovery] Starting route discovery for journey ${journeyId}`);

  await db
    .update(journeys)
    .set({ discoveryStatus: "pending" })
    .where(eq(journeys.id, journeyId));

  try {
    const { placeTypes, minRating, maxDiscoveries } = await getUserPreferences(userId);
    const queries = placeTypes.length > 0 ? placeTypes : DEFAULT_ROUTE_QUERIES;

    const allPlaces: PlaceResult[] = [];
    let errorCount = 0;

    for (const query of queries) {
      const { places, apiError } = await searchAlongRoute(encodedPolyline, query);
      if (apiError) {
        errorCount++;
      } else {
        logger.info(`[discovery] Route search "${query}": ${places.length} raw result(s)`);
        allPlaces.push(...places);
      }
    }

    if (errorCount === queries.length) {
      await db
        .update(journeys)
        .set({ discoveryStatus: "failed" })
        .where(eq(journeys.id, journeyId));
      logger.warn(
        `[discovery] Failed: all ${queries.length} API calls errored, status → failed`
      );
      return { placesFound: 0, newUserDiscoveries: 0 };
    }

    const deduped = deduplicatePlaces(allPlaces);

    if (deduped.length === 0) {
      logger.info("[discovery] Route queries returned 0 raw results — trying nearby fallback");

      {
        const coords = decodePolyline(encodedPolyline);
        const endCoord = coords[coords.length - 1];
        if (endCoord) {
          const { places: fallbackPlaces, apiError: fallbackError } =
            await searchNearby(endCoord.lat, endCoord.lng, 500);
          if (fallbackError) {
            await db
              .update(journeys)
              .set({ discoveryStatus: "failed" })
              .where(eq(journeys.id, journeyId));
            logger.warn("[discovery] Nearby fallback API error, status → failed");
            return { placesFound: 0, newUserDiscoveries: 0 };
          }
          logger.info(`[discovery] Nearby fallback: ${fallbackPlaces.length} result(s)`);
          const fallbackFiltered =
            minRating > 0
              ? fallbackPlaces.filter(
                  (p) => p.rating !== null && p.rating >= minRating
                )
              : fallbackPlaces;

          const fallbackNewToUser = await filterOutSeenPlaces(fallbackFiltered, userId);
          const fallbackSorted = sortByPopularity(fallbackNewToUser);
          const fallbackCapped = maxDiscoveries > 0
            ? fallbackSorted.slice(0, maxDiscoveries)
            : fallbackSorted;

          if (fallbackCapped.length > 0) {
            const { newUserDiscoveries } = await upsertPlacesToDB(
              fallbackCapped, journeyId, userId, "route"
            );
            await db
              .update(journeys)
              .set({ discoveryStatus: "completed" })
              .where(eq(journeys.id, journeyId));
            logger.info(
              `[discovery] Completed: ${fallbackCapped.length} places via fallback, ${newUserDiscoveries} new to user, status → completed`
            );
            return { placesFound: fallbackCapped.length, newUserDiscoveries };
          }
        }
      }

      await db
        .update(journeys)
        .set({ discoveryStatus: "completed" })
        .where(eq(journeys.id, journeyId));
      logger.info("[discovery] Completed: 0 places found, status → completed");
      return { placesFound: 0, newUserDiscoveries: 0 };
    }

    const filtered =
      minRating > 0
        ? deduped.filter((p) => p.rating !== null && p.rating >= minRating)
        : deduped;

    const newToUser = await filterOutSeenPlaces(filtered, userId);
    const sorted = sortByPopularity(newToUser);
    const capped = maxDiscoveries > 0 ? sorted.slice(0, maxDiscoveries) : sorted;

    const { newUserDiscoveries } = capped.length > 0
      ? await upsertPlacesToDB(capped, journeyId, userId, "route")
      : { newUserDiscoveries: 0 };

    await db
      .update(journeys)
      .set({ discoveryStatus: "completed" })
      .where(eq(journeys.id, journeyId));
    logger.info(
      `[discovery] Completed: ${capped.length} places stored (${deduped.length} raw, ${filtered.length} rated, ${newToUser.length} new-to-user, cap=${maxDiscoveries}), ${newUserDiscoveries} new discoveries, status → completed`
    );
    return { placesFound: capped.length, newUserDiscoveries };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(journeys)
      .set({ discoveryStatus: "failed" })
      .where(eq(journeys.id, journeyId));
    logger.error({ err }, `[discovery] Failed: ${msg}, status → failed`);
    return { placesFound: 0, newUserDiscoveries: 0 };
  }
}

export async function discoverNearbyForPing(
  journeyId: string,
  userId: string,
  lat: number,
  lng: number
): Promise<{ places: PlaceResult[]; newCount: number; apiError: boolean; apiKeyMissing: boolean }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    logger.error("[ping] GOOGLE_MAPS_API_KEY is not set — cannot reach Google Places API");
    return { places: [], newCount: 0, apiError: true, apiKeyMissing: true };
  }

  logger.info({ journeyId, userId, lat, lng }, "[ping] Calling searchNearby (radius=200m)");

  const { minRating } = await getUserPreferences(userId);

  const { places, apiError } = await searchNearby(lat, lng, 200);
  if (apiError) {
    logger.warn({ journeyId, lat, lng }, "[ping] searchNearby returned apiError — Google Places API call failed");
    return { places: [], newCount: 0, apiError: true, apiKeyMissing: false };
  }

  logger.info({ journeyId, rawCount: places.length, minRating }, "[ping] searchNearby succeeded");

  const filtered =
    minRating > 0
      ? places.filter((p) => p.rating !== null && p.rating >= minRating)
      : places;

  logger.info({ journeyId, filteredCount: filtered.length }, "[ping] After rating filter");

  if (!filtered.length) return { places: filtered, newCount: 0, apiError: false, apiKeyMissing: false };

  const newToUser = await filterOutSeenPlaces(filtered, userId);
  if (!newToUser.length) return { places: [], newCount: 0, apiError: false, apiKeyMissing: false };

  await upsertPlacesToDB(newToUser, journeyId, userId, "ping");
  logger.info({ journeyId, placesFound: newToUser.length }, "[ping] Completed successfully");
  return { places: newToUser, newCount: newToUser.length, apiError: false, apiKeyMissing: false };
}

export async function retryDiscovery(
  journeyId: string,
  userId: string
): Promise<{
  discoveryStatus: string;
  placesFound: number;
  newPlaces: number;
  xpAwarded: number;
}> {
  const [journey] = await db
    .select()
    .from(journeys)
    .where(and(eq(journeys.id, journeyId), eq(journeys.userId, userId)));

  if (!journey) throw Object.assign(new Error("Journey not found"), { status: 404 });
  if (journey.endedAt === null) {
    throw Object.assign(new Error("Journey is still active — end it before retrying discovery"), { status: 409 });
  }
  if (journey.discoveryStatus === "completed") {
    throw Object.assign(new Error("Discovery already completed"), { status: 409 });
  }

  let encodedPolyline = journey.polylineEncoded;

  if (!encodedPolyline) {
    const wps = await db
      .select()
      .from(journeyWaypoints)
      .where(eq(journeyWaypoints.journeyId, journeyId))
      .orderBy(asc(journeyWaypoints.recordedAt));

    if (!wps.length) {
      throw Object.assign(new Error("No route data available"), { status: 422 });
    }

    const coords: Coord[] = wps.map((wp) => ({
      lat: parseFloat(String(wp.lat)),
      lng: parseFloat(String(wp.lng)),
    }));

    let poly = encodePolyline(coords);
    const snapped = await snapRouteToRoads(coords);
    if (snapped) poly = encodePolyline(snapped);
    encodedPolyline = poly;
  }

  const { placesFound, newUserDiscoveries: newPlaces } = await discoverPlacesAlongRoute(
    journeyId,
    userId,
    encodedPolyline
  );

  const xpAwarded = newPlaces * XP_NEW_PLACE;

  if (xpAwarded > 0) {
    await db
      .update(users)
      .set({ xp: sql`${users.xp} + ${xpAwarded}` })
      .where(eq(users.id, userId));
  }

  const [updated] = await db
    .select({ discoveryStatus: journeys.discoveryStatus })
    .from(journeys)
    .where(eq(journeys.id, journeyId));

  return {
    discoveryStatus: updated?.discoveryStatus ?? "failed",
    placesFound,
    newPlaces,
    xpAwarded,
  };
}

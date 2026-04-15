import { db, journeys, journeyWaypoints, placeCache, journeyDiscoveredPlaces, userDiscoveredPlaces, userPreferences, users } from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";
import logger from "../logger.js";
import { searchAlongRoute, searchNearby, type PlaceResult } from "./placesApi.js";
import { decodePolyline, encodePolyline, snapRouteToRoads, type Coord } from "./geo.js";

const DEFAULT_ROUTE_QUERIES = [
  "restaurant",
  "cafe",
  "bar",
  "museum",
  "park",
  "tourist_attraction",
];

const XP_NEW_PLACE = 25;

async function getUserPreferences(
  userId: string
): Promise<{ placeTypes: string[]; minRating: number }> {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));
  if (!prefs) return { placeTypes: [], minRating: 0 };
  return {
    placeTypes: prefs.placeTypes ?? [],
    minRating: parseFloat(String(prefs.minRating ?? "0")),
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

  const inserted = await db
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
    .onConflictDoNothing({
      target: [userDiscoveredPlaces.userId, userDiscoveredPlaces.googlePlaceId],
    })
    .returning({ googlePlaceId: userDiscoveredPlaces.googlePlaceId });

  return { newUserDiscoveries: inserted.length };
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
    const { placeTypes, minRating } = await getUserPreferences(userId);
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

    const deduped = deduplicatePlaces(allPlaces);
    const filtered =
      minRating > 0
        ? deduped.filter((p) => p.rating !== null && p.rating >= minRating)
        : deduped;

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

    if (filtered.length === 0) {
      logger.info("[discovery] All queries returned 0 results — trying nearby fallback");

      const [journey] = await db
        .select()
        .from(journeys)
        .where(eq(journeys.id, journeyId));

      if (journey?.polylineEncoded) {
        const coords = decodePolyline(journey.polylineEncoded);
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
          if (fallbackFiltered.length > 0) {
            const { newUserDiscoveries } = await upsertPlacesToDB(
              fallbackFiltered, journeyId, userId, "route"
            );
            await db
              .update(journeys)
              .set({ discoveryStatus: "completed" })
              .where(eq(journeys.id, journeyId));
            logger.info(
              `[discovery] Completed: ${fallbackFiltered.length} places via fallback, ${newUserDiscoveries} new to user, status → completed`
            );
            return { placesFound: fallbackFiltered.length, newUserDiscoveries };
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

    const { newUserDiscoveries } = filtered.length > 0
      ? await upsertPlacesToDB(filtered, journeyId, userId, "route")
      : { newUserDiscoveries: 0 };

    await db
      .update(journeys)
      .set({ discoveryStatus: "completed" })
      .where(eq(journeys.id, journeyId));
    logger.info(
      `[discovery] Completed: ${filtered.length} places found, ${newUserDiscoveries} new to user, status → completed`
    );
    return { placesFound: filtered.length, newUserDiscoveries };
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
): Promise<{ places: PlaceResult[]; newCount: number }> {
  const { minRating } = await getUserPreferences(userId);

  const { places, apiError } = await searchNearby(lat, lng, 200);
  if (apiError) return { places: [], newCount: 0 };

  const filtered =
    minRating > 0
      ? places.filter((p) => p.rating !== null && p.rating >= minRating)
      : places;

  if (!filtered.length) return { places: filtered, newCount: 0 };

  const newCount = await countNewPlaces(filtered, userId);
  await upsertPlacesToDB(filtered, journeyId, userId, "ping");
  return { places: filtered, newCount };
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

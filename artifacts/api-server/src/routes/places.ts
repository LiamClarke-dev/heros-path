import { Router, type Request, type Response } from "express";
import {
  db,
  placeCache,
  userPreferences,
  userDiscoveredPlaces,
  userPlaceStates,
  placeVisits,
  placeListItems,
  placeLists,
} from "@workspace/db";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import { fetchPlaceDetail, fetchOpeningHours } from "../lib/placesApi.js";

const router = Router();

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const TYPE_CATEGORY_MAP: Record<string, string[]> = {
  food: ["restaurant", "cafe", "bar", "bakery", "night_club", "food", "fast_food_restaurant", "coffee_shop", "sandwich_shop", "pizza_restaurant", "hamburger_restaurant", "sushi_restaurant", "ramen_restaurant", "thai_restaurant", "chinese_restaurant", "indian_restaurant", "italian_restaurant", "steak_house", "seafood_restaurant", "breakfast_restaurant", "brunch_restaurant", "vegetarian_restaurant", "vegan_restaurant", "ice_cream_shop", "donut_shop", "bagel_shop", "wine_bar", "cocktail_bar", "pub", "brewery", "winery", "distillery"],
  parks: ["park", "national_park", "state_park", "hiking_area", "nature_reserve", "campground", "picnic_ground", "dog_park", "botanical_garden", "garden", "playground"],
  culture: ["museum", "tourist_attraction", "library", "movie_theater", "art_gallery", "performing_arts_theater", "cultural_center", "historical_landmark", "monument", "aquarium", "zoo", "amusement_park", "concert_hall", "opera_house"],
  shopping: ["shopping_mall", "store", "clothing_store", "supermarket", "department_store", "convenience_store", "book_store", "electronics_store", "furniture_store", "home_goods_store", "jewelry_store", "shoe_store", "sporting_goods_store", "market", "gift_shop", "toy_store"],
  fitness: ["gym", "fitness_center", "health", "sports_activity_location", "sports_club", "swimming_pool", "yoga_studio", "cycling_studio", "pilates_studio", "rock_climbing_gym"],
};

function makePhotoUrl(ref: string | null | undefined, width = 400): string | null {
  if (!ref) return null;
  const key = process.env.GOOGLE_MAPS_API_KEY ?? "";
  if (ref.includes("/")) {
    return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${width}&key=${key}`;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photoreference=${ref}&key=${key}`;
}

router.get("/discovered", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const filter = (req.query.filter as string) ?? "all";
  const journeyId = (req.query.journeyId as string) ?? null;
  const typeCategory = (req.query.type as string) ?? null;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  const offset = (page - 1) * limit;

  const notDismissed = or(
    isNull(userPlaceStates.isDismissed),
    eq(userPlaceStates.isDismissed, false)
  );

  const notActivelySnoozed = or(
    isNull(userPlaceStates.isSnoozed),
    eq(userPlaceStates.isSnoozed, false),
    isNull(userPlaceStates.snoozeUntil),
    sql`${userPlaceStates.snoozeUntil} <= now()`
  );

  const activelySnoozed = and(
    eq(userPlaceStates.isSnoozed, true),
    sql`${userPlaceStates.snoozeUntil} > now()`
  );

  const filterWhere =
    filter === "favorites"
      ? and(notDismissed, notActivelySnoozed, eq(userPlaceStates.isFavorited, true))
      : filter === "snoozed"
      ? and(notDismissed, activelySnoozed)
      : and(notDismissed, notActivelySnoozed);

  const typeWhere =
    typeCategory && TYPE_CATEGORY_MAP[typeCategory]
      ? sql`${placeCache.primaryType} = ANY(ARRAY[${sql.join(
          TYPE_CATEGORY_MAP[typeCategory].map((t) => sql`${t}`),
          sql`, `
        )}])`
      : undefined;

  const journeyWhere = journeyId
    ? sql`EXISTS (
        SELECT 1 FROM journey_discovered_places jdp
        WHERE jdp.google_place_id = ${placeCache.googlePlaceId}
          AND jdp.journey_id = ${journeyId}
          AND jdp.user_id = ${user.id}
      )`
    : undefined;

  const whereCondition = and(
    eq(userDiscoveredPlaces.userId, user.id),
    filterWhere,
    typeWhere,
    journeyWhere
  );

  const baseJoin = db
    .select({
      googlePlaceId: placeCache.googlePlaceId,
      name: placeCache.name,
      lat: placeCache.lat,
      lng: placeCache.lng,
      rating: placeCache.rating,
      types: placeCache.types,
      primaryType: placeCache.primaryType,
      photoReference: placeCache.photoReference,
      address: placeCache.address,
      discoveryCount: userDiscoveredPlaces.discoveryCount,
      firstDiscoveredAt: userDiscoveredPlaces.firstDiscoveredAt,
      lastDiscoveredAt: userDiscoveredPlaces.lastDiscoveredAt,
      isFavorited: userPlaceStates.isFavorited,
      isDismissed: userPlaceStates.isDismissed,
      isSnoozed: userPlaceStates.isSnoozed,
      snoozeUntil: userPlaceStates.snoozeUntil,
      visitCount: sql<number>`COALESCE((SELECT COUNT(*) FROM ${placeVisits} WHERE ${placeVisits.googlePlaceId} = ${placeCache.googlePlaceId} AND ${placeVisits.userId} = ${user.id}), 0)::int`,
      lastVisitedAt: sql<string | null>`(SELECT MAX(visited_at) FROM ${placeVisits} WHERE google_place_id = ${placeCache.googlePlaceId} AND user_id = ${user.id})`,
      listIds: sql<string[]>`COALESCE(ARRAY(SELECT pli.list_id::text FROM ${placeListItems} pli INNER JOIN ${placeLists} pl ON pl.id = pli.list_id WHERE pli.google_place_id = ${placeCache.googlePlaceId} AND pl.user_id = ${user.id}), ARRAY[]::text[])`,
    })
    .from(userDiscoveredPlaces)
    .innerJoin(placeCache, eq(userDiscoveredPlaces.googlePlaceId, placeCache.googlePlaceId))
    .leftJoin(
      userPlaceStates,
      and(
        eq(userPlaceStates.userId, user.id),
        eq(userPlaceStates.googlePlaceId, placeCache.googlePlaceId)
      )
    );

  const [rows, countRow] = await Promise.all([
    baseJoin
      .where(whereCondition)
      .orderBy(sql`${userDiscoveredPlaces.lastDiscoveredAt} DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(userDiscoveredPlaces)
      .innerJoin(placeCache, eq(userDiscoveredPlaces.googlePlaceId, placeCache.googlePlaceId))
      .leftJoin(
        userPlaceStates,
        and(
          eq(userPlaceStates.userId, user.id),
          eq(userPlaceStates.googlePlaceId, placeCache.googlePlaceId)
        )
      )
      .where(whereCondition),
  ]);

  const total = countRow[0]?.total ?? 0;

  const places = rows.map((p) => ({
    ...p,
    lat: parseFloat(String(p.lat)),
    lng: parseFloat(String(p.lng)),
    rating: p.rating !== null ? parseFloat(String(p.rating)) : null,
    isFavorited: p.isFavorited ?? false,
    isDismissed: p.isDismissed ?? false,
    isSnoozed: p.isSnoozed ?? false,
    visitCount: Number(p.visitCount ?? 0),
    lastVisitedAt: p.lastVisitedAt ?? null,
    photoUrl: makePhotoUrl(p.photoReference),
    listIds: (p.listIds as string[]) ?? [],
  }));

  res.json({ places, total, page });
});

router.get("/:googlePlaceId/state", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const googlePlaceId = req.params.googlePlaceId as string;

  const [stateRow] = await db
    .select()
    .from(userPlaceStates)
    .where(
      and(eq(userPlaceStates.userId, user.id), eq(userPlaceStates.googlePlaceId, googlePlaceId))
    );

  res.json({
    isFavorited: stateRow?.isFavorited ?? false,
    isDismissed: stateRow?.isDismissed ?? false,
    isSnoozed: stateRow?.isSnoozed ?? false,
  });
});

router.post("/:googlePlaceId/state", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const googlePlaceId = req.params.googlePlaceId as string;
  const { action, snoozeFor } = req.body as {
    action?: string;
    snoozeFor?: string;
  };

  const validActions = ["favorite", "unfavorite", "dismiss", "snooze", "unsnooze"];
  if (!action || !validActions.includes(action)) {
    res.status(400).json({ error: `action must be one of: ${validActions.join(", ")}` });
    return;
  }

  let snoozeUntil: Date | null = null;
  if (action === "snooze") {
    const now = new Date();
    if (snoozeFor === "1day") snoozeUntil = new Date(now.getTime() + 86400000);
    else if (snoozeFor === "1week") snoozeUntil = new Date(now.getTime() + 7 * 86400000);
    else if (snoozeFor === "1month") snoozeUntil = new Date(now.getTime() + 30 * 86400000);
    else {
      res.status(400).json({ error: "snoozeFor must be 1day | 1week | 1month" });
      return;
    }
  }

  const updates: {
    isFavorited?: boolean;
    isDismissed?: boolean;
    isSnoozed?: boolean;
    snoozeUntil?: Date | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  switch (action) {
    case "favorite":    updates.isFavorited = true; break;
    case "unfavorite":  updates.isFavorited = false; break;
    case "dismiss":     updates.isDismissed = true; break;
    case "snooze":      updates.isSnoozed = true; updates.snoozeUntil = snoozeUntil; break;
    case "unsnooze":    updates.isSnoozed = false; updates.snoozeUntil = null; break;
  }

  try {
    await db
      .insert(userPlaceStates)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        googlePlaceId,
        ...updates,
      })
      .onConflictDoUpdate({
        target: [userPlaceStates.userId, userPlaceStates.googlePlaceId],
        set: updates,
      });
  } catch (err) {
    const pgCode =
      (err as { code?: string }).code ??
      (err as { cause?: { code?: string } }).cause?.code;
    if (pgCode === "23503") {
      res.status(404).json({ error: "Place not found in cache" });
      return;
    }
    throw err;
  }

  res.json({ ok: true });
});

router.get("/:googlePlaceId", async (req: Request, res: Response) => {
  const googlePlaceId = req.params.googlePlaceId as string;

  const [cached] = await db
    .select()
    .from(placeCache)
    .where(eq(placeCache.googlePlaceId, googlePlaceId));

  const cacheAge = cached?.updatedAt
    ? Date.now() - new Date(cached.updatedAt).getTime()
    : Infinity;

  if (cached && cacheAge < CACHE_MAX_AGE_MS) {
    const hours = await fetchOpeningHours(googlePlaceId);

    res.json({
      googlePlaceId: cached.googlePlaceId,
      name: cached.name,
      lat: parseFloat(String(cached.lat)),
      lng: parseFloat(String(cached.lng)),
      rating: cached.rating !== null ? parseFloat(String(cached.rating)) : null,
      userRatingCount: cached.userRatingCount,
      priceLevel: cached.priceLevel,
      primaryType: cached.primaryType,
      types: cached.types,
      editorialSummary: cached.editorialSummary,
      websiteUri: cached.websiteUri,
      googleMapsUri: cached.googleMapsUri,
      phoneNumber: cached.phoneNumber,
      address: cached.address,
      photoUrl: makePhotoUrl(cached.photoReference, 800),
      openNow: hours.openNow,
      openingHoursText: hours.openingHoursText,
    });
    return;
  }

  const place = await fetchPlaceDetail(googlePlaceId);
  if (!place) {
    if (cached) {
      res.json({
        googlePlaceId: cached.googlePlaceId,
        name: cached.name,
        lat: parseFloat(String(cached.lat)),
        lng: parseFloat(String(cached.lng)),
        rating: cached.rating !== null ? parseFloat(String(cached.rating)) : null,
        userRatingCount: cached.userRatingCount,
        priceLevel: cached.priceLevel,
        primaryType: cached.primaryType,
        types: cached.types,
        editorialSummary: cached.editorialSummary,
        websiteUri: cached.websiteUri,
        googleMapsUri: cached.googleMapsUri,
        phoneNumber: cached.phoneNumber,
        address: cached.address,
        photoUrl: makePhotoUrl(cached.photoReference, 800),
        openNow: null,
        openingHoursText: null,
      });
      return;
    }
    res.status(404).json({ error: "Place not found" });
    return;
  }

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

  res.json(place);
});

export const preferencesRouter = Router();

preferencesRouter.get("/preferences", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));

  res.json({
    placeTypes: prefs?.placeTypes ?? [],
    minRating: prefs?.minRating !== undefined
      ? parseFloat(String(prefs.minRating))
      : 0,
    maxDiscoveries: prefs?.maxDiscoveries ?? 20,
  });
});

preferencesRouter.put("/preferences", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const body = req.body as { placeTypes?: unknown; minRating?: unknown; maxDiscoveries?: unknown };

  const placeTypes = Array.isArray(body.placeTypes)
    ? (body.placeTypes as unknown[])
        .filter((t): t is string => typeof t === "string")
    : undefined;

  const minRatingRaw = body.minRating;
  let minRating: string | undefined;
  if (typeof minRatingRaw === "number" && !isNaN(minRatingRaw)) {
    const clamped = Math.min(Math.max(minRatingRaw, 0), 5);
    minRating = clamped.toFixed(1);
  }

  let maxDiscoveries: number | undefined;
  const maxDiscoveriesRaw = body.maxDiscoveries;
  if (typeof maxDiscoveriesRaw === "number" && !isNaN(maxDiscoveriesRaw)) {
    maxDiscoveries = Math.max(0, Math.floor(maxDiscoveriesRaw));
  }

  if (placeTypes === undefined && minRating === undefined && maxDiscoveries === undefined) {
    res.status(400).json({ error: "Provide placeTypes, minRating, or maxDiscoveries" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (placeTypes !== undefined) updates.placeTypes = placeTypes;
    if (minRating !== undefined) updates.minRating = minRating;
    if (maxDiscoveries !== undefined) updates.maxDiscoveries = maxDiscoveries;
    const [updated] = await db
      .update(userPreferences)
      .set(updates)
      .where(eq(userPreferences.userId, user.id))
      .returning();
    res.json({
      placeTypes: updated.placeTypes ?? [],
      minRating: parseFloat(String(updated.minRating ?? "0")),
      maxDiscoveries: updated.maxDiscoveries ?? 20,
    });
  } else {
    const [created] = await db
      .insert(userPreferences)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        placeTypes: placeTypes ?? [],
        minRating: minRating ?? "0",
        maxDiscoveries: maxDiscoveries ?? 20,
      })
      .returning();
    res.json({
      placeTypes: created.placeTypes ?? [],
      minRating: parseFloat(String(created.minRating ?? "0")),
      maxDiscoveries: created.maxDiscoveries ?? 20,
    });
  }
});

export default router;

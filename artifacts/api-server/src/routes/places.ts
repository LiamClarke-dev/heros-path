import { Router, type Request, type Response } from "express";
import { db, placeCache, userPreferences } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import { fetchPlaceDetail, fetchOpeningHours } from "../lib/placesApi.js";
import logger from "../logger.js";

const router = Router();

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";
    const photoRef = cached.photoReference;
    const photoUrl =
      photoRef && photoRef.includes("/")
        ? `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=800&key=${apiKey}`
        : null;

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
      photoUrl,
      openNow: hours.openNow,
      openingHoursText: hours.openingHoursText,
    });
    return;
  }

  const place = await fetchPlaceDetail(googlePlaceId);
  if (!place) {
    if (cached) {
      const staleApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";
      const staleRef = cached.photoReference;
      const stalePhotoUrl =
        staleRef && staleRef.includes("/")
          ? `https://places.googleapis.com/v1/${staleRef}/media?maxWidthPx=800&key=${staleApiKey}`
          : null;
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
        photoUrl: stalePhotoUrl,
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
  });
});

preferencesRouter.put("/preferences", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const body = req.body as { placeTypes?: unknown; minRating?: unknown };

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

  if (placeTypes === undefined && minRating === undefined) {
    res.status(400).json({ error: "Provide placeTypes or minRating" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));

  if (existing) {
    const updates: Partial<typeof existing> = {};
    if (placeTypes !== undefined) updates.placeTypes = placeTypes;
    if (minRating !== undefined) updates.minRating = minRating;
    const [updated] = await db
      .update(userPreferences)
      .set(updates)
      .where(eq(userPreferences.userId, user.id))
      .returning();
    res.json({
      placeTypes: updated.placeTypes ?? [],
      minRating: parseFloat(String(updated.minRating ?? "0")),
    });
  } else {
    const [created] = await db
      .insert(userPreferences)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        placeTypes: placeTypes ?? [],
        minRating: minRating ?? "0",
      })
      .returning();
    res.json({
      placeTypes: created.placeTypes ?? [],
      minRating: parseFloat(String(created.minRating ?? "0")),
    });
  }
});

export default router;

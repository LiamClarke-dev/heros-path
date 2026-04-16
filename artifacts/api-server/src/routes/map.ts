import { Router, type Request, type Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import {
  getZonesForLocation,
  getAllZonesForUser,
  inferCityFromCoords,
} from "../lib/zoneExploration.js";
import { db, userPreferences } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import logger from "../logger.js";

const router = Router();

router.get("/zones", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const city = req.query.city as string | undefined;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;

  let resolvedCity = city;
  if (!resolvedCity && lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
    resolvedCity = inferCityFromCoords(lat, lng) ?? undefined;
  }

  if (!resolvedCity) {
    res.status(400).json({ error: "city parameter or valid lat/lng required" });
    return;
  }

  try {
    const data = await getZonesForLocation(user.id, resolvedCity, lat, lng);
    res.json({ city: resolvedCity, zones: data });
  } catch (err) {
    logger.warn({ err }, "getZonesForLocation failed");
    res.status(500).json({ error: "Failed to load zone data" });
  }
});

router.get("/preferences/tokyo-wards", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const [prefs] = await db
    .select({ tokyoWards: userPreferences.tokyoWards })
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));
  res.json({ tokyoWards: prefs?.tokyoWards ?? [] });
});

router.put("/preferences/tokyo-wards", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { wards } = req.body as { wards: string[] };

  if (!Array.isArray(wards)) {
    res.status(400).json({ error: "wards must be an array of ward IDs" });
    return;
  }

  await db
    .insert(userPreferences)
    .values({
      userId: user.id,
      tokyoWards: wards,
    })
    .onConflictDoUpdate({
      target: [userPreferences.userId],
      set: { tokyoWards: wards, updatedAt: new Date() },
    });

  res.json({ tokyoWards: wards });
});

export default router;

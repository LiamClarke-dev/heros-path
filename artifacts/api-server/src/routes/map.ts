import { Router, type Request, type Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import { getAllZonesForUser, inferCityFromCoords } from "../lib/zoneExploration.js";
import logger from "../logger.js";

const router = Router();

router.get("/zones", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const city = req.query.city as string | undefined;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

  let resolvedCity = city;
  if (!resolvedCity && lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    resolvedCity = inferCityFromCoords(lat, lng) ?? undefined;
  }

  if (!resolvedCity) {
    res.status(400).json({ error: "city parameter or valid lat/lng required" });
    return;
  }

  try {
    const data = await getAllZonesForUser(user.id, resolvedCity);
    res.json({ city: resolvedCity, zones: data });
  } catch (err) {
    logger.warn({ err }, "getAllZonesForUser failed");
    res.status(500).json({ error: "Failed to load zone data" });
  }
});

export default router;

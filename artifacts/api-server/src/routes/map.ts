import { Router, type Request, type Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import { getSuburbsInViewport } from "../lib/suburbExploration.js";
import { seedSuburbsForViewport } from "../lib/osmSeeder.js";
import logger from "../logger.js";

const router = Router();

router.get("/suburbs", async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const swLat = parseFloat(req.query.sw_lat as string);
  const swLng = parseFloat(req.query.sw_lng as string);
  const neLat = parseFloat(req.query.ne_lat as string);
  const neLng = parseFloat(req.query.ne_lng as string);

  if (isNaN(swLat) || isNaN(swLng) || isNaN(neLat) || isNaN(neLng)) {
    res.status(400).json({ error: "sw_lat, sw_lng, ne_lat, ne_lng are required" });
    return;
  }

  const latSpan = neLat - swLat;
  const lngSpan = neLng - swLng;
  if (latSpan <= 0 || lngSpan <= 0 || latSpan > 2 || lngSpan > 2) {
    res.status(400).json({ error: "Viewport bounds are invalid or too large" });
    return;
  }

  try {
    let data = await getSuburbsInViewport(user.id, swLat, swLng, neLat, neLng);

    if (data.length === 0) {
      logger.info({ swLat, swLng, neLat, neLng }, "No suburbs in viewport — triggering on-demand seed");

      try {
        const seedTimeout = 25_000;
        const seeded = await Promise.race<number>([
          seedSuburbsForViewport(swLat, swLng, neLat, neLng),
          new Promise<number>((_, reject) =>
            setTimeout(() => reject(new Error("on-demand seed timeout")), seedTimeout)
          ),
        ]);

        if (seeded > 0) {
          logger.info({ seeded }, "On-demand seed complete — re-querying viewport");
          data = await getSuburbsInViewport(user.id, swLat, swLng, neLat, neLng);
        }
      } catch (seedErr) {
        logger.warn({ seedErr }, "On-demand seeding did not complete within timeout");
      }
    }

    res.json({ suburbs: data });
  } catch (err) {
    logger.warn({ err }, "getSuburbsInViewport failed");
    res.status(500).json({ error: "Failed to load suburb data" });
  }
});

export default router;

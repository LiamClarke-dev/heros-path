import { Router } from "express";
import authRoutes from "./auth.js";
import journeyRoutes from "./journeys.js";
import placesRouter, { preferencesRouter } from "./places.js";
import listsRouter from "./lists.js";
import gamificationRouter from "./gamification.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use("/auth", authRoutes);

router.use(requireAuth);

router.use("/journeys", journeyRoutes);
router.use("/places", placesRouter);
router.use("/me", preferencesRouter);
router.use("/lists", listsRouter);
router.use("/", gamificationRouter);

export default router;

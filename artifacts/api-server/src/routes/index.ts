import { Router } from "express";
import authRoutes from "./auth.js";
import journeyRoutes from "./journeys.js";
import placesRouter, { preferencesRouter } from "./places.js";
import listsRouter from "./lists.js";
import gamificationRouter from "./gamification.js";
import { placeVisitsRouter, meVisitsRouter } from "./visits.js";
import { friendsRouter, socialMeRouter } from "./social.js";
import profileRouter, { publicProfileRouter } from "./profile.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/", publicProfileRouter);

router.use(requireAuth);

router.use("/journeys", journeyRoutes);
router.use("/places", placeVisitsRouter);
router.use("/places", placesRouter);
router.use("/me", meVisitsRouter);
router.use("/me", preferencesRouter);
router.use("/me", socialMeRouter);
router.use("/lists", listsRouter);
router.use("/friends", friendsRouter);
router.use("/", profileRouter);
router.use("/", gamificationRouter);

export default router;

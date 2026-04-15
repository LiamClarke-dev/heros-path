import { Router } from "express";
import authRoutes from "./auth.js";
import journeyRoutes from "./journeys.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use("/auth", authRoutes);

router.use(requireAuth);

router.use("/journeys", journeyRoutes);

export default router;

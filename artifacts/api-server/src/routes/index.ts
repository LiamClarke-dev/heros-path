import { Router } from "express";
import authRoutes from "./auth.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use("/auth", authRoutes);

router.use(requireAuth);

export default router;

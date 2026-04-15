import { Router } from "express";
import authRoutes from "./auth.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);

export default router;

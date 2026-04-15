import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  _req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
) {
  res.status(401).json({ error: "Unauthorized" });
}

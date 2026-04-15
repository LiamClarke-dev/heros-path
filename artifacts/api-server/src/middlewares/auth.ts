import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string;
  xp: number;
  level: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthUser;
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token expired or invalid" });
  }
}

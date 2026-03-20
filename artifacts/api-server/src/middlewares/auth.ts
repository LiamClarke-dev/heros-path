import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  user: typeof usersTable.$inferSelect;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing Bearer token" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const session = await db
      .select()
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.token, token),
          gt(sessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session.length) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid or expired session" });
      return;
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session[0].userId))
      .limit(1);

    if (!user.length) {
      res.status(401).json({ error: "Unauthorized", message: "User not found" });
      return;
    }

    (req as AuthenticatedRequest).user = user[0];
    next();
  } catch (err) {
    req.log.error({ err }, "Auth middleware error");
    res.status(500).json({ error: "Internal server error" });
  }
}

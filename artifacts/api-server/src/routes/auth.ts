import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function getRank(xp: number): string {
  if (xp < 100) return "Wanderer";
  if (xp < 300) return "Scout";
  if (xp < 700) return "Pathfinder";
  if (xp < 1500) return "Trailblazer";
  if (xp < 3000) return "Cartographer";
  return "Legend";
}

router.post("/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      res.status(400).json({ error: "Bad Request", message: "idToken is required" });
      return;
    }

    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );

    if (!tokenInfoRes.ok) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid Google token" });
      return;
    }

    const tokenInfo = (await tokenInfoRes.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
      exp?: string;
      aud?: string;
    };

    if (!tokenInfo.sub) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid token payload" });
      return;
    }

    // Validate token audience against our registered client IDs to prevent
    // tokens minted for other apps from being accepted.
    // Fail-closed: in production, if no client IDs are configured the request
    // is rejected rather than silently allowed through.
    const allowedClientIds = [
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_ID,
    ].filter(Boolean) as string[];

    const isProduction = process.env.NODE_ENV === "production";

    if (allowedClientIds.length === 0) {
      if (isProduction) {
        req.log.error("No Google client IDs configured — rejecting token in production");
        res.status(500).json({ error: "Server misconfigured", message: "Google client ID not set" });
        return;
      }
      // Development only: allow through but emit a warning
      req.log.warn("No Google client IDs configured — skipping audience check (dev only)");
    } else if (tokenInfo.aud) {
      // aud may be a single string or comma-separated list
      const tokenAudiences = tokenInfo.aud.split(",").map((s) => s.trim());
      const isValid = tokenAudiences.some((aud) => allowedClientIds.includes(aud));
      if (!isValid) {
        req.log.warn({ aud: tokenInfo.aud }, "Token audience mismatch");
        res.status(401).json({ error: "Unauthorized", message: "Token audience mismatch" });
        return;
      }
    } else if (isProduction) {
      // In production, missing aud in the tokeninfo response is also rejected
      req.log.warn("Token missing aud field — rejecting in production");
      res.status(401).json({ error: "Unauthorized", message: "Token audience not present" });
      return;
    }

    // Validate token expiry
    if (tokenInfo.exp && Number(tokenInfo.exp) * 1000 < Date.now()) {
      res.status(401).json({ error: "Unauthorized", message: "Token has expired" });
      return;
    }

    const existingUsers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, tokenInfo.sub))
      .limit(1);

    let user = existingUsers[0];

    if (!user) {
      const userId = crypto.randomUUID();
      const newUsers = await db
        .insert(usersTable)
        .values({
          id: userId,
          googleId: tokenInfo.sub,
          displayName: tokenInfo.name ?? "Adventurer",
          avatarUrl: tokenInfo.picture ?? null,
          email: tokenInfo.email ?? null,
        })
        .returning();
      user = newUsers[0];
    } else {
      const updated = await db
        .update(usersTable)
        .set({
          displayName: tokenInfo.name ?? user.displayName,
          avatarUrl: tokenInfo.picture ?? user.avatarUrl,
          email: tokenInfo.email ?? user.email,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = updated[0];
    }

    const sessionToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessionsTable).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token: sessionToken,
      expiresAt,
    });

    res.json({
      token: sessionToken,
      user: {
        id: user.id,
        googleId: user.googleId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        email: user.email,
        xp: user.xp,
        level: user.level,
        rank: getRank(user.xp),
        streakDays: user.streakDays,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "auth/google error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { getRank };
export default router;

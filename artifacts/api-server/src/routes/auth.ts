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

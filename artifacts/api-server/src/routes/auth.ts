import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const SALT_ROUNDS = 12;
const JWT_EXPIRES = "30d";
const AUTH_COOKIE = "hp_auth";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

function signToken(user: typeof users.$inferSelect): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email ?? null,
      displayName: user.displayName,
      xp: user.xp,
      level: user.level,
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES }
  );
}

function userResponse(user: typeof users.$inferSelect, token: string) {
  return {
    token,
    user: {
      id: user.id,
      email: user.email ?? null,
      displayName: user.displayName,
      xp: user.xp,
      level: user.level,
      profileImageUrl: user.profileImageUrl ?? null,
    },
  };
}

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = crypto.randomUUID();
  const [user] = await db
    .insert(users)
    .values({
      id,
      email,
      passwordHash,
      displayName: displayName ?? "Adventurer",
    })
    .returning();

  const token = signToken(user);
  res.status(200).json(userResponse(user, token));
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user);
  res.json(userResponse(user, token));
});

router.post("/replit/token-exchange", async (req: Request, res: Response) => {
  const { code, codeVerifier, redirectUri } = req.body as {
    code?: string;
    codeVerifier?: string;
    redirectUri?: string;
  };

  if (!code || !codeVerifier || !redirectUri) {
    res.status(400).json({ error: "code, codeVerifier, and redirectUri are required" });
    return;
  }

  const clientId = process.env.REPLIT_CLIENT_ID ?? process.env.REPL_ID;
  const clientSecret = process.env.REPLIT_CLIENT_SECRET;
  if (!clientId) {
    res.status(503).json({ error: "Replit auth not configured on this server" });
    return;
  }

  try {
    const params: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      client_id: clientId,
      redirect_uri: redirectUri,
    };
    if (clientSecret) {
      params.client_secret = clientSecret;
    }

    const tokenRes = await fetch("https://replit.com/oidc/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text().catch(() => "unknown");
      res.status(502).json({ error: "Replit auth failed", detail });
      return;
    }

    const tokens = (await tokenRes.json()) as { access_token: string };

    const userInfoRes = await fetch("https://replit.com/oidc/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      res.status(502).json({ error: "Replit auth failed", detail: "userinfo fetch failed" });
      return;
    }

    const info = (await userInfoRes.json()) as {
      sub: string;
      name?: string;
      profile_image?: string;
      email?: string;
    };

    const replitId = info.sub;

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.replitId, replitId));

    let user: typeof users.$inferSelect;
    if (existing) {
      const [updated] = await db
        .update(users)
        .set({
          displayName: info.name ?? existing.displayName,
          profileImageUrl: info.profile_image ?? existing.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.replitId, replitId))
        .returning();
      user = updated;
    } else {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(users)
        .values({
          id,
          replitId,
          displayName: info.name ?? "Adventurer",
          profileImageUrl: info.profile_image ?? null,
          email: info.email ?? null,
        })
        .returning();
      user = created;
    }

    const token = signToken(user);
    res.json(userResponse(user, token));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "Replit auth failed", detail });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
  res.json({ ok: true });
});

export default router;

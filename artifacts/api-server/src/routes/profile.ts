import { Router, type Request, type Response } from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthenticatedRequest } from "../middlewares/auth.js";
import { uploadAvatar, downloadAvatar } from "../lib/objectStorage.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG images are allowed"));
    }
  },
});

const JWT_EXPIRES = "30d";

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
      profileImageUrl: user.profileImageUrl ?? null,
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES }
  );
}

function buildAvatarServingUrl(req: Request, objectKey: string): string {
  const domain =
    process.env.REPLIT_DEV_DOMAIN ??
    req.get("x-forwarded-host") ??
    req.get("host") ??
    "localhost:8080";
  const isLocalhost = domain.startsWith("localhost") || domain.startsWith("127.");
  const scheme = isLocalhost ? "http" : "https";
  return `${scheme}://${domain}/api/${objectKey}`;
}

router.patch("/profile", async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.id;
  const { displayName, profileImageUrl } = req.body as {
    displayName?: string;
    profileImageUrl?: string | null;
  };

  const updates: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (displayName !== undefined) {
    const trimmed = displayName.trim();
    if (!trimmed) {
      res.status(400).json({ error: "Display name cannot be empty" });
      return;
    }
    updates.displayName = trimmed;
  }

  if (profileImageUrl !== undefined) {
    updates.profileImageUrl = profileImageUrl;
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const token = signToken(updated);
  res.json({
    token,
    user: {
      id: updated.id,
      email: updated.email ?? null,
      displayName: updated.displayName,
      xp: updated.xp,
      level: updated.level,
      profileImageUrl: updated.profileImageUrl ?? null,
    },
  });
});

router.post(
  "/profile/avatar",
  upload.single("avatar"),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    try {
      const objectKey = await uploadAvatar(
        userId,
        req.file.buffer,
        req.file.mimetype
      );

      const servingUrl = buildAvatarServingUrl(req, objectKey);

      const [updated] = await db
        .update(users)
        .set({ profileImageUrl: servingUrl, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const token = signToken(updated);
      res.json({
        profileImageUrl: servingUrl,
        token,
        user: {
          id: updated.id,
          email: updated.email ?? null,
          displayName: updated.displayName,
          xp: updated.xp,
          level: updated.level,
          profileImageUrl: servingUrl,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Avatar upload failed", detail: msg });
    }
  }
);

export default router;

export const publicProfileRouter = Router();

publicProfileRouter.get("/avatars/:userId/:filename", async (req: Request, res: Response) => {
  const { userId, filename } = req.params as { userId: string; filename: string };
  const objectKey = `avatars/${userId}/${filename}`;
  try {
    const { data, contentType } = await downloadAvatar(objectKey);
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.send(data);
  } catch {
    res.status(404).json({ error: "Avatar not found" });
  }
});

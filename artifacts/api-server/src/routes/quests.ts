import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { userQuestsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { QUEST_DEFINITIONS } from "./journeys";

const router: IRouter = Router();

router.get("/quests", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const now = new Date();

  // Fetch all rows ordered DESC by startedAt — latest wins per key
  const allRows = await db
    .select()
    .from(userQuestsTable)
    .where(eq(userQuestsTable.userId, user.id))
    .orderBy(desc(userQuestsTable.startedAt));

  // Build latest-row map (first seen in DESC order = most recent)
  const latestMap = new Map<string, typeof allRows[number]>();
  for (const row of allRows) {
    if (!latestMap.has(row.questKey)) {
      latestMap.set(row.questKey, row);
    }
  }

  // Ensure all quest definitions have a current row; create or reset as needed
  for (const def of QUEST_DEFINITIONS) {
    const existing = latestMap.get(def.key);

    if (!existing) {
      const expiresAt = def.type === "weekly" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;
      const newRow = await db
        .insert(userQuestsTable)
        .values({ id: crypto.randomUUID(), userId: user.id, questKey: def.key, expiresAt, progressJson: { current: 0 } })
        .returning();
      latestMap.set(def.key, newRow[0]);
    } else if (def.type === "weekly") {
      const expired = existing.expiresAt && existing.expiresAt < now;
      if (expired) {
        // Start a fresh weekly quest instance regardless of completion status
        const newRow = await db
          .insert(userQuestsTable)
          .values({ id: crypto.randomUUID(), userId: user.id, questKey: def.key, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), progressJson: { current: 0 } })
          .returning();
        latestMap.set(def.key, newRow[0]);
      }
    }
  }

  const active = [];
  const completed = [];

  for (const def of QUEST_DEFINITIONS) {
    const row = latestMap.get(def.key);
    if (!row) continue;

    const progress = (row.progressJson as { current?: number })?.current ?? 0;
    const isCompleted = !!row.completedAt;

    const quest = {
      key: def.key,
      title: def.title,
      description: def.description,
      xpReward: def.xpReward,
      progress,
      target: def.target,
      type: def.type,
      isCompleted,
      completedAt: row.completedAt ?? null,
      expiresAt: row.expiresAt ?? null,
    };

    if (isCompleted) {
      completed.push(quest);
    } else {
      active.push(quest);
    }
  }

  res.json({ active, completed });
});

export default router;

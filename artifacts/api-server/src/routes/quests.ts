import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { userQuestsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { QUEST_DEFINITIONS } from "./journeys";

const router: IRouter = Router();

router.get("/quests", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user;
  const now = new Date();

  const allRows = await db
    .select()
    .from(userQuestsTable)
    .where(eq(userQuestsTable.userId, user.id))
    .orderBy(desc(userQuestsTable.startedAt));

  const latestMap = new Map<string, typeof allRows[number]>();
  for (const row of allRows) {
    if (!latestMap.has(row.questKey)) {
      latestMap.set(row.questKey, row);
    }
  }

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

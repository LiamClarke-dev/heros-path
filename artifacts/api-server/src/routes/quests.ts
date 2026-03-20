import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { userQuestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { QUEST_DEFINITIONS } from "./journeys";

const router: IRouter = Router();

router.get("/quests", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const now = new Date();

  const userQuests = await db
    .select()
    .from(userQuestsTable)
    .where(eq(userQuestsTable.userId, user.id));

  const userQuestMap = new Map(userQuests.map((q) => [q.questKey, q]));

  for (const def of QUEST_DEFINITIONS) {
    const existing = userQuestMap.get(def.key);

    if (!existing) {
      const expiresAt = def.type === "weekly" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;
      const newQuest = await db
        .insert(userQuestsTable)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          questKey: def.key,
          expiresAt,
          progressJson: { current: 0 },
        })
        .returning();
      userQuestMap.set(def.key, newQuest[0]);
    } else if (
      def.type === "weekly" &&
      existing.completedAt &&
      existing.expiresAt &&
      existing.expiresAt < now
    ) {
      // Weekly quest completed + expired — issue a fresh instance
      const newQuest = await db
        .insert(userQuestsTable)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          questKey: def.key,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          progressJson: { current: 0 },
        })
        .returning();
      userQuestMap.set(def.key, newQuest[0]);
    } else if (
      def.type === "weekly" &&
      !existing.completedAt &&
      existing.expiresAt &&
      existing.expiresAt < now
    ) {
      // Weekly quest expired without completion — reset
      const newQuest = await db
        .insert(userQuestsTable)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          questKey: def.key,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          progressJson: { current: 0 },
        })
        .returning();
      userQuestMap.set(def.key, newQuest[0]);
    }
  }

  const active = [];
  const completed = [];

  for (const def of QUEST_DEFINITIONS) {
    const userQuest = userQuestMap.get(def.key);
    if (!userQuest) continue;

    const progress = (userQuest.progressJson as { current?: number })?.current ?? 0;
    const isCompleted = !!userQuest.completedAt;

    const quest = {
      key: def.key,
      title: def.title,
      description: def.description,
      xpReward: def.xpReward,
      progress,
      target: def.target,
      type: def.type,
      isCompleted,
      completedAt: userQuest.completedAt ?? null,
      expiresAt: userQuest.expiresAt ?? null,
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

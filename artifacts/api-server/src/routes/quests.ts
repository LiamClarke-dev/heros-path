import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { userQuestsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

const QUEST_DEFINITIONS = [
  {
    key: "first_journey",
    title: "The First Step",
    description: "Complete your first journey",
    xpReward: 50,
    target: 1,
    type: "total",
  },
  {
    key: "discover_3_places",
    title: "Curious Explorer",
    description: "Discover 3 new places",
    xpReward: 75,
    target: 3,
    type: "weekly",
  },
  {
    key: "walk_5_journeys",
    title: "Regular Adventurer",
    description: "Go on 5 journeys",
    xpReward: 100,
    target: 5,
    type: "total",
  },
  {
    key: "ping_3_times",
    title: "The Seeker",
    description: "Use the ping feature 3 times",
    xpReward: 60,
    target: 3,
    type: "weekly",
  },
  {
    key: "favorite_5_places",
    title: "Connoisseur",
    description: "Favorite 5 places",
    xpReward: 80,
    target: 5,
    type: "total",
  },
];

router.get("/quests", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;

  const userQuests = await db
    .select()
    .from(userQuestsTable)
    .where(eq(userQuestsTable.userId, user.id));

  const userQuestMap = new Map(userQuests.map((q) => [q.questKey, q]));

  for (const def of QUEST_DEFINITIONS) {
    if (!userQuestMap.has(def.key)) {
      const expiresAt = def.type === "weekly"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : null;
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

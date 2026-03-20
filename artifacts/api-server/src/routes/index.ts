import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import meRouter from "./me";
import journeysRouter from "./journeys";
import placesRouter from "./places";
import listsRouter from "./lists";
import questsRouter from "./quests";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(journeysRouter);
router.use(placesRouter);
router.use(listsRouter);
router.use(questsRouter);
router.use(profileRouter);

export default router;

import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as msg from "../controllers/message.controller";

import * as ai from "../controllers/ai.controller";

const r = Router();
r.use(requireAuth);
r.get("/:id/messages", msg.history);
r.get("/:id/catch-me-up", ai.catchMeUp);
export const messageRouter = r;

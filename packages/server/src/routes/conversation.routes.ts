import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as conv from "../controllers/conversation.controller";

const r = Router();
r.use(requireAuth);
r.get("/", conv.list);
r.post("/direct", conv.direct);
r.post("/group", conv.group);
r.patch("/:id", conv.updateGroup);
r.post("/:id/members", conv.addMembers);
r.delete("/:id/members/:userId", conv.removeMember);
export const conversationRouter = r;

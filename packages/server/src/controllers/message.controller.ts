import type { Request, Response } from "express";
import { isMember } from "../services/access.service";
import { getHistory } from "../services/message.service";

export async function history(req: Request, res: Response) {
  const userId = req.userId!;
  const conversationId = req.params.id;

  if (!(await isMember(conversationId, userId))) {
    return res.status(403).json({ error: "Bạn không thuộc hội thoại này" });
  }

  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  const before = req.query.before ? new Date(String(req.query.before)) : null;

  const result = await getHistory(conversationId, { before, limit });
  return res.json(result);
}

import type { MessageDTO } from "@chat/shared";
import { prisma } from "../lib/prisma";
import { toMessageDTO } from "./access.service";

export async function getHistory(
  conversationId: string,
  opts: { before?: Date | null; limit: number }
): Promise<{ messages: MessageDTO[]; nextBefore: string | null }> {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(opts.before ? { createdAt: { lt: opts.before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit,
  });

  const ordered = messages.reverse().map(toMessageDTO);
  const nextBefore = messages.length === opts.limit ? ordered[0]?.createdAt ?? null : null;
  return { messages: ordered, nextBefore };
}

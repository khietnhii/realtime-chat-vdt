import type { Message } from "@prisma/client";
import type { MessageDTO } from "@chat/shared";
import { prisma } from "../lib/prisma";

export async function isMember(conversationId: string, userId: string): Promise<boolean> {
  const m = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { userId: true },
  });
  return !!m;
}

export async function memberIds(conversationId: string): Promise<string[]> {
  const ms = await prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return ms.map((m) => m.userId);
}

export const toMessageDTO = (m: Message): MessageDTO => ({
  id: m.id,
  conversationId: m.conversationId,
  senderId: m.senderId,
  content: m.content,
  type: m.type,
  clientMsgId: m.clientMsgId,
  createdAt: m.createdAt.toISOString(),
  ...(m.editedAt ? { editedAt: m.editedAt.toISOString() } : {}),
  ...(m.deletedAt ? { deletedAt: m.deletedAt.toISOString() } : {}),
});

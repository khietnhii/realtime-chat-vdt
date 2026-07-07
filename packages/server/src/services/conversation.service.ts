import type { ConversationDTO } from "@chat/shared";
import { prisma } from "../lib/prisma";

export async function listConversations(userId: string): Promise<ConversationDTO[]> {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: { include: { user: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const result = await Promise.all(
    memberships.map(async (m): Promise<ConversationDTO> => {
      const conv = m.conversation;
      const last = conv.messages[0];

      let unread = 0;
      if (m.lastReadMessageId) {
        const lastRead = await prisma.message.findUnique({
          where: { id: m.lastReadMessageId },
          select: { createdAt: true },
        });
        unread = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: { gt: lastRead?.createdAt ?? new Date(0) },
          },
        });
      } else {
        unread = await prisma.message.count({
          where: { conversationId: conv.id, senderId: { not: userId } },
        });
      }

      const others = conv.members.filter((cm) => cm.userId !== userId).map((cm) => cm.user);
      return {
        id: conv.id,
        type: conv.type,
        name: conv.type === "GROUP" ? conv.name ?? "Nhóm" : others[0]?.displayName ?? "Người dùng",
        avatarUrl: conv.avatarUrl,
        members: conv.members.map((cm) => ({
          id: cm.user.id,
          displayName: cm.user.displayName,
          email: cm.user.email,
          avatarUrl: cm.user.avatarUrl,
          lastReadMessageId: cm.lastReadMessageId,
        })),
        lastMessage: last
          ? { id: last.id, content: last.content, senderId: last.senderId, createdAt: last.createdAt.toISOString(), type: last.type as any, deletedAt: last.deletedAt ? last.deletedAt.toISOString() : null }
          : null,
        lastReadMessageId: m.lastReadMessageId,
        unread,
      };
    })
  );

  result.sort((a, b) => {
    const ta = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
    const tb = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
    return tb - ta;
  });
  return result;
}

export async function getOrCreateDirect(me: string, other: string): Promise<string> {
  const existing = await prisma.conversation.findFirst({
    where: {
      type: "DIRECT",
      AND: [{ members: { some: { userId: me } } }, { members: { some: { userId: other } } }],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const conv = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdBy: me,
      members: { create: [{ userId: me, role: "OWNER" }, { userId: other }] },
    },
    select: { id: true },
  });
  return conv.id;
}

export async function createGroup(me: string, name: string, memberIds: string[]): Promise<string> {
  const ids = Array.from(new Set([me, ...memberIds]));
  const conv = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name,
      createdBy: me,
      members: { create: ids.map((id) => ({ userId: id, role: id === me ? "OWNER" : "MEMBER" })) },
    },
    select: { id: true },
  });
  return conv.id;
}

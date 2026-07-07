import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isMember, memberIds, toMessageDTO } from "../services/access.service";
import { markOnline, markOffline, isOnline } from "../lib/redis";
import {
  convRoom,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from "@chat/shared";

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type ChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  clientMsgId: z.string().min(1).max(64),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE", "SYSTEM"]).optional(),
});

const readSchema = z.object({
  conversationId: z.string().uuid(),
  lastReadMessageId: z.string().uuid(),
});

const typingSchema = z.object({
  conversationId: z.string().uuid(),
  isTyping: z.boolean(),
});

const editSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

const deleteSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
});

export function registerHandlers(io: IO, socket: ChatSocket) {
  const userId = socket.data.userId;

  void (async () => {
    socket.join(`user:${userId}`);
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    for (const m of memberships) socket.join(convRoom(m.conversationId));

    const count = await markOnline(userId);
    if (count === 1) {
      for (const m of memberships) {
        socket.to(convRoom(m.conversationId)).emit("presence", { userId, online: true });
      }
    }

    const memberRecords = await prisma.conversationMember.findMany({
      where: { conversationId: { in: memberships.map(m => m.conversationId) }, userId: { not: userId } },
      select: { userId: true }
    });
    const uniqueOthers = Array.from(new Set(memberRecords.map(m => m.userId)));
    for (const other of uniqueOthers) {
      if (await isOnline(other)) {
        socket.emit("presence", { userId: other, online: true });
      }
    }
  })();

  socket.on("message:send", async (payload, ack) => {
    const parsed = sendSchema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: "Payload không hợp lệ" });
    const { conversationId, content, clientMsgId, type } = parsed.data;

    if (!(await isMember(conversationId, userId))) {
      return ack({ ok: false, error: "Bạn không thuộc hội thoại này" });
    }

    let message = await prisma.message.findUnique({
      where: { conversationId_clientMsgId: { conversationId, clientMsgId } },
    });
    if (!message) {
      message = await prisma.message.create({
        data: { conversationId, senderId: userId, content, clientMsgId, type: type ?? "TEXT" },
      });
    }

    const dto = toMessageDTO(message);
    ack({ ok: true, message: dto });
    socket.to(convRoom(conversationId)).emit("message:new", dto);
  });

  socket.on("message:edit", async (payload, ack) => {
    const parsed = editSchema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: "Payload không hợp lệ" });
    const { conversationId, messageId, content } = parsed.data;

    let message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId || message.deletedAt) {
      return ack({ ok: false, error: "Không thể chỉnh sửa tin nhắn này" });
    }

    message = await prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
    });

    const dto = toMessageDTO(message);
    ack({ ok: true, message: dto });
    io.to(convRoom(conversationId)).emit("message:update", dto);
  });

  socket.on("message:delete", async (payload, ack) => {
    const parsed = deleteSchema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: "Payload không hợp lệ" });
    const { conversationId, messageId } = parsed.data;

    let message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId) {
      return ack({ ok: false, error: "Không thể xoá tin nhắn này" });
    }

    message = await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    const dto = toMessageDTO(message);
    ack({ ok: true, message: dto });
    io.to(convRoom(conversationId)).emit("message:update", dto);
  });

  socket.on("message:read", async (payload) => {
    const parsed = readSchema.safeParse(payload);
    if (!parsed.success) return;
    const { conversationId, lastReadMessageId } = parsed.data;
    if (!(await isMember(conversationId, userId))) return;

    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadMessageId },
    });
    io.to(convRoom(conversationId)).emit("message:read", {
      conversationId,
      userId,
      lastReadMessageId,
    });
  });

  socket.on("conversation:join", async ({ conversationId }) => {
    if (typeof conversationId !== "string") return;
    if (await isMember(conversationId, userId)) {
      socket.join(convRoom(conversationId));
    }
  });

  socket.on("typing", async (payload) => {
    const parsed = typingSchema.safeParse(payload);
    if (!parsed.success) return;
    if (!(await isMember(parsed.data.conversationId, userId))) return;
    socket.to(convRoom(parsed.data.conversationId)).emit("typing", {
      conversationId: parsed.data.conversationId,
      userId,
      isTyping: parsed.data.isTyping,
    });
  });

  socket.on("disconnect", async () => {
    const remaining = await markOffline(userId);
    if (remaining === 0) {
      const ids = await prisma.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      for (const m of ids) {
        io.to(convRoom(m.conversationId)).emit("presence", { userId, online: false });
      }
    }
  });
}

export async function notifyConversationMembers(io: IO, conversationId: string) {
  return memberIds(conversationId);
}

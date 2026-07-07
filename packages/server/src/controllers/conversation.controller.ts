import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { listConversations, getOrCreateDirect, createGroup } from "../services/conversation.service";
import { getIO } from "../sockets";
import { convRoom, userRoom } from "@chat/shared";

export async function list(req: Request, res: Response) {
  const conversations = await listConversations(req.userId!);
  return res.json({ conversations });
}

const directSchema = z.object({ userId: z.string().uuid() });

export async function direct(req: Request, res: Response) {
  const me = req.userId!;
  const parsed = directSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Thiếu userId hợp lệ" });
  const other = parsed.data.userId;
  if (other === me) return res.status(400).json({ error: "Không thể tự chat với chính mình" });

  const otherUser = await prisma.user.findUnique({ where: { id: other } });
  if (!otherUser) return res.status(404).json({ error: "Không tìm thấy người dùng" });

  const id = await getOrCreateDirect(me, other);
  const io = getIO();
  if (io) {
    [me, other].forEach((uid) => io.in(userRoom(uid)).socketsJoin(convRoom(id)));
    io.to(convRoom(id)).emit("conversation:new", { conversationId: id });
  }
  return res.json({ conversation: { id } });
}

const groupSchema = z.object({
  name: z.string().min(1).max(80),
  memberIds: z.array(z.string().uuid()).min(2, "Cần ít nhất 2 thành viên để tạo nhóm"),
});

export async function group(req: Request, res: Response) {
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dữ liệu nhóm không hợp lệ" });
  const id = await createGroup(req.userId!, parsed.data.name, parsed.data.memberIds);
  const io = getIO();
  if (io) {
    const allMembers = [req.userId!, ...parsed.data.memberIds];
    allMembers.forEach((uid) => io.in(userRoom(uid)).socketsJoin(convRoom(id)));
    io.to(convRoom(id)).emit("conversation:new", { conversationId: id });
  }
  return res.json({ conversation: { id } });
}

const updateGroupSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function updateGroup(req: Request, res: Response) {
  const parsed = updateGroupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dữ liệu cập nhật không hợp lệ" });

  const conversationId = req.params.id;
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { members: true } });
  if (!conv || conv.type !== "GROUP") return res.status(404).json({ error: "Không tìm thấy nhóm" });

  const isMember = conv.members.some(m => m.userId === req.userId);
  if (!isMember) return res.status(403).json({ error: "Không có quyền" });

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: parsed.data,
  });

  const me = await prisma.user.findUnique({ where: { id: req.userId! } });

  const io = getIO();
  if (io) {
    io.to(convRoom(conversationId)).emit("conversation:update", {
      conversationId,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
    });

    if (parsed.data.name && parsed.data.name !== conv.name) {
      const msg = await prisma.message.create({
        data: {
          conversationId,
          senderId: req.userId!,
          content: `${me?.displayName || 'Ai đó'} đã đổi tên nhóm thành "${parsed.data.name}"`,
          type: "SYSTEM",
          clientMsgId: `sys-name-${Date.now()}`,
        },
      });
      io.to(convRoom(conversationId)).emit("message:new", {
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        editedAt: msg.editedAt?.toISOString(),
        deletedAt: msg.deletedAt?.toISOString(),
      } as any);
    }

    if (parsed.data.avatarUrl && parsed.data.avatarUrl !== conv.avatarUrl) {
      const msg = await prisma.message.create({
        data: {
          conversationId,
          senderId: req.userId!,
          content: `${me?.displayName || 'Ai đó'} đã đổi ảnh đại diện nhóm`,
          type: "SYSTEM",
          clientMsgId: `sys-ava-${Date.now()}`,
        },
      });
      io.to(convRoom(conversationId)).emit("message:new", {
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        editedAt: msg.editedAt?.toISOString(),
        deletedAt: msg.deletedAt?.toISOString(),
      } as any);
    }
  }

  return res.json({ success: true, conversation: updated });
}

const addMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1),
});

export async function addMembers(req: Request, res: Response) {
  const parsed = addMembersSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dữ liệu thành viên không hợp lệ" });

  const conversationId = req.params.id;
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { members: true } });
  if (!conv || conv.type !== "GROUP") return res.status(404).json({ error: "Không tìm thấy nhóm" });

  const isMember = conv.members.some(m => m.userId === req.userId);
  if (!isMember) return res.status(403).json({ error: "Không có quyền" });

  const newMembers = parsed.data.memberIds.filter(id => !conv.members.some(m => m.userId === id));
  if (newMembers.length === 0) return res.json({ success: true });

  await prisma.conversationMember.createMany({
    data: newMembers.map(userId => ({
      conversationId,
      userId,
    })),
    skipDuplicates: true,
  });

  const addedUsers = await prisma.user.findMany({ where: { id: { in: newMembers } } });
  const addedMembersLite = addedUsers.map(u => ({
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    avatarUrl: u.avatarUrl,
  }));

  const me = await prisma.user.findUnique({ where: { id: req.userId! } });

  const io = getIO();
  if (io) {
    newMembers.forEach(uid => io.in(userRoom(uid)).socketsJoin(convRoom(conversationId)));
    newMembers.forEach(uid => io.to(userRoom(uid)).emit("conversation:new", { conversationId }));

    io.to(convRoom(conversationId)).emit("conversation:member_joined", {
      conversationId,
      members: addedMembersLite,
    });

    const msg = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.userId!,
        content: `${me?.displayName || 'Ai đó'} đã thêm ${addedUsers.map(u => u.displayName).join(", ")} vào nhóm`,
        type: "SYSTEM",
        clientMsgId: `sys-add-${Date.now()}`,
      },
    });
    io.to(convRoom(conversationId)).emit("message:new", {
      ...msg,
      createdAt: msg.createdAt.toISOString(),
      editedAt: msg.editedAt?.toISOString(),
      deletedAt: msg.deletedAt?.toISOString(),
    } as any);
  }

  return res.json({ success: true });
}

export async function removeMember(req: Request, res: Response) {
  const conversationId = req.params.id;
  const targetUserId = req.params.userId;

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { members: true } });
  if (!conv || conv.type !== "GROUP") return res.status(404).json({ error: "Không tìm thấy nhóm" });

  const isMember = conv.members.some(m => m.userId === req.userId);
  if (!isMember) return res.status(403).json({ error: "Không có quyền" });

  if (conv.members.length <= 3 && targetUserId !== req.userId) {
    // Optional
  }

  await prisma.conversationMember.delete({
    where: { conversationId_userId: { conversationId, userId: targetUserId } }
  });

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  const me = await prisma.user.findUnique({ where: { id: req.userId! } });

  const io = getIO();
  if (io) {
    io.to(convRoom(conversationId)).emit("conversation:member_left", {
      conversationId,
      userId: targetUserId,
    });
    io.in(userRoom(targetUserId)).socketsLeave(convRoom(conversationId));

    const content = targetUserId === req.userId
      ? `${me?.displayName || 'Ai đó'} đã rời khỏi nhóm`
      : `${me?.displayName || 'Ai đó'} đã xóa ${targetUser?.displayName || 'người dùng'} khỏi nhóm`;

    const msg = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.userId!,
        content,
        type: "SYSTEM",
        clientMsgId: `sys-leave-${Date.now()}`,
      },
    });
    io.to(convRoom(conversationId)).emit("message:new", {
      ...msg,
      createdAt: msg.createdAt.toISOString(),
      editedAt: msg.editedAt?.toISOString(),
      deletedAt: msg.deletedAt?.toISOString(),
    } as any);
  }

  return res.json({ success: true });
}

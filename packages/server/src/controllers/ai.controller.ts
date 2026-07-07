import type { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../lib/prisma";
import { isMember } from "../services/access.service";

export async function catchMeUp(req: Request, res: Response) {
  const userId = req.userId!;
  const conversationId = req.params.id;

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } }
  });

  if (!membership) {
    return res.status(403).json({ error: "Bạn không thuộc hội thoại này" });
  }

  const { mode, startTime, endTime } = req.query;

  let messagesRaw;

  if (mode === "custom" && startTime) {
    const start = new Date(startTime as string);
    const end = endTime ? new Date(endTime as string) : new Date();

    messagesRaw = await prisma.message.findMany({
      where: {
        conversationId,
        createdAt: { gte: start, lte: end }
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { sender: { select: { displayName: true } } }
    });
  } else {
    messagesRaw = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { sender: { select: { displayName: true } } }
    });
  }

  const messages = messagesRaw.reverse();

  if (messages.length === 0) {
    return res.json({ summary: "Không có tin nhắn mới nào để tóm tắt." });
  }

  const textLines = messages.map(m => {
    if (m.type === "TEXT") return `${m.sender.displayName}: ${m.content}`;
    if (m.type === "IMAGE") return `${m.sender.displayName}: [Đã gửi một ảnh]`;
    if (m.type === "VIDEO") return `${m.sender.displayName}: [Đã gửi một video]`;
    if (m.type === "AUDIO") return `${m.sender.displayName}: [Đã gửi một tin nhắn thoại]`;
    if (m.type === "FILE") return `${m.sender.displayName}: [Đã gửi một tệp đính kèm]`;
    if (m.type === "SYSTEM") return `[HỆ THỐNG]: ${m.content}`;
    return `${m.sender.displayName}: [Tin nhắn]`;
  });

  const prompt = `Dưới đây là các tin nhắn chưa đọc trong nhóm chat. Hãy tóm tắt nội dung chính thành 3 đến 5 gạch đầu dòng ngắn gọn, súc tích và dễ hiểu nhất. Không cần mở bài hay kết bài, chỉ cần trả về các gạch đầu dòng (bắt đầu bằng -).\n\nTin nhắn:\n${textLines.join("\n")}`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return res.json({ summary });
  } catch (error) {
    console.error("AI Summarize error:", error);
    return res.status(500).json({ error: "Không thể gọi AI để tóm tắt lúc này. Vui lòng thử lại sau." });
  }
}

import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { UserDTO } from "@chat/shared";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";

const publicUser = (u: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}): UserDTO => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl,
});

const passwordValidation = z.string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
  .max(128, "Mật khẩu quá dài")
  .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
  .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ thường")
  .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số");

const registerSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: passwordValidation,
  displayName: z.string().trim().min(2, "Tên hiển thị phải có ít nhất 2 ký tự").max(32, "Tên hiển thị không được vượt quá 32 ký tự"),
});

function getZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Dữ liệu không hợp lệ";
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: getZodError(parsed.error) });
  }
  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email đã tồn tại" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash: await hashPassword(password),
      isVerified: false,
      verificationCode: otp,
      verificationCodeExpiresAt: expiresAt
    },
  });

  const { sendVerificationEmail } = await import("../lib/mailer");
  sendVerificationEmail(email, otp).catch(console.error);

  return res.json({ requiresVerification: true, email: user.email });
}

const loginSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu")
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: getZodError(parsed.error) });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    return res.status(401).json({ error: "Sai thông tin đăng nhập" });
  }

  if (!user.isVerified) {
    return res.status(403).json({ error: "Tài khoản chưa được xác minh", requiresVerification: true, email: user.email });
  }

  return res.json({ accessToken: signToken(user.id), user: publicUser(user) });
}

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function verifyEmail(req: Request, res: Response) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: getZodError(parsed.error) });
  const { email, code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng" });

  if (user.isVerified) return res.status(400).json({ error: "Tài khoản đã được xác minh" });

  if (user.verificationCode !== code) return res.status(400).json({ error: "Mã xác nhận không đúng" });

  if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
    return res.status(400).json({ error: "Mã xác nhận đã hết hạn" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, verificationCode: null, verificationCodeExpiresAt: null },
  });

  return res.json({ accessToken: signToken(user.id), user: publicUser(user) });
}

const resendSchema = z.object({
  email: z.string().email(),
});

export async function resendVerification(req: Request, res: Response) {
  const parsed = resendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: getZodError(parsed.error) });
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng" });

  if (user.isVerified) return res.status(400).json({ error: "Tài khoản đã được xác minh" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationCode: otp, verificationCodeExpiresAt: expiresAt },
  });

  const { sendVerificationEmail } = await import("../lib/mailer");
  sendVerificationEmail(email, otp).catch(console.error);

  return res.json({ success: true });
}

const checkEmailSchema = z.object({
  email: z.string().email("Email không đúng định dạng")
});

export async function checkEmail(req: Request, res: Response) {
  const parsed = checkEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: getZodError(parsed.error) });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user) return res.status(404).json({ error: "Không tìm thấy tài khoản với Email này" });
  return res.json({ exists: true });
}

const resetSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  newPassword: passwordValidation
});

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: getZodError(parsed.error) });

  const { email, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(404).json({ error: "Không tìm thấy tài khoản với Email này" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) }
  });

  return res.json({ success: true });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng" });
  return res.json({ user: publicUser(user) });
}

const updateProfileSchema = z.object({
  displayName: z.string().min(2, "Tên hiển thị quá ngắn").max(32, "Tên hiển thị quá dài").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải có chữ hoa")
    .regex(/[a-z]/, "Mật khẩu phải có chữ thường")
    .regex(/[0-9]/, "Mật khẩu phải có chữ số")
    .optional(),
});

export async function updateProfile(req: Request, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: getZodError(parsed.error) });

  const { displayName, currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng" });

  const dataToUpdate: any = {};

  if (displayName) {
    dataToUpdate.displayName = displayName;
  }

  if (currentPassword && newPassword) {
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Mật khẩu hiện tại không đúng" });
    dataToUpdate.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return res.json({ user: publicUser(user) });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: dataToUpdate,
  });

  return res.json({ user: publicUser(updatedUser) });
}

export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: "Không tìm thấy file" });

  const avatarUrl = `/uploads/${req.file.filename}`;

  const updatedUser = await prisma.user.update({
    where: { id: req.userId! },
    data: { avatarUrl },
  });

  return res.json({ user: publicUser(updatedUser) });
}

export async function searchUsers(req: Request, res: Response) {
  const q = String(req.query.search ?? "").trim();
  const users = await prisma.user.findMany({
    where: {
      id: { not: req.userId! },
      ...(q
        ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
        }
        : {}),
    },
    take: 20,
    orderBy: { displayName: "asc" },
  });
  return res.json({ users: users.map(publicUser) });
}

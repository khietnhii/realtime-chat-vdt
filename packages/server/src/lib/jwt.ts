import jwt from "jsonwebtoken";
import { env } from "./env";

export interface JwtPayload {
  sub: string; // userId
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Invalid token");
  }
  return { sub: String(decoded.sub) };
}

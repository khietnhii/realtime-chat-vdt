import type { Socket } from "socket.io";
import { verifyToken } from "../lib/jwt";

export function socketAuth(socket: Socket, next: (err?: Error) => void) {
  const token =
    (socket.handshake.auth?.token as string | undefined) ??
    (socket.handshake.headers.authorization?.startsWith("Bearer ")
      ? socket.handshake.headers.authorization.slice(7)
      : undefined);

  if (!token) return next(new Error("UNAUTHORIZED"));
  try {
    const { sub } = verifyToken(token);
    socket.data.userId = sub;
    next();
  } catch {
    next(new Error("UNAUTHORIZED"));
  }
}

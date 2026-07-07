import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "../lib/env";
import { pubClient, subClient } from "../lib/redis";
import { socketAuth } from "./auth";
import { registerHandlers } from "./handlers";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@chat/shared";

type IO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

let ioInstance: IO | null = null;

export function getIO() {
  return ioInstance;
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  ioInstance = io;

  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuth);
  io.on("connection", (socket) => registerHandlers(io, socket));

  return io;
}

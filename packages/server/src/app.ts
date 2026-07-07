import express from "express";
import cors from "cors";
import { env } from "./lib/env";
import path from "path";
import { authRouter } from "./routes/auth.routes";
import { conversationRouter } from "./routes/conversation.routes";
import { messageRouter } from "./routes/message.routes";
import { uploadRouter } from "./routes/upload.routes";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use("/api/auth", authRouter);
  app.use("/api/conversations", conversationRouter);
  app.use("/api/conversations", messageRouter);
  app.use("/api/upload", uploadRouter);

  // Phục vụ Frontend Static Files trong môi trường Production
  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.join(process.cwd(), "../client/dist");
    app.use(express.static(clientDistPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}

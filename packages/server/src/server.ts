import { createServer } from "http";
import { createApp } from "./app";
import { createSocketServer } from "./sockets";
import { connectRedis, clearOnline } from "./lib/redis";
import { env } from "./lib/env";

async function main() {
  await connectRedis();
  await clearOnline();

  const app = createApp();
  const httpServer = createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`API + Socket.IO đang chạy tại http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Lỗi khởi động server:", err);
  process.exit(1);
});

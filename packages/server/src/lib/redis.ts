import { createClient } from "redis";
import { env } from "./env";

export const redis = createClient({ url: env.REDIS_URL });
export const pubClient = createClient({ url: env.REDIS_URL });
export const subClient = pubClient.duplicate();

export async function connectRedis() {
  await Promise.all([redis.connect(), pubClient.connect(), subClient.connect()]);
}

const ONLINE_KEY = "online_users";

export async function clearOnline() {
  await redis.del(ONLINE_KEY);
}

export async function markOnline(userId: string): Promise<number> {
  return redis.hIncrBy(ONLINE_KEY, userId, 1);
}

export async function markOffline(userId: string): Promise<number> {
  const n = await redis.hIncrBy(ONLINE_KEY, userId, -1);
  if (n <= 0) await redis.hDel(ONLINE_KEY, userId);
  return Math.max(0, n);
}

export async function isOnline(userId: string): Promise<boolean> {
  const v = await redis.hGet(ONLINE_KEY, userId);
  return !!v && Number(v) > 0;
}

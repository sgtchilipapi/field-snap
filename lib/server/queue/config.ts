import { env } from "@/lib/server/env";

export function getQueueConfig() {
  return {
    redisUrl: env.QUEUE_REDIS_URL,
    prefix: env.QUEUE_PREFIX
  };
}

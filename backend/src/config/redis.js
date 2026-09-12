import IORedis from "ioredis";

/**
 * Shared Redis connection used by BullMQ queues (AI processing, event
 * expiry jobs). Requires REDIS_URL in .env — e.g. a free Upstash/Render
 * Redis instance in production, or local Redis in development.
 */
let connection = null;

export const getRedisConnection = () => {
  if (!process.env.REDIS_URL) {
    console.warn(
      "[redis] REDIS_URL not set — background jobs (AI processing, event expiry) will not run."
    );
    return null;
  }

  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // required by BullMQ
    });
    connection.on("error", (err) => console.error("[redis] connection error:", err.message));
  }

  return connection;
};

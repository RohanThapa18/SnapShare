import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

export const EVENT_EXPIRY_QUEUE = "event-expiry";

let queue = null;

export const getEventExpiryQueue = () => {
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue(EVENT_EXPIRY_QUEUE, { connection });
  }
  return queue;
};

/**
 * Schedules a recurring job that sweeps for events whose expiryDate has
 * passed and flips their status to EXPIRED. Runs every 15 minutes.
 * (Individual requests also lazily self-correct via requireActiveEvent
 * middleware, so this is a backstop, not the only enforcement point.)
 */
export const scheduleEventExpirySweep = async () => {
  const q = getEventExpiryQueue();
  if (!q) return;
  await q.add(
    "sweep-expired-events",
    {},
    { repeat: { every: 15 * 60 * 1000 }, jobId: "event-expiry-sweep" }
  );
};

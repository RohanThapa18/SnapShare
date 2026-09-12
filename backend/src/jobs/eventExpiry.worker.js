import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { EVENT_EXPIRY_QUEUE } from "../queues/eventExpiry.queue.js";
import { Event } from "../models/index.js";
import { EVENT_STATUS } from "../constants/enums.js";

const sweepExpiredEvents = async () => {
  const result = await Event.updateMany(
    { status: EVENT_STATUS.ACTIVE, expiryDate: { $lt: new Date() } },
    { $set: { status: EVENT_STATUS.EXPIRED } }
  );
  if (result.modifiedCount) {
    console.log(`[expiry-worker] Marked ${result.modifiedCount} event(s) as EXPIRED`);
  }
};

export const startEventExpiryWorker = () => {
  const connection = getRedisConnection();
  if (!connection) {
    console.warn("[expiry-worker] Redis not configured — event expiry sweep will not run automatically.");
    console.warn("[expiry-worker] Individual requests still self-correct via the eventStatus middleware.");
    return null;
  }

  const worker = new Worker(EVENT_EXPIRY_QUEUE, sweepExpiredEvents, { connection });
  worker.on("completed", () => console.log("[expiry-worker] Sweep completed"));
  worker.on("failed", (job, err) => console.error("[expiry-worker] Sweep failed:", err.message));

  return worker;
};

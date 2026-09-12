import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

export const CLOUDINARY_SYNC_QUEUE = "cloudinary-sync";

let queue = null;

export const getCloudinarySyncQueue = () => {
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue(CLOUDINARY_SYNC_QUEUE, { connection });
  }
  return queue;
};

/**
 * Schedules a recurring sweep that reconciles ALL photos against
 * Cloudinary, catching assets deleted directly on Cloudinary (outside
 * the app) across every event, not just ones an organizer manually
 * triggers a sync on. Runs once every 6 hours by default.
 */
export const scheduleCloudinarySync = async () => {
  const q = getCloudinarySyncQueue();
  if (!q) return;
  await q.add(
    "sync-all-photos",
    {},
    { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: "cloudinary-sync-sweep" }
  );
};

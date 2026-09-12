import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

export const AI_PROCESSING_QUEUE = "ai-processing";

let queue = null;

export const getAiProcessingQueue = () => {
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue(AI_PROCESSING_QUEUE, { connection });
  }
  return queue;
};

/**
 * Enqueues a photo for background face detection + embedding generation.
 * Called right after a photo's Cloudinary upload + metadata save succeed,
 * so the upload request itself never blocks on AI processing.
 */
export const enqueuePhotoForAiProcessing = async (photoId) => {
  const q = getAiProcessingQueue();
  if (!q) {
    console.warn(
      `[queue] Redis not configured — photo ${photoId} will stay in PENDING until AI_SERVICE + REDIS_URL are set.`
    );
    return;
  }
  await q.add(
    "process-photo",
    { photoId },
    { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
  );
};

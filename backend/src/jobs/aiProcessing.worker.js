import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { AI_PROCESSING_QUEUE } from "../queues/aiProcessing.queue.js";
import { Photo, FaceEmbedding } from "../models/index.js";
import { detectFacesAndEmbed } from "../services/aiService.js";
import { getInternalFetchUrl } from "../services/cloudinaryService.js";
import { AI_STATUS } from "../constants/enums.js";

/**
 * Background job: for a given photoId, fetch the stored image, send it to
 * the Python AI service for face detection + embedding, and persist one
 * FaceEmbedding document per detected face. Updates Photo.aiStatus
 * through PROCESSING -> READY/FAILED so the frontend can poll or refresh.
 */
const processPhotoJob = async (job) => {
  const { photoId } = job.data;

  const photo = await Photo.findById(photoId);
  if (!photo) {
    console.warn(`[ai-worker] Photo ${photoId} no longer exists, skipping`);
    return;
  }

  photo.aiStatus = AI_STATUS.PROCESSING;
  await photo.save();

  try {
    const imageUrl = getInternalFetchUrl(photo.cloudinaryPublicId);
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error(`Failed to fetch photo from Cloudinary: ${imageRes.status}`);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    const { faces } = await detectFacesAndEmbed(imageBuffer);

    if (faces?.length) {
      await FaceEmbedding.insertMany(
        faces.map((face) => ({
          eventId: photo.eventId,
          photoId: photo._id,
          faceIndex: face.faceIndex,
          boundingBox: face.boundingBox,
          embedding: face.embedding,
        }))
      );
    }

    photo.aiStatus = AI_STATUS.READY;
    photo.aiError = null;
    await photo.save();
  } catch (err) {
    photo.aiStatus = AI_STATUS.FAILED;
    photo.aiError = err.message;
    await photo.save();
    throw err; // let BullMQ retry per the queue's attempts/backoff config
  }
};

export const startAiProcessingWorker = () => {
  const connection = getRedisConnection();
  if (!connection) {
    console.warn("[ai-worker] Redis not configured — AI processing worker not started.");
    return null;
  }

  const worker = new Worker(AI_PROCESSING_QUEUE, processPhotoJob, {
    connection,
    concurrency: 3,
  });

  worker.on("completed", (job) => console.log(`[ai-worker] Processed photo ${job.data.photoId}`));
  worker.on("failed", (job, err) =>
    console.error(`[ai-worker] Failed photo ${job?.data?.photoId}:`, err.message)
  );

  return worker;
};

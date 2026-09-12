import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { CLOUDINARY_SYNC_QUEUE } from "../queues/cloudinarySync.queue.js";
import { Photo, Like, Favourite, Download, FaceEmbedding } from "../models/index.js";
import { checkExistingPublicIds } from "../services/cloudinaryService.js";

const BATCH_SIZE = 200;

/**
 * Sweeps every Photo document in the database and removes any whose
 * Cloudinary asset no longer exists (e.g. deleted directly in the
 * Cloudinary dashboard, bypassing the app). This is the automatic
 * counterpart to the organizer-triggered per-event sync endpoint.
 */
const syncAllPhotos = async () => {
  let totalChecked = 0;
  let totalRemoved = 0;
  let lastId = null;

  // Page through photos in batches rather than loading everything into
  // memory at once — event photo counts can get large.
  while (true) {
    const query = lastId ? { _id: { $gt: lastId } } : {};
    const batch = await Photo.find(query).sort({ _id: 1 }).limit(BATCH_SIZE).select("cloudinaryPublicId");
    if (!batch.length) break;

    const publicIds = batch.map((p) => p.cloudinaryPublicId);
    const stillExisting = await checkExistingPublicIds(publicIds);
    const orphaned = batch.filter((p) => !stillExisting.has(p.cloudinaryPublicId));

    if (orphaned.length) {
      const orphanedIds = orphaned.map((p) => p._id);
      await Promise.all([
        Photo.deleteMany({ _id: { $in: orphanedIds } }),
        Like.deleteMany({ photoId: { $in: orphanedIds } }),
        Favourite.deleteMany({ photoId: { $in: orphanedIds } }),
        Download.deleteMany({ photoId: { $in: orphanedIds } }),
        FaceEmbedding.deleteMany({ photoId: { $in: orphanedIds } }),
      ]);
      totalRemoved += orphaned.length;
    }

    totalChecked += batch.length;
    lastId = batch[batch.length - 1]._id;
  }

  if (totalRemoved > 0) {
    console.log(`[cloudinary-sync] Checked ${totalChecked} photos, removed ${totalRemoved} orphaned record(s)`);
  }
};

export const startCloudinarySyncWorker = () => {
  const connection = getRedisConnection();
  if (!connection) {
    console.warn("[cloudinary-sync] Redis not configured — automatic sync sweep will not run.");
    console.warn("[cloudinary-sync] Organizers can still use the manual 'Sync with Cloudinary' button per event.");
    return null;
  }

  const worker = new Worker(CLOUDINARY_SYNC_QUEUE, syncAllPhotos, { connection });
  worker.on("completed", () => console.log("[cloudinary-sync] Sweep completed"));
  worker.on("failed", (job, err) => console.error("[cloudinary-sync] Sweep failed:", err.message));

  return worker;
};

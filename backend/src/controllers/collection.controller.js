import archiver from "archiver";
import asyncHandler from "express-async-handler";
import { Event, MyPhotosCollection, Photo, Purchase, Download } from "../models/index.js";
import { getOptimizedUrl, getWatermarkedUrl, getInternalFetchUrl } from "../services/cloudinaryService.js";
import { AppError } from "../utils/AppError.js";

/**
 * Returns the current user's persisted "My Photos" collection for this
 * event (created/updated by Find My Photos) — lets them revisit their
 * matches without re-uploading a selfie. Same authorization shape as
 * the live search: paid photos the user hasn't purchased come back
 * watermarked, never full-resolution.
 */
export const getMyPhotosCollection = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const collection = await MyPhotosCollection.findOne({ eventId, userId: req.user.id });
  if (!collection || collection.photoIds.length === 0) {
    return res.status(200).json({ success: true, data: { photos: [], hasSearched: Boolean(collection) } });
  }

  const [photos, purchases] = await Promise.all([
    Photo.find({ _id: { $in: collection.photoIds } }).lean(),
    Purchase.find({ userId: req.user.id, eventId }).select("photoId"),
  ]);
  const purchasedIds = new Set(purchases.map((p) => p.photoId?.toString()));

  const results = photos
    .map((photo) => {
      const isPurchased = purchasedIds.has(photo._id.toString());
      return {
        ...photo,
        url: photo.isPaid && !isPurchased ? getWatermarkedUrl(photo.cloudinaryPublicId) : getOptimizedUrl(photo.cloudinaryPublicId),
        purchased: photo.isPaid ? isPurchased : true,
        confidence: collection.confidenceByPhotoId.get(photo._id.toString()) ?? undefined,
      };
    })
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  res.status(200).json({ success: true, data: { photos: results, hasSearched: true } });
});

/**
 * Streams a ZIP of every photo in the user's My Photos collection for
 * this event, in original/high-resolution quality. Never loads the
 * whole archive into memory — `archiver` pipes each fetched image
 * straight into the response stream as it downloads it from
 * Cloudinary, so this scales to large matched sets without ballooning
 * server memory.
 *
 * Authorization mirrors the single-photo download endpoint exactly:
 * free photos are always included, paid photos only if a Purchase
 * record exists — enforced here server-side, not left to the frontend
 * to only show a button for authorized photos.
 */
export const downloadMyPhotosZip = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const [event, collection] = await Promise.all([
    Event.findById(eventId).select("title"),
    MyPhotosCollection.findOne({ eventId, userId: req.user.id }),
  ]);
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
  if (!collection || collection.photoIds.length === 0) {
    throw new AppError("Run Find My Photos first — no matched photos to download yet", 404, "NO_COLLECTION");
  }

  const [photos, purchases] = await Promise.all([
    Photo.find({ _id: { $in: collection.photoIds } }).lean(),
    Purchase.find({ userId: req.user.id, eventId }).select("photoId"),
  ]);
  const purchasedIds = new Set(purchases.map((p) => p.photoId?.toString()));

  const authorizedPhotos = photos.filter((p) => !p.isPaid || purchasedIds.has(p._id.toString()));
  const skippedCount = photos.length - authorizedPhotos.length;

  if (authorizedPhotos.length === 0) {
    throw new AppError(
      "All of your matched photos are paid and not yet purchased — buy them individually to download",
      402,
      "NOTHING_AUTHORIZED"
    );
  }

  const safeEventName = event.title.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Event";
  const zipFilename = `SnapShare_My_Photos_${safeEventName}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);
  res.setHeader("X-Photo-Count", String(authorizedPhotos.length));
  res.setHeader("X-Skipped-Count", String(skippedCount));
  res.setHeader("Access-Control-Expose-Headers", "X-Photo-Count, X-Skipped-Count, Content-Disposition");

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (err) => {
    // Headers are already sent once streaming starts, so we can't send
    // a JSON error at this point — just end the response and log it.
    console.error("[downloadMyPhotosZip] archive error:", err);
    res.end();
  });
  archive.pipe(res);

  const usedNames = new Set();
  const downloadedPhotoIds = [];

  for (let i = 0; i < authorizedPhotos.length; i++) {
    const photo = authorizedPhotos[i];
    try {
      const response = await fetch(getInternalFetchUrl(photo.cloudinaryPublicId));
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());

      let name = `photo_${String(i + 1).padStart(3, "0")}.jpg`;
      while (usedNames.has(name)) name = `photo_${String(i + 1).padStart(3, "0")}_${Date.now()}.jpg`;
      usedNames.add(name);

      archive.append(buffer, { name });
      downloadedPhotoIds.push(photo._id);
    } catch (err) {
      console.error(`[downloadMyPhotosZip] failed to fetch photo ${photo._id}:`, err.message);
      // Skip this one file rather than failing the whole archive.
    }
  }

  await archive.finalize();

  // Record downloads + bump counters for every file that actually made
  // it into the archive, same bookkeeping as the single-photo download.
  if (downloadedPhotoIds.length) {
    Photo.updateMany({ _id: { $in: downloadedPhotoIds } }, { $inc: { downloadCount: 1 } }).catch(() => {});
    Download.insertMany(
      downloadedPhotoIds.map((photoId) => ({ photoId, userId: req.user.id })),
      { ordered: false }
    ).catch(() => {});
  }
});

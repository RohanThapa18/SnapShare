import asyncHandler from "express-async-handler";
import { Photo, Event, Purchase, Download, Like, Favourite, FaceEmbedding, EventParticipant } from "../models/index.js";
import { processImage } from "../services/imageService.js";
import {
  uploadToCloudinary,
  deleteCloudinaryAsset,
  getOptimizedUrl,
  getThumbnailUrl,
  getWatermarkedUrl,
  getInternalFetchUrl,
  checkExistingPhotos,
  looksLikeBadLookup,
  eventPhotoFilesExist,
} from "../services/cloudinaryService.js";
import { presentPhoto } from "../services/photoPresenter.js";
import { enqueuePhotoForAiProcessing } from "../queues/aiProcessing.queue.js";
import { AppError } from "../utils/AppError.js";
import { ALBUM_TYPE } from "../constants/enums.js";

const uploadOne = async (file, { eventId, uploaderId, album, isPaid, price }) => {
  const type = "authenticated";
  const processed = await processImage(file.buffer);
  const cloudinaryResult = await uploadToCloudinary(processed.buffer, {
    eventId,
    folder: album.toLowerCase(),
    type,
  });

  let photo;
  try {
    photo = await Photo.create({
      eventId,
      uploaderId,
      album,
      cloudinaryPublicId: cloudinaryResult.public_id,
      deliveryType: type,
      url: getOptimizedUrl(cloudinaryResult.public_id, { type }),
      thumbnailUrl: getThumbnailUrl(cloudinaryResult.public_id, { type }),
      width: processed.width,
      height: processed.height,
      fileSizeBytes: processed.sizeBytes,
      isPaid: Boolean(isPaid),
      price: isPaid ? Number(price) || 0 : 0,
    });
  } catch (err) {
    // Don't leave an orphaned asset in Cloudinary if the DB write fails.
    await deleteCloudinaryAsset(cloudinaryResult.public_id, type).catch(() => { });
    throw err;
  }

  await enqueuePhotoForAiProcessing(photo._id.toString());
  return photo;
};

/**
 * Uploads files one by one, retrying each once. A failure never aborts
 * the batch; it is reported back per file instead.
 */
const uploadBatch = async (files, opts) => {
  const photos = [];
  const failed = [];

  for (const file of files) {
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        photos.push(await uploadOne(file, opts));
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (lastErr) {
      console.error(`[upload] failed for ${file.originalname}:`, lastErr.message);
      failed.push({ filename: file.originalname, reason: lastErr.message });
    }
  }

  return { photos, failed };
};

// 201 = everything saved, 207 = some saved / some failed, 502 = nothing saved.
const sendBatchResult = (res, { photos, failed }) => {
  if (!photos.length) {
    return res.status(502).json({
      success: false,
      message: `All ${failed.length} upload(s) failed`,
      code: "UPLOAD_FAILED",
      data: { photos: [], failed },
    });
  }
  const total = photos.length + failed.length;
  const message = failed.length
    ? `${photos.length} of ${total} photo(s) uploaded, ${failed.length} failed`
    : `${photos.length} photo(s) uploaded`;
  return res
    .status(failed.length ? 207 : 201)
    .json({ success: true, message, data: { photos, failed } });
};

/**
 * Official album upload — photographer only (enforced by route middleware).
 */
export const uploadOfficialPhotos = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new AppError("No files uploaded", 400, "NO_FILES");

  const isPaid = req.body.isPaid === true || req.body.isPaid === "true";
  const price = Number(req.body.price) || 0;
  if (isPaid && price <= 0) {
    throw new AppError("Paid photos need a price greater than 0", 400, "INVALID_PRICE");
  }

  const result = await uploadBatch(req.files, {
    eventId: req.params.id,
    uploaderId: req.user.id,
    album: ALBUM_TYPE.OFFICIAL,
    isPaid,
    price,
  });
  sendBatchResult(res, result);
});

/**
 * Community album upload — participant only, always free (no pricing on community photos).
 */
export const uploadCommunityPhotos = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new AppError("No files uploaded", 400, "NO_FILES");

  const result = await uploadBatch(req.files, {
    eventId: req.params.id,
    uploaderId: req.user.id,
    album: ALBUM_TYPE.COMMUNITY,
    isPaid: false,
  });
  sendBatchResult(res, result);
});

/**
 * Gallery listing with pagination, album filter, sort. Paid photos that
 * the current user hasn't purchased get a watermarked URL substituted
 * for `url` — the original is never sent until purchase is verified.
 */
export const listPhotos = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const { album, sort = "latest", uploaderId } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 24));

  const filter = { eventId };
  if (album) filter.album = album;
  if (uploaderId) filter.uploaderId = uploaderId;

  const sortMap = { latest: { createdAt: -1 }, popular: { likeCount: -1 } };

  const photos = await Photo.find(filter)
    .sort(sortMap[sort] || sortMap.latest)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  let purchasedPhotoIds = new Set();
  let likedPhotoIds = new Set();
  let favouritedPhotoIds = new Set();

  if (req.user) {
    const photoIds = photos.map((p) => p._id);
    const [purchases, likes, favourites] = await Promise.all([
      Purchase.find({ userId: req.user.id, eventId }).select("photoId"),
      Like.find({ userId: req.user.id, photoId: { $in: photoIds } }).select("photoId"),
      Favourite.find({ userId: req.user.id, photoId: { $in: photoIds } }).select("photoId"),
    ]);
    purchasedPhotoIds = new Set(purchases.map((p) => p.photoId?.toString()));
    likedPhotoIds = new Set(likes.map((l) => l.photoId.toString()));
    favouritedPhotoIds = new Set(favourites.map((f) => f.photoId.toString()));
  }

  const enriched = photos.map((photo) => ({
    ...presentPhoto(photo, { purchased: purchasedPhotoIds.has(photo._id.toString()) }),
    likedByMe: likedPhotoIds.has(photo._id.toString()),
    favouritedByMe: favouritedPhotoIds.has(photo._id.toString()),
  }));

  const total = await Photo.countDocuments(filter);

  res.status(200).json({ success: true, data: { photos: enriched, total, page: Number(page) } });
});

export const deletePhoto = asyncHandler(async (req, res) => {
  const photo = await Photo.findById(req.params.photoId);
  if (!photo) throw new AppError("Photo not found", 404, "PHOTO_NOT_FOUND");

  const isUploader = photo.uploaderId.toString() === req.user.id;

  let isOrganizer = false;
  if (!isUploader) {
    const event = await Event.findById(photo.eventId).select("organizerId");
    isOrganizer = Boolean(event && event.organizerId.toString() === req.user.id);
  }

  if (!isUploader && !isOrganizer) {
    throw new AppError(
      "You can only delete your own uploads, or as the event organizer",
      403,
      "NOT_PHOTO_OWNER"
    );
  }

  await deleteCloudinaryAsset(photo.cloudinaryPublicId, photo.deliveryType);
  await Promise.all([
    Photo.findByIdAndDelete(photo._id),
    Like.deleteMany({ photoId: photo._id }),
    Favourite.deleteMany({ photoId: photo._id }),
    Download.deleteMany({ photoId: photo._id }),
    FaceEmbedding.deleteMany({ photoId: photo._id }),
  ]);

  res.status(200).json({ success: true, message: "Photo deleted" });
});

export const updatePhotoMeta = asyncHandler(async (req, res) => {
  const photo = await Photo.findById(req.params.photoId);
  if (!photo) throw new AppError("Photo not found", 404, "PHOTO_NOT_FOUND");

  if (photo.uploaderId.toString() !== req.user.id) {
    throw new AppError("You can only edit your own uploads", 403, "NOT_PHOTO_OWNER");
  }

  // Only official-album photographer uploads can carry a price
  if (photo.album === ALBUM_TYPE.OFFICIAL) {
    if (req.body.isPaid !== undefined) photo.isPaid = req.body.isPaid === true || req.body.isPaid === "true";
    if (req.body.price !== undefined) photo.price = Number(req.body.price) || 0;
  }

  await photo.save();
  res.status(200).json({ success: true, message: "Photo updated", data: { photo } });
});

/**
 * Serves the actual download. Free photos: anyone in the event can
 * download the optimized/original version. Paid photos: only after a
 * verified Purchase record exists — enforced here, not just hidden in UI.
 */
export const downloadPhoto = asyncHandler(async (req, res) => {
  const photo = await Photo.findById(req.params.photoId);
  if (!photo) throw new AppError("Photo not found", 404, "PHOTO_NOT_FOUND");

  const membership = await EventParticipant.findOne({ eventId: photo.eventId, userId: req.user.id });
  if (!membership) {
    throw new AppError("You must join this event before downloading its photos", 403, "NOT_EVENT_MEMBER");
  }

  if (photo.isPaid) {
    // The photographer who uploaded it, and the event organizer, don't pay for it.
    const isUploader = photo.uploaderId.toString() === req.user.id;
    let isOrganizer = false;
    if (!isUploader) {
      const event = await Event.findById(photo.eventId).select("organizerId");
      isOrganizer = Boolean(event && event.organizerId.toString() === req.user.id);
    }

    if (!isUploader && !isOrganizer) {
      const purchase = await Purchase.findOne({ userId: req.user.id, photoId: photo._id });
      if (!purchase) {
        throw new AppError("Purchase this photo to download the full-resolution version", 402, "NOT_PURCHASED");
      }
    }
  }

  const response = await fetch(
    getInternalFetchUrl(photo.cloudinaryPublicId, { type: photo.deliveryType })
  );
  if (!response.ok) {
    console.error(
      `[download] Cloudinary returned ${response.status} for ${photo.cloudinaryPublicId} (${photo.deliveryType})`
    );
    throw new AppError("Could not fetch photo from storage", 502, "CLOUDINARY_FETCH_FAILED");
  }

  photo.downloadCount += 1;
  await photo.save();
  await Download.create({ photoId: photo._id, userId: req.user.id });

  const filename = `snapshare_${photo.eventId}_${photo._id}.jpg`;
  const buffer = Buffer.from(await response.arrayBuffer());

  res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.status(200).send(buffer);
});

/**
 * Reconciles this event's photos against what actually still exists on
 * Cloudinary. If someone deletes an asset directly in the Cloudinary
 * dashboard (bypassing our API entirely), our MongoDB Photo document
 * has no way of knowing that happened — it would otherwise sit there
 * forever pointing at a dead asset. This checks every photo's public ID
 * against Cloudinary's Admin API and removes any Photo (plus its
 * dependent likes/favourites/downloads/face-embeddings) whose asset is
 * actually gone.
 */
export const syncEventPhotosWithCloudinary = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const photos = await Photo.find({ eventId }).select("cloudinaryPublicId");
  if (!photos.length) {
    return res.status(200).json({ success: true, data: { checked: 0, removed: 0 } });
  }

  const stillExisting = await checkExistingPhotos(photos);

  const orphaned = photos.filter((p) => !stillExisting.has(p.cloudinaryPublicId));

  // If everything (or most of a big event) looks "missing", the lookup is
  // almost certainly wrong, not the photos. Refuse to delete anything.
  // If everything (or most of a big event) looks "missing", double-check
  // against the event's folders on Cloudinary before deleting. Empty folders
  // mean the photos really are gone; files present mean the lookup is wrong.
  if (
    looksLikeBadLookup(photos.length, orphaned.length) &&
    req.query.force !== "true" &&
    (await eventPhotoFilesExist(eventId))
  ) {
    throw new AppError(
      `Sync stopped: ${orphaned.length} of ${photos.length} photos look missing, but files for this event still exist on Cloudinary, so this looks like a lookup problem. Nothing was removed.`,
      409,
      "SYNC_UNSAFE"
    );
  }

  if (orphaned.length) {
    const orphanedIds = orphaned.map((p) => p._id);
    await Promise.all([
      Photo.deleteMany({ _id: { $in: orphanedIds } }),
      Like.deleteMany({ photoId: { $in: orphanedIds } }),
      Favourite.deleteMany({ photoId: { $in: orphanedIds } }),
      Download.deleteMany({ photoId: { $in: orphanedIds } }),
      FaceEmbedding.deleteMany({ photoId: { $in: orphanedIds } }),
    ]);
  }

  res.status(200).json({
    success: true,
    message: orphaned.length
      ? `Removed ${orphaned.length} photo(s) that no longer exist on Cloudinary`
      : "Everything is in sync — no orphaned photos found",
    data: { checked: photos.length, removed: orphaned.length },
  });
});



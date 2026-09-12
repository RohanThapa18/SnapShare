import asyncHandler from "express-async-handler";
import { Photo, Purchase, Download, Like, Favourite, FaceEmbedding } from "../models/index.js";
import { processImage } from "../services/imageService.js";
import {
  uploadToCloudinary,
  deleteCloudinaryAsset,
  getOptimizedUrl,
  getThumbnailUrl,
  getWatermarkedUrl,
  getOriginalUrl,
  checkExistingPublicIds,
} from "../services/cloudinaryService.js";
import { enqueuePhotoForAiProcessing } from "../queues/aiProcessing.queue.js";
import { AppError } from "../utils/AppError.js";
import { ALBUM_TYPE } from "../constants/enums.js";

const uploadOne = async (file, { eventId, uploaderId, album, isPaid, price }) => {
  const processed = await processImage(file.buffer);
  const cloudinaryResult = await uploadToCloudinary(processed.buffer, {
    eventId,
    folder: album.toLowerCase(),
  });

  const photo = await Photo.create({
    eventId,
    uploaderId,
    album,
    cloudinaryPublicId: cloudinaryResult.public_id,
    url: getOptimizedUrl(cloudinaryResult.public_id),
    thumbnailUrl: getThumbnailUrl(cloudinaryResult.public_id),
    width: processed.width,
    height: processed.height,
    fileSizeBytes: processed.sizeBytes,
    isPaid: Boolean(isPaid),
    price: isPaid ? Number(price) || 0 : 0,
  });

  await enqueuePhotoForAiProcessing(photo._id.toString());
  return photo;
};

/**
 * Official album upload — photographer only (enforced by route middleware).
 */
export const uploadOfficialPhotos = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new AppError("No files uploaded", 400, "NO_FILES");

  const { isPaid, price } = req.body;
  const photos = [];
  for (const file of req.files) {
    photos.push(
      await uploadOne(file, {
        eventId: req.params.id,
        uploaderId: req.user.id,
        album: ALBUM_TYPE.OFFICIAL,
        isPaid,
        price,
      })
    );
  }

  res.status(201).json({ success: true, message: `${photos.length} photo(s) uploaded`, data: { photos } });
});

/**
 * Community album upload — participant only, always free (no pricing on community photos).
 */
export const uploadCommunityPhotos = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new AppError("No files uploaded", 400, "NO_FILES");

  const photos = [];
  for (const file of req.files) {
    photos.push(
      await uploadOne(file, {
        eventId: req.params.id,
        uploaderId: req.user.id,
        album: ALBUM_TYPE.COMMUNITY,
        isPaid: false,
      })
    );
  }

  res.status(201).json({ success: true, message: `${photos.length} photo(s) uploaded`, data: { photos } });
});

/**
 * Gallery listing with pagination, album filter, sort. Paid photos that
 * the current user hasn't purchased get a watermarked URL substituted
 * for `url` — the original is never sent until purchase is verified.
 */
export const listPhotos = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const { album, page = 1, limit = 24, sort = "latest", uploaderId } = req.query;

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
  if (req.user) {
    const purchases = await Purchase.find({ userId: req.user.id, eventId }).select("photoId");
    purchasedPhotoIds = new Set(purchases.map((p) => p.photoId?.toString()));
  }

  const enriched = photos.map((photo) => {
    if (photo.isPaid && !purchasedPhotoIds.has(photo._id.toString())) {
      return { ...photo, url: getWatermarkedUrl(photo.cloudinaryPublicId), purchased: false };
    }
    return { ...photo, purchased: photo.isPaid };
  });

  const total = await Photo.countDocuments(filter);

  res.status(200).json({ success: true, data: { photos: enriched, total, page: Number(page) } });
});

export const deletePhoto = asyncHandler(async (req, res) => {
  const photo = await Photo.findById(req.params.photoId);
  if (!photo) throw new AppError("Photo not found", 404, "PHOTO_NOT_FOUND");

  const isOwner = photo.uploaderId.toString() === req.user.id;
  if (!isOwner) {
    throw new AppError("You can only delete your own uploads", 403, "NOT_PHOTO_OWNER");
  }

  await deleteCloudinaryAsset(photo.cloudinaryPublicId);
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
    if (req.body.isPaid !== undefined) photo.isPaid = Boolean(req.body.isPaid);
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

  if (photo.isPaid) {
    const purchase = await Purchase.findOne({ userId: req.user.id, photoId: photo._id });
    if (!purchase) {
      throw new AppError("Purchase this photo to download the full-resolution version", 402, "NOT_PURCHASED");
    }
  }

  photo.downloadCount += 1;
  await photo.save();
  await Download.create({ photoId: photo._id, userId: req.user.id });

  const filename = `snapshare_${photo.eventId}_${photo._id}.jpg`;

  res
    .status(200)
    .json({ success: true, data: { downloadUrl: getOriginalUrl(photo.cloudinaryPublicId, { filename }) } });
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

  const publicIds = photos.map((p) => p.cloudinaryPublicId);
  const stillExisting = await checkExistingPublicIds(publicIds);

  const orphaned = photos.filter((p) => !stillExisting.has(p.cloudinaryPublicId));

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

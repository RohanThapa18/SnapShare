import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { FaceEmbedding, Photo, EventParticipant, Purchase, MyPhotosCollection, Like, Favourite } from "../models/index.js";
import { embedSelfie, cosineSimilarity } from "../services/aiService.js";
import { getOptimizedUrl, getWatermarkedUrl } from "../services/cloudinaryService.js";
import { AppError } from "../utils/AppError.js";

const DEFAULT_THRESHOLD = 0.5;

/**
 * "Find My Photos" — the standout SnapShare feature.
 *
 * Privacy/isolation guarantees enforced here, not just assumed:
 * 1. Caller must have joined the event (checked below, independent of
 *    any route-level membership middleware, so this logic is safe even
 *    if reused elsewhere).
 * 2. Every embedding query is filtered by eventId — never a global scan.
 * 3. The selfie buffer is used only in-memory and discarded after the
 *    request; it is never written to disk or Cloudinary.
 * 4. Raw embedding vectors are never included in the response — only
 *    matching photo metadata and a similarity score.
 */
export const findMyPhotos = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  if (!req.file) {
    throw new AppError("Selfie image is required", 400, "NO_SELFIE");
  }

  const isMember = await EventParticipant.exists({ eventId, userId: req.user.id });
  if (!isMember) {
    throw new AppError("You must join this event before using Find My Photos", 403, "NOT_EVENT_MEMBER");
  }

  // Generate the query embedding — selfie buffer never persisted anywhere
  const queryEmbedding = await embedSelfie(req.file.buffer);

  const threshold = Number(process.env.FACE_MATCH_THRESHOLD) || DEFAULT_THRESHOLD;

  // eventId scoping is mandatory and non-optional here
  const embeddings = await FaceEmbedding.find({ eventId: new mongoose.Types.ObjectId(eventId) }).select(
    "+embedding photoId"
  );

  const matchedPhotoIds = new Map(); // photoId -> best similarity score for that photo

  for (const doc of embeddings) {
    const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
    if (similarity >= threshold) {
      const key = doc.photoId.toString();
      const existing = matchedPhotoIds.get(key);
      if (!existing || similarity > existing) {
        matchedPhotoIds.set(key, similarity);
      }
    }
  }

  // Persist this search as the user's "My Photos" collection for this
  // event — upserted, so re-running the search replaces rather than
  // duplicates it. Lets the user come back later and browse/download
  // without re-uploading a selfie. Stores references only, never
  // binary data.
  await MyPhotosCollection.findOneAndUpdate(
    { eventId, userId: req.user.id },
    {
      eventId,
      userId: req.user.id,
      photoIds: [...matchedPhotoIds.keys()],
      confidenceByPhotoId: Object.fromEntries(matchedPhotoIds),
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  if (matchedPhotoIds.size === 0) {
    return res.status(200).json({
      success: true,
      message: "No matching photos found",
      data: { photos: [] },
    });
  }

  const photos = await Photo.find({ _id: { $in: [...matchedPhotoIds.keys()] } }).lean();

  const purchases = await Purchase.find({ userId: req.user.id, eventId }).select("photoId");
  const purchasedIds = new Set(purchases.map((p) => p.photoId?.toString()));
  const matchedIds = [...matchedPhotoIds.keys()];
  const [likes, favourites] = await Promise.all([
    Like.find({ userId: req.user.id, photoId: { $in: matchedIds } }).select("photoId"),
    Favourite.find({ userId: req.user.id, photoId: { $in: matchedIds } }).select("photoId"),
  ]);
  const likedIds = new Set(likes.map((l) => l.photoId.toString()));
  const favouritedIds = new Set(favourites.map((f) => f.photoId.toString()));
  const results = photos
    .map((photo) => {
      const isPurchased = purchasedIds.has(photo._id.toString());
      return {
        ...photo,
        url:
          photo.isPaid && !isPurchased
            ? getWatermarkedUrl(photo.cloudinaryPublicId)
            : getOptimizedUrl(photo.cloudinaryPublicId),
        purchased: photo.isPaid ? isPurchased : true,
        confidence: Math.round(matchedPhotoIds.get(photo._id.toString()) * 100) / 100,
        likedByMe: likedIds.has(photo._id.toString()),
        favouritedByMe: favouritedIds.has(photo._id.toString()),
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  res.status(200).json({ success: true, data: { photos: results } });
});

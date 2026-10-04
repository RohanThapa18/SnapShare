import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { FaceEmbedding, Photo, EventParticipant, Purchase, MyPhotosCollection } from "../models/index.js";
import { embedSelfies, cosineSimilarity } from "../services/aiService.js";
import { getOptimizedUrl, getWatermarkedUrl } from "../services/cloudinaryService.js";
import { AppError } from "../utils/AppError.js";
import { presentPhoto } from "../services/photoPresenter.js";

// A match at or above this is shown as a confident "this is you" result.
const HIGH_CONFIDENCE_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD) || 0.5;
// Below HIGH but at or above this, still shown, just in a separate
// "possible matches" section — catches genuine matches at an angle or
// with a partially obscured face that a single hard cutoff would drop
// silently. Below this floor is noise and is excluded entirely.
const POSSIBLE_MATCH_FLOOR = Number(process.env.FACE_MATCH_FLOOR) || (HIGH_CONFIDENCE_THRESHOLD - 0.12);

export const findMyPhotos = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  if (!req.files?.length) {
    throw new AppError("At least one selfie image is required", 400, "NO_SELFIE");
  }

  const isMember = await EventParticipant.exists({ eventId, userId: req.user.id });
  if (!isMember) {
    throw new AppError("You must join this event before using Find My Photos", 403, "NOT_EVENT_MEMBER");
  }

  // Selfie buffers are used only in-memory for this request and combined
  // into one query embedding — never persisted anywhere, individually or
  // combined.
  const queryEmbedding = await embedSelfies(req.files.map((f) => f.buffer));

  const embeddings = await FaceEmbedding.find({ eventId: new mongoose.Types.ObjectId(eventId) }).select(
    "+embedding photoId"
  );

  const matchedPhotoIds = new Map(); // photoId -> best similarity score for that photo

  for (const doc of embeddings) {
    const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
    if (similarity >= POSSIBLE_MATCH_FLOOR) {
      const key = doc.photoId.toString();
      const existing = matchedPhotoIds.get(key);
      if (!existing || similarity > existing) {
        matchedPhotoIds.set(key, similarity);
      }
    }
  }

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

  const results = photos
    .map((photo) => {
      const confidence = Math.round(matchedPhotoIds.get(photo._id.toString()) * 100) / 100;
      return {
        ...presentPhoto(photo, { purchased: purchasedIds.has(photo._id.toString()) }),
        confidence,
        tier: confidence >= HIGH_CONFIDENCE_THRESHOLD ? "high" : "possible",
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  res.status(200).json({ success: true, data: { photos: results } });
});
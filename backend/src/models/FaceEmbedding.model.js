import mongoose from "mongoose";

/**
 * Stores a face embedding vector detected in an event photo.
 * A single photo can produce multiple documents (one per detected face).
 *
 * PRIVACY: `embedding` must never be serialized to any API response.
 * All queries against this collection MUST filter by eventId, and the
 * calling service is responsible for verifying the requester has joined
 * that event before this collection is touched at all. See
 * services/aiService.js -> findMyPhotos().
 */
const faceEmbeddingSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    faceIndex: { type: Number, required: true }, // which face within the photo (0-based)
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
    embedding: {
      type: [Number],
      required: true,
      select: false, // never included by default in any query
    },
  },
  { timestamps: true }
);

faceEmbeddingSchema.index({ eventId: 1, photoId: 1 });

// Extra safety net: strip embedding even if a query accidentally selects it
faceEmbeddingSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.embedding;
    return ret;
  },
});

export default mongoose.model("FaceEmbedding", faceEmbeddingSchema);

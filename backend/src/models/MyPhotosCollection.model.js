import mongoose from "mongoose";

/**
 * The persisted result of a user's "Find My Photos" search for a given
 * event — a user-specific collection so they can come back and browse
 * / download their matches later without re-uploading a selfie every
 * time. Re-running Find My Photos for the same event overwrites this
 * (upsert), it doesn't create duplicates.
 *
 * Deliberately stores only photo REFERENCES (ObjectIds), never
 * duplicating the actual image/binary — Cloudinary + the Photo
 * collection remain the single source of truth for the asset itself.
 */
const myPhotosCollectionSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    photoIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Photo" }],
    // Best similarity score per photo at the time of the last search,
    // keyed by photoId string — used to re-render the "% match" badge
    // when revisiting without re-running face search.
    confidenceByPhotoId: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

// One collection per user per event — re-searching updates it in place.
myPhotosCollectionSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export default mongoose.model("MyPhotosCollection", myPhotosCollectionSchema);

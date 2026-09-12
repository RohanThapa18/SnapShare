import mongoose from "mongoose";
import { ALBUM_TYPE, AI_STATUS } from "../constants/enums.js";

const photoSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    album: {
      type: String,
      enum: Object.values(ALBUM_TYPE),
      required: true,
      index: true,
    },

    // Cloudinary is the source of truth for the binary asset.
    // MongoDB only ever stores references + metadata.
    cloudinaryPublicId: { type: String, required: true },
    url: { type: String, required: true }, // optimized delivery URL
    thumbnailUrl: { type: String, required: true },

    width: Number,
    height: Number,
    fileSizeBytes: Number,

    aiStatus: {
      type: String,
      enum: Object.values(AI_STATUS),
      default: AI_STATUS.PENDING,
      index: true,
    },
    aiError: { type: String, default: null },

    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 },

    likeCount: { type: Number, default: 0 },
    favouriteCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

photoSchema.index({ eventId: 1, album: 1, createdAt: -1 });
photoSchema.index({ eventId: 1, uploaderId: 1 });

export default mongoose.model("Photo", photoSchema);

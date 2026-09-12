import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

likeSchema.index({ photoId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Like", likeSchema);

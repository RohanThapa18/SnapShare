import mongoose from "mongoose";

// Analytics-only record of a download event. Not used for access control.
const downloadSchema = new mongoose.Schema(
  {
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

downloadSchema.index({ photoId: 1, createdAt: -1 });

export default mongoose.model("Download", downloadSchema);

import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema(
  {
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

favouriteSchema.index({ photoId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Favourite", favouriteSchema);

import mongoose from "mongoose";

const eventPhotographerSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    canUpload: { type: Boolean, default: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// A photographer is assigned to a given event only once.
// Event-specific access — photographers do NOT get implicit access to every event.
eventPhotographerSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export default mongoose.model("EventPhotographer", eventPhotographerSchema);

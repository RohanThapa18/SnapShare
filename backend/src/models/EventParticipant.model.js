import mongoose from "mongoose";

const eventParticipantSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent a user from joining the same event twice
eventParticipantSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export default mongoose.model("EventParticipant", eventParticipantSchema);

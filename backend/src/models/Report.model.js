import mongoose from "mongoose";

export const REPORT_REASON = Object.freeze({
  INAPPROPRIATE: "INAPPROPRIATE",
  PRIVACY: "PRIVACY",
  COPYRIGHT: "COPYRIGHT",
  SPAM: "SPAM",
  OTHER: "OTHER",
});

export const REPORT_STATUS = Object.freeze({
  OPEN: "OPEN",
  REMOVED: "REMOVED", // organizer deleted the photo
  DISMISSED: "DISMISSED", // organizer reviewed and kept the photo
});

/**
 * A participant flagging a photo for the event's organizers to review.
 * One report per (photo, reporter): reporting twice is a no-op.
 */
const reportSchema = new mongoose.Schema(
  {
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: Object.values(REPORT_REASON), required: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    status: { type: String, enum: Object.values(REPORT_STATUS), default: REPORT_STATUS.OPEN, index: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

reportSchema.index({ photoId: 1, reporterId: 1 }, { unique: true });
reportSchema.index({ eventId: 1, status: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
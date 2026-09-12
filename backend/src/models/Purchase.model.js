import mongoose from "mongoose";
import { PURCHASE_TYPE } from "../constants/enums.js";

/**
 * A Purchase is the permanent access-grant record created only after a
 * Payment reaches SUCCESS. Purchases remain valid and downloadable even
 * after the parent event expires — expiry only blocks NEW purchases,
 * joining, uploading, liking, and favouriting (see middleware/eventStatus.js).
 */
const purchaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    photographerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    purchaseType: { type: String, enum: Object.values(PURCHASE_TYPE), required: true },
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", default: null },
    album: { type: String, default: null }, // set when purchaseType === ALBUM

    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    amountPaid: { type: Number, required: true },

    purchasedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

purchaseSchema.index({ userId: 1, eventId: 1 });
purchaseSchema.index({ userId: 1, photoId: 1 }, { unique: true, sparse: true });
purchaseSchema.index({ photographerId: 1, createdAt: -1 }); // for earnings aggregation

export default mongoose.model("Purchase", purchaseSchema);

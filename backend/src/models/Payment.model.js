import mongoose from "mongoose";
import { PAYMENT_STATUS, PURCHASE_TYPE } from "../constants/enums.js";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },

    purchaseType: { type: String, enum: Object.values(PURCHASE_TYPE), required: true },
    // Exactly one of these is set, matching purchaseType
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", default: null },
    albumId: { type: String, default: null }, // album purchases are scoped by (eventId, album, photographerId), not a separate collection

    photographerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    amount: { type: Number, required: true, min: 0 }, // in smallest currency unit (paise)
    currency: { type: String, default: "INR" },
    // Snapshot taken at order time: exactly what gets unlocked on success (amounts in paise)
    items: {
      type: [{
        _id: false,
        photoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo", required: true },
        amount: { type: Number, required: true },
        fee: { type: Number, default: 0 },
      }],
      default: [],
    },
    platformFee: { type: Number, default: 0 },
    transferAccountId: { type: String, default: null },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);

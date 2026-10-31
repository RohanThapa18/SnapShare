import mongoose from "mongoose";

/** One record per time the admin paid a photographer out. */
const payoutSchema = new mongoose.Schema(
  {
    photographerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 }, // paise
    upiId: { type: String, default: null },           // snapshot of where it was sent
    reference: { type: String, maxlength: 100 },      // UPI transaction id
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Payout", payoutSchema);
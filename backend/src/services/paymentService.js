import crypto from "crypto";
import { getRazorpay } from "../config/razorpay.js";

export const createRazorpayOrder = async (amountInPaise, receipt) => {
  const razorpay = getRazorpay();
  return razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt,
  });
};

/**
 * Verifies the Razorpay payment signature server-side using HMAC-SHA256.
 * This is the ONLY source of truth for whether a payment succeeded —
 * the frontend's callback result is never trusted on its own.
 */
export const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expected === signature;
};

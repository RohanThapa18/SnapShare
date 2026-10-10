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
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set in .env");

  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
  );
  const received = Buffer.from(String(signature));

  // constant-time comparison (a plain === leaks timing information)
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

import crypto from "crypto";
import { getRazorpay } from "../config/razorpay.js";

const hmacHex = (secret, payload) => crypto.createHmac("sha256", secret).update(payload).digest("hex");

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};


export const createRazorpayOrder = async ({ amountInPaise, notes }) => {
  return getRazorpay().orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `ss_${crypto.randomBytes(10).toString("hex")}`,
    notes,
  });
};

/** Checkout-callback signature: HMAC-SHA256(orderId|paymentId) with the key secret. */
export const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set in .env");
  return safeEqual(hmacHex(secret, `${orderId}|${paymentId}`), signature);
};

/** Webhook signature: HMAC-SHA256 of the RAW request body with the webhook secret. */
export const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not set in .env");
  return safeEqual(hmacHex(secret, rawBody), signature);
};

/** Ask Razorpay itself what happened to this payment (source of truth). */
export const fetchRazorpayPayment = (paymentId) => getRazorpay().payments.fetch(paymentId);
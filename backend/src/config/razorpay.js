import Razorpay from "razorpay";

export const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

/**
 * Razorpay client, lazily constructed so the app can still boot (e.g.
 * during early local dev) before payment credentials are configured.
 * Any route that actually needs it should call getRazorpay() and it will
 * throw a clear AppError if unconfigured.
 */
let client = null;

export const getRazorpay = () => {
  if (!isRazorpayConfigured()) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env."
    );
  }
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
};

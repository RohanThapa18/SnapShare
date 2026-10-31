import * as paymentService from "../services/paymentService";
import { openRazorpayCheckout } from "./razorpayCheckout";

const POLL_EVERY_MS = 2500;
const POLL_ATTEMPTS = 12; // ~30s

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const flowError = (code, message) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

/** Asks the server (which asks Razorpay) until the payment is unlocked. */
const waitForUnlock = async (orderId) => {
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    await sleep(POLL_EVERY_MS);
    try {
      const res = await paymentService.getPaymentStatus(orderId);
      const status = res.data.data.status;
      if (status === "SUCCESS") return;
      if (status === "FAILED") {
        throw flowError("PAYMENT_FAILED", "The payment failed. You have not been charged.");
      }
    } catch (err) {
      if (err.code === "PAYMENT_FAILED") throw err;
      // transient network error: keep polling
    }
  }
  throw flowError(
    "STILL_PENDING",
    "Your payment went through but is still being confirmed. The photo will unlock automatically — check Purchases in a minute."
  );
};

/**
 * Runs the whole purchase: create order -> Razorpay popup -> verify -> (poll if needed).
 * Reports progress through onStage("creating" | "paying" | "confirming").
 * Resolves when the content is unlocked; otherwise throws an Error with .code:
 *   ORDER_FAILED | CANCELLED | PAYMENT_FAILED | VERIFY_FAILED | STILL_PENDING
 */
export const runPurchase = async ({ payload, user, description, onStage }) => {
  onStage("creating");
  let order;
  try {
    const res = await paymentService.createOrder(payload);
    order = res.data.data;
  } catch (err) {
    throw flowError("ORDER_FAILED", err.response?.data?.message || "Could not start the purchase");
  }

  onStage("paying");
  let paid;
  try {
    paid = await openRazorpayCheckout({ order, user, description });
  } catch (err) {
    if (err.message === "PAYMENT_CANCELLED") throw flowError("CANCELLED", "Payment cancelled");
    throw flowError("PAYMENT_FAILED", err.message || "Payment failed");
  }

  onStage("confirming");
  try {
    const res = await paymentService.verifyPayment({
      razorpay_order_id: paid.razorpay_order_id,
      razorpay_payment_id: paid.razorpay_payment_id,
      razorpay_signature: paid.razorpay_signature,
    });
    if (res.status !== 202 && !res.data?.pending) return; // unlocked
  } catch (err) {
    const status = err.response?.status;
    if (status && status < 500) {
      throw flowError("VERIFY_FAILED", err.response?.data?.message || "We couldn't verify your payment");
    }
    // Network error / 5xx: the payment may well have gone through, so confirm below
  }

  await waitForUnlock(order.orderId);
};
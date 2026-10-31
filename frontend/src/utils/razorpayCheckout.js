let scriptPromise = null;

export const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
};

/**
 * Opens the Razorpay popup.
 * Resolves with the payment response on success.
 * Rejects with Error("PAYMENT_CANCELLED") if the user closes it without paying,
 * or with the failure reason if every attempt inside the popup failed.
 *
 * Note: a failed attempt does NOT end the flow by itself — Razorpay lets the
 * buyer retry inside the same popup, so we only settle on success or dismiss.
 */
export const openRazorpayCheckout = async ({ order, user, description }) => {
  const loaded = await loadRazorpayScript();
  if (!loaded) throw new Error("Could not load Razorpay. Check your internet connection.");

  return new Promise((resolve, reject) => {
    let settled = false;
    let lastFailure = null;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const rzp = new window.Razorpay({
      key: order.razorpayKeyId,
      amount: order.amount, // paise
      currency: order.currency,
      order_id: order.orderId,
      name: "SnapShare",
      description,
      prefill: { name: user?.name, email: user?.email },
      theme: { color: "#26345f" },
      handler: (response) => settle(resolve, response),
      modal: {
        confirm_close: true, // "are you sure?" before abandoning a payment
        ondismiss: () =>
          settle(reject, new Error(lastFailure || "PAYMENT_CANCELLED")),
      },
    });

    rzp.on("payment.failed", (resp) => {
      lastFailure = resp.error?.description || "Payment failed";
    });

    rzp.open();
  });
};
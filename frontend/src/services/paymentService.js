import api from "./api";

export const createOrder = (payload) => api.post("/payments/create-order", payload);
export const verifyPayment = (payload) => api.post("/payments/verify", payload);
export const listMyPurchases = () => api.get("/payments/purchases");
export const getMyEarnings = () => api.get("/payments/earnings");
export const getMyUpi = () => api.get("/payments/payout/upi");
export const saveMyUpi = (upiId) => api.put("/payments/payout/upi", { upiId });
export const getPendingPayouts = () => api.get("/payments/admin/payouts");
export const markPayoutPaid = (photographerId, reference) =>
    api.post(`/payments/admin/payouts/${photographerId}/paid`, { reference });
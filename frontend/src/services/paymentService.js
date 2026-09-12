import api from "./api";

export const createOrder = (payload) => api.post("/payments/create-order", payload);
export const verifyPayment = (payload) => api.post("/payments/verify", payload);
export const listMyPurchases = () => api.get("/payments/purchases");
export const getMyEarnings = () => api.get("/payments/earnings");

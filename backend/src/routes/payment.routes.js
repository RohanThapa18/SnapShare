import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as paymentController from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema, verifyPaymentSchema, upiSchema, markPaidSchema } from "../validators/payment.validators.js";

const router = Router();

// Webhook: signature-authenticated (not JWT), so it MUST be registered before requireAuth
router.post("/webhook", paymentController.razorpayWebhook);

router.use(requireAuth);

const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const statusLimiter = rateLimit({ windowMs: 5 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });

router.post("/create-order", paymentLimiter, validate(createOrderSchema), paymentController.createOrder);
router.post("/verify", paymentLimiter, validate(verifyPaymentSchema), paymentController.verifyPayment);
router.get("/purchases", paymentController.listMyPurchases);
router.get("/earnings", paymentController.getMyEarnings);
router.get("/status/:orderId", statusLimiter, paymentController.getPaymentStatus);
router.get("/sales", paymentController.getMySales);

// Photographer's UPI ID
router.get("/payout/upi", paymentController.getMyUpi);
router.put("/payout/upi", validate(upiSchema), paymentController.saveMyUpi);

// Admin only
router.get("/admin/payouts", requireAdmin, paymentController.adminListPendingPayouts);
router.post("/admin/payouts/:photographerId/paid", requireAdmin, validate(markPaidSchema), paymentController.adminMarkPaid);

export default router;
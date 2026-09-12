import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as paymentController from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema, verifyPaymentSchema } from "../validators/payment.validators.js";

const router = Router();
router.use(requireAuth);

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/create-order", paymentLimiter, validate(createOrderSchema), paymentController.createOrder);
router.post("/verify", paymentLimiter, validate(verifyPaymentSchema), paymentController.verifyPayment);
router.get("/purchases", paymentController.listMyPurchases);
// Available to any authenticated user — returns an aggregation over
// purchases where they are the photographer, which is simply empty if
// they've never uploaded to an event's Official album.
router.get("/earnings", paymentController.getMyEarnings);

export default router;

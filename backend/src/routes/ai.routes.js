import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as aiController from "../controllers/ai.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadSelfie } from "../middleware/upload.js";

// Mounted at /api/events/:id/find-my-photos
const router = Router({ mergeParams: true });

// AI inference is expensive — rate limit more aggressively than general routes
const findMyPhotosLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many search attempts, please wait a few minutes", code: "RATE_LIMITED" },
});

router.post("/", requireAuth, findMyPhotosLimiter, uploadSelfie, aiController.findMyPhotos);

export default router;

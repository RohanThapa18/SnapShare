import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../validators/auth.validators.js";

const router = Router();

// Tighter rate limit on auth endpoints specifically — brute force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later", code: "RATE_LIMITED" },
});

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/logout", requireAuth, authController.logout);

router.get("/me", requireAuth, authController.getMe);
router.put("/me", requireAuth, validate(updateProfileSchema), authController.updateMe);
router.put(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;

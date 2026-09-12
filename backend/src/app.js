import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import eventRoutes from "./routes/event.routes.js";
import photographerRoutes from "./routes/photographer.routes.js";
import { eventPhotoRouter, photoRouter } from "./routes/photo.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import collectionRoutes from "./routes/collection.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

// --- Security & parsing middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// --- Baseline rate limiting (tightened per-route for auth/payments/AI) ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// --- Routes ---
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/events/:id/photographers", photographerRoutes);
app.use("/api/events/:id/photos", eventPhotoRouter);
app.use("/api/events/:id/find-my-photos", aiRoutes);
app.use("/api/events/:id/my-photos", collectionRoutes);
app.use("/api/photos", photoRouter);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);

// --- 404 + centralized error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

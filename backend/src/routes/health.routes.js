import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

/**
 * GET /api/health
 * Simple liveness + DB connectivity check. Used to confirm the backend
 * is running and successfully connected to MongoDB Atlas.
 */
router.get("/", (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];

  res.status(200).json({
    success: true,
    message: "SnapShare API is running",
    timestamp: new Date().toISOString(),
    database: dbStates[mongoose.connection.readyState] || "unknown",
  });
});

export default router;

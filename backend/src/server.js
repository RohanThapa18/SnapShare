import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startAiProcessingWorker } from "./jobs/aiProcessing.worker.js";
import { startEventExpiryWorker } from "./jobs/eventExpiry.worker.js";
import { startCloudinarySyncWorker } from "./jobs/cloudinarySync.worker.js";
import { scheduleEventExpirySweep } from "./queues/eventExpiry.queue.js";
import { scheduleCloudinarySync } from "./queues/cloudinarySync.queue.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  // Background workers — no-op with a warning if REDIS_URL isn't set,
  // so the API still boots for local dev without Redis configured yet.
  startAiProcessingWorker();
  startEventExpiryWorker();
  startCloudinarySyncWorker();
  await scheduleEventExpirySweep();
  await scheduleCloudinarySync();

  app.listen(PORT, () => {
    console.log(`[server] SnapShare API running on http://localhost:${PORT}`);
    console.log(`[server] Environment: ${process.env.NODE_ENV || "development"}`);
  });
};

start();

process.on("unhandledRejection", (err) => {
  console.error("[server] Unhandled promise rejection:", err);
  process.exit(1);
});

import { Router } from "express";
import * as collectionController from "../controllers/collection.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireEventParticipant } from "../middleware/membership.js";

// Mounted at /api/events/:id/my-photos
const router = Router({ mergeParams: true });

router.use(requireAuth, requireEventParticipant);

router.get("/", collectionController.getMyPhotosCollection);
router.get("/download-all", collectionController.downloadMyPhotosZip);

export default router;

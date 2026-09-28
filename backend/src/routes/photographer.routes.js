import { Router } from "express";
import * as photographerController from "../controllers/photographer.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireEventOwner, requireEventParticipant } from "../middleware/membership.js";

// Mounted at /api/events/:id/photographers
const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/", requireEventParticipant, photographerController.listPhotographers);
router.post("/", requireEventOwner, photographerController.addPhotographer);
router.delete("/:userId", requireEventOwner, photographerController.removePhotographer);
router.put("/:userId/permission", requireEventOwner, photographerController.setPhotographerPermission);

export default router;
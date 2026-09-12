import { Router } from "express";
import * as photographerController from "../controllers/photographer.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireEventOwner } from "../middleware/membership.js";

// Mounted at /api/events/:id/photographers
const router = Router({ mergeParams: true });

router.use(requireAuth, requireEventOwner);

router.post("/", photographerController.addPhotographer);
router.get("/", photographerController.listPhotographers);
router.delete("/:userId", photographerController.removePhotographer);
router.put("/:userId/permission", photographerController.setPhotographerPermission);

export default router;

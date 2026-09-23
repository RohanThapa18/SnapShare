import { Router } from "express";
import * as photoController from "../controllers/photo.controller.js";
import * as interactionController from "../controllers/interaction.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireActiveEvent } from "../middleware/eventStatus.js";
import { requireEventParticipant, requireEventPhotographer } from "../middleware/membership.js";
import { requireEventOwner } from "../middleware/membership.js";
import { uploadMultiple } from "../middleware/upload.js";

// Nested under /api/events/:id/photos
export const eventPhotoRouter = Router({ mergeParams: true });

eventPhotoRouter.use(requireAuth);

eventPhotoRouter.get("/", photoController.listPhotos);

eventPhotoRouter.post(
  "/official",
  requireActiveEvent,
  requireEventPhotographer,
  uploadMultiple,
  photoController.uploadOfficialPhotos
);

eventPhotoRouter.post(
  "/community",
  requireActiveEvent,
  requireEventParticipant,
  uploadMultiple,
  photoController.uploadCommunityPhotos
);

// Organizer-only: reconcile against Cloudinary in case photos were
// deleted directly there, bypassing the app entirely.
eventPhotoRouter.post("/sync", requireEventOwner, photoController.syncEventPhotosWithCloudinary);

// Standalone /api/photos/:photoId routes (not nested under an event id)
export const photoRouter = Router();
photoRouter.use(requireAuth);

photoRouter.delete("/:photoId", photoController.deletePhoto);
photoRouter.put("/:photoId", photoController.updatePhotoMeta);
photoRouter.get("/:photoId/download", photoController.downloadPhoto);

photoRouter.post("/:photoId/like", interactionController.likePhoto);
photoRouter.delete("/:photoId/like", interactionController.unlikePhoto);
photoRouter.post("/:photoId/favourite", interactionController.favouritePhoto);
photoRouter.delete("/:photoId/favourite", interactionController.unfavouritePhoto);

photoRouter.get("/favourites/mine", interactionController.listMyFavourites);
photoRouter.get("/favourites/mine", interactionController.listMyFavourites);
photoRouter.get("/likes/mine", interactionController.listMyLikes);
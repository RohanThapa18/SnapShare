
import { Router } from "express";

import * as eventController from "../controllers/event.controller.js";

import { requireAuth } from "../middleware/auth.js";
import { requireActiveEvent } from "../middleware/eventStatus.js";
import {
  requireEventOwner,
  requireEventParticipant,
} from "../middleware/membership.js";
import { resolveEventRef } from "../middleware/resolveEventRef.js";
import { uploadCoverImage } from "../middleware/upload.js";

import { validate } from "../middleware/validate.js";

import {
  createEventSchema,
  updateEventSchema,
  joinEventSchema,
  joinAsPhotographerSchema,
} from "../validators/event.validators.js";
import rateLimit from "express-rate-limit";


const router = Router();

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many join attempts, please try again later", code: "RATE_LIMITED" },
});


router.use(requireAuth);
router.get("/:id/photographer-passcode", requireEventOwner, eventController.getPhotographerPasscode);

router.post(
  "/:id/photographer-passcode/regenerate",
  requireEventOwner,
  eventController.regeneratePhotographerPasscode
);
router.post("/:id/join", joinLimiter, requireActiveEvent, validate(joinEventSchema), eventController.joinEvent);
// Any authenticated user can create an event.
router.post(
  "/",
  uploadCoverImage,
  validate(createEventSchema),
  eventController.createEvent
);

router.get("/mine", eventController.listMyEvents);

router.get("/slug/:slug", eventController.getEventBySlug);

router.get("/:id/stats", requireEventOwner, eventController.getEventStats);

router.get("/:id/join-qr", requireEventOwner, eventController.getJoinQr);

router.get(
  "/:id/photographer-join-qr",
  requireEventOwner,
  eventController.getPhotographerJoinQr
);

router.get("/:id/passcode", requireEventOwner, eventController.getEventPasscode);

router.post(
  "/:id/passcode/regenerate",
  requireEventOwner,
  eventController.regenerateEventPasscode
);

router.put(
  "/:id",
  requireEventOwner,
  validate(updateEventSchema),
  eventController.updateEvent
);

router.put("/:id/cover", requireEventOwner, uploadCoverImage, eventController.updateEventCover);

router.delete("/:id/cover", requireEventOwner, eventController.removeEventCover);

router.delete("/:id", requireEventOwner, eventController.deleteEvent);

router.get("/:id/participants", requireEventParticipant, eventController.getParticipants);

router.delete(
  "/:id/participants/:userId",
  requireEventOwner,
  eventController.removeParticipant
);

router.post(
  "/:id/join",
  requireActiveEvent,
  joinLimiter,
  resolveEventRef,
  validate(joinEventSchema),
  eventController.joinEvent
);

router.post(
  "/:id/join-as-photographer",
  requireActiveEvent,
  resolveEventRef,
  validate(joinAsPhotographerSchema),
  eventController.joinEventAsPhotographer
);

router.post("/:id/leave", eventController.leaveEvent);

router.get("/:id", requireEventParticipant, eventController.getEvent);

export default router;

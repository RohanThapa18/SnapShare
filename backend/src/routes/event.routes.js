import { Router } from "express";
import * as eventController from "../controllers/event.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireActiveEvent } from "../middleware/eventStatus.js";
import { requireEventOwner } from "../middleware/membership.js";
import { validate } from "../middleware/validate.js";
import {
  createEventSchema,
  updateEventSchema,
  joinEventSchema,
  joinAsPhotographerSchema,
} from "../validators/event.validators.js";

const router = Router();

router.use(requireAuth);

// Any authenticated user can create an event — they become that
// event's organizer. There is no separate "Organizer" account type;
// the same account can also join other events as a participant or
// photographer, Google-Classroom-style.
router.post("/", validate(createEventSchema), eventController.createEvent);

router.get("/mine", eventController.listMyEvents);
router.get("/:id", eventController.getEvent);
router.get("/:id/stats", requireEventOwner, eventController.getEventStats);
router.get("/:id/join-qr", requireEventOwner, eventController.getJoinQr);
router.get("/:id/photographer-join-qr", requireEventOwner, eventController.getPhotographerJoinQr);

// Organizer-only, backend-enforced passcode access — can be called any
// time while the organizer owns the event, not just right after
// creation. requireEventOwner (not a frontend check) is what actually
// prevents anyone else from reading or rotating this.
router.get("/:id/passcode", requireEventOwner, eventController.getEventPasscode);
router.post("/:id/passcode/regenerate", requireEventOwner, eventController.regenerateEventPasscode);

router.put("/:id", requireEventOwner, validate(updateEventSchema), eventController.updateEvent);
router.delete("/:id", requireEventOwner, eventController.deleteEvent);

router.post("/:id/join", requireActiveEvent, validate(joinEventSchema), eventController.joinEvent);
router.post(
  "/:id/join-as-photographer",
  requireActiveEvent,
  validate(joinAsPhotographerSchema),
  eventController.joinEventAsPhotographer
);
router.post("/:id/leave", eventController.leaveEvent);

router.get("/:id/participants", requireEventOwner, eventController.getParticipants);
router.delete("/:id/participants/:userId", requireEventOwner, eventController.removeParticipant);

export default router;

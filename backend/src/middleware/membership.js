import { Event, EventParticipant, EventPhotographer } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { isEventOrganizer, isPrimaryOrganizer } from "../utils/eventRoles.js";
/**
 * Verifies the authenticated user has joined the event as a participant.
 * Used to gate Find My Photos, community uploads, likes/favourites, etc.
 * This is a hard server-side check — never inferred from frontend state.
 */
export const requireEventParticipant = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const membership = await EventParticipant.findOne({ eventId, userId: req.user.id });
    if (!membership) {
      throw new AppError(
        "You must join this event before performing this action",
        403,
        "NOT_EVENT_MEMBER"
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};


export const requireEventOwner = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const event = await Event.findById(eventId).select("organizerId coOrganizerIds");
    if (!event) {
      throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
    }
    if (!isEventOrganizer(event, req.user.id)) {
      throw new AppError("Only event organizers can perform this action", 403, "NOT_EVENT_OWNER");
    }
    req.event = event;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Only the original owner (the person who created the event).
 */
export const requireEventPrimaryOwner = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const event = await Event.findById(eventId).select("organizerId coOrganizerIds");
    if (!event) {
      throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
    }
    if (!isPrimaryOrganizer(event, req.user.id)) {
      throw new AppError("Only the event owner can perform this action", 403, "NOT_EVENT_OWNER");
    }
    req.event = event;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies the authenticated user is an assigned, upload-enabled
 * photographer for this specific event. Photographers do not get
 * implicit access to events they haven't been assigned to.
 */
export const requireEventPhotographer = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const assignment = await EventPhotographer.findOne({ eventId, userId: req.user.id });
    if (!assignment || !assignment.canUpload) {
      throw new AppError(
        "You are not an authorized photographer for this event",
        403,
        "NOT_EVENT_PHOTOGRAPHER"
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

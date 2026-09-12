import { Event } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { EVENT_STATUS } from "../constants/enums.js";

/**
 * Blocks join / upload / like / favourite / new-purchase actions once an
 * event is EXPIRED or ARCHIVED. Already-purchased content remains
 * downloadable regardless of event status — routes that serve purchased
 * downloads must NOT use this middleware.
 *
 * Expects the event id at req.params.eventId (or req.params.id as a
 * fallback for routes nested directly under /events/:id).
 */
export const requireActiveEvent = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    if (!eventId) {
      throw new AppError("Event id missing from request", 400, "EVENT_ID_MISSING");
    }

    const event = await Event.findById(eventId).select("status expiryDate");
    if (!event) {
      throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
    }

    // Lazily flip status if expiry has passed but the scheduled job hasn't run yet
    if (event.status === EVENT_STATUS.ACTIVE && event.expiryDate < new Date()) {
      event.status = EVENT_STATUS.EXPIRED;
      await event.save();
    }

    if (event.status !== EVENT_STATUS.ACTIVE) {
      throw new AppError(
        "This event has expired. Joining, uploading, and new purchases are disabled, but any content you already purchased remains downloadable.",
        403,
        "EVENT_EXPIRED"
      );
    }

    req.event = event;
    next();
  } catch (err) {
    next(err);
  }
};

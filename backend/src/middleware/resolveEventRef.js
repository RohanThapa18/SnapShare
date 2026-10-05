import { Event } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { normalizeEventCode, EVENT_CODE_LENGTH } from "../utils/eventCode.js";

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export const resolveEventRef = async (req, res, next) => {
  try {
    const ref = req.params.id;
    if (OBJECT_ID.test(ref)) return next();

    const code = normalizeEventCode(ref);
    const event =
      code.length === EVENT_CODE_LENGTH ? await Event.findOne({ eventCode: code }).select("_id") : null;

    if (!event) {
      throw new AppError("Event not found. Check the Event ID and try again.", 404, "EVENT_NOT_FOUND");
    }
    req.params.id = event._id.toString();
    next();
  } catch (err) {
    next(err);
  }
};

export const resolveEventParam = async (req, res, next, value) => {
  try {
    if (OBJECT_ID.test(value)) return next();

    const code = normalizeEventCode(value);
    const event =
      code.length === EVENT_CODE_LENGTH ? await Event.findOne({ eventCode: code }).select("_id") : null;

    if (!event) {
      throw new AppError("Event not found. Check the Event ID and try again.", 404, "EVENT_NOT_FOUND");
    }
    req.params.id = event._id.toString();
    next();
  } catch (err) {
    next(err);
  }
};
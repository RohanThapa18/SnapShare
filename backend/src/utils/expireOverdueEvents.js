import { Event } from "../models/index.js";
import { EVENT_STATUS } from "../constants/enums.js";

export const expireOverdueEvents = () =>
  Event.updateMany(
    { status: EVENT_STATUS.ACTIVE, expiryDate: { $lt: new Date() } },
    { $set: { status: EVENT_STATUS.EXPIRED } }
  );
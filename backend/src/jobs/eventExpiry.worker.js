import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { EVENT_EXPIRY_QUEUE } from "../queues/eventExpiry.queue.js";
import { Event, User } from "../models/index.js";
import { EVENT_STATUS } from "../constants/enums.js";
import { emailEnabled, sendEmail } from "../services/emailService.js";

const WARN_WINDOW_MS = 48 * 60 * 60 * 1000; // warn organizers 48h before expiry

const sweepExpiredEvents = async () => {
  const result = await Event.updateMany(
    { status: EVENT_STATUS.ACTIVE, expiryDate: { $lt: new Date() } },
    { $set: { status: EVENT_STATUS.EXPIRED } }
  );
  if (result.modifiedCount) {
    console.log(`[expiry-worker] Marked ${result.modifiedCount} event(s) as EXPIRED`);
  }
};

const formatWhen = (date) =>
  date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.EMAIL_TIMEZONE || "Asia/Kolkata",
  });

/**
 * Emails the organizers of events that expire within 48 hours.
 * `expiryWarnedFor` remembers WHICH expiry date we warned about, so each date
 * is warned about once, and if the organizer extends the event the new date
 * differs and a fresh warning goes out later.
 */
const warnUpcomingExpiries = async () => {
  if (!emailEnabled()) return;

  const now = new Date();
  const events = await Event.find({
    status: EVENT_STATUS.ACTIVE,
    expiryDate: { $gt: now, $lte: new Date(now.getTime() + WARN_WINDOW_MS) },
    $expr: { $ne: ["$expiryWarnedFor", "$expiryDate"] },
  }).select("title slug expiryDate organizerId coOrganizerIds");

  for (const event of events) {
    const organizerIds = [event.organizerId, ...(event.coOrganizerIds || [])];
    const organizers = await User.find({ _id: { $in: organizerIds }, isActive: true }).select("email name");

    const base = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    const link = `${base}/events/${event.slug}`;
    const when = formatWhen(event.expiryDate);

    let sent = 0;
    for (const organizer of organizers) {
      const ok = await sendEmail({
        to: organizer.email,
        subject: `"${event.title}" closes soon`,
        text:
          `Hi ${organizer.name},\n\n` +
          `Your SnapShare event "${event.title}" closes on ${when}. After that, nobody can join or upload new photos.\n\n` +
          `Need more time? Open the event, go to Settings → Extend Event Duration.\n` +
          `Want a backup? Settings → Export all photos downloads everything as a ZIP.\n\n` +
          `${link}\n`,
        html:
          `<p>Hi ${organizer.name},</p>` +
          `<p>Your SnapShare event <strong>${event.title}</strong> closes on <strong>${when}</strong>. ` +
          `After that, nobody can join or upload new photos.</p>` +
          `<ul><li>Need more time? Open the event → Settings → <em>Extend Event Duration</em>.</li>` +
          `<li>Want a backup? Settings → <em>Export all photos</em> downloads everything as a ZIP.</li></ul>` +
          `<p><a href="${link}">Open the event</a></p>`,
      });
      if (ok) sent += 1;
    }

    // Only mark it done if at least one email actually went out
    if (sent > 0) {
      await Event.updateOne({ _id: event._id }, { $set: { expiryWarnedFor: event.expiryDate } });
      console.log(`[expiry-worker] Sent expiry warning for "${event.title}" to ${sent} organizer(s)`);
    }
  }
};

const runSweep = async () => {
  await sweepExpiredEvents();
  try {
    await warnUpcomingExpiries();
  } catch (err) {
    // A failed warning must never stop the expiry sweep itself
    console.error("[expiry-worker] Expiry warnings failed:", err.message);
  }
};

export const startEventExpiryWorker = () => {
  const connection = getRedisConnection();
  if (!connection) {
    console.warn("[expiry-worker] Redis not configured, so the event expiry sweep will not run automatically.");
    console.warn("[expiry-worker] Individual requests still self-correct via the eventStatus middleware.");
    return null;
  }

  const worker = new Worker(EVENT_EXPIRY_QUEUE, runSweep, { connection });
  worker.on("completed", () => console.log("[expiry-worker] Sweep completed"));
  worker.on("failed", (job, err) => console.error("[expiry-worker] Sweep failed:", err.message));

  return worker;
};
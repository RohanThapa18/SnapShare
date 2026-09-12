import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import QRCode from "qrcode";
import { Event, EventParticipant, EventPhotographer, Photo } from "../models/index.js";
import { deleteCloudinaryAsset } from "../services/cloudinaryService.js";
import { maskEmail } from "../utils/maskEmail.js";
import { AppError } from "../utils/AppError.js";
import { encryptPasscode, decryptPasscode } from "../utils/passcodeCipher.js";
import { EVENT_STATUS, ALBUM_TYPE } from "../constants/enums.js";

const PASSCODE_SALT_ROUNDS = 10;

const generatePasscode = () => {
  // 6-character human-typeable passcode, e.g. "K7QX2P"
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
};

const generateJoinToken = () => crypto.randomBytes(24).toString("base64url");

export const createEvent = asyncHandler(async (req, res) => {
  const { title, description, date, location, expiryDate } = req.body;

  if (new Date(expiryDate) <= new Date(date)) {
    throw new AppError("Expiry date must be after the event date", 400, "INVALID_EXPIRY");
  }

  const plainPasscode = generatePasscode();
  const passcodeHash = await bcrypt.hash(plainPasscode, PASSCODE_SALT_ROUNDS);
  const passcodeEncrypted = encryptPasscode(plainPasscode);
  const joinToken = generateJoinToken();
  const photographerJoinToken = generateJoinToken();

  const event = await Event.create({
    title,
    description,
    date,
    location,
    expiryDate,
    organizerId: req.user.id,
    passcodeHash,
    passcodeEncrypted,
    joinToken,
    photographerJoinToken,
  });

  // Organizer automatically counts as a participant of their own event
  await EventParticipant.create({ eventId: event._id, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: "Event created. Save this passcode now — it will not be shown again.",
    data: {
      event,
      passcode: plainPasscode, // shown exactly once, never persisted in plaintext
    },
  });
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  // Since roles are per-event rather than a fixed account type, the
  // frontend needs to know how the current viewer relates to THIS
  // event to decide what UI to show (upload as photographer? as
  // participant? see organizer-only settings?).
  let viewerAccess = { isOrganizer: false, isPhotographer: false, isParticipant: false };
  if (req.user) {
    const [isPhotographer, isParticipant] = await Promise.all([
      EventPhotographer.exists({ eventId: event._id, userId: req.user.id }),
      EventParticipant.exists({ eventId: event._id, userId: req.user.id }),
    ]);
    viewerAccess = {
      isOrganizer: event.organizerId.toString() === req.user.id,
      isPhotographer: Boolean(isPhotographer),
      isParticipant: Boolean(isParticipant),
    };
  }

  res.status(200).json({ success: true, data: { event, viewerAccess } });
});

export const listMyEvents = asyncHandler(async (req, res) => {
  // Events the user organizes, is assigned to as photographer, or has joined
  const [organized, photographing, joined] = await Promise.all([
    Event.find({ organizerId: req.user.id }).sort({ createdAt: -1 }),
    EventPhotographer.find({ userId: req.user.id }).populate("eventId"),
    EventParticipant.find({ userId: req.user.id }).populate("eventId"),
  ]);

  res.status(200).json({
    success: true,
    data: {
      organized,
      photographing: photographing.map((p) => p.eventId).filter(Boolean),
      joined: joined.map((j) => j.eventId).filter(Boolean),
    },
  });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const updates = {};
  ["title", "description", "date", "location", "expiryDate"].forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (updates.expiryDate) {
    const existing = req.event || (await Event.findById(req.params.id).select("date status"));
    if (!existing) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

    const newExpiry = new Date(updates.expiryDate);
    const eventDate = updates.date ? new Date(updates.date) : existing.date;

    if (newExpiry <= eventDate) {
      throw new AppError("Expiry date must be after the event date", 400, "INVALID_EXPIRY");
    }

    // Extending the expiry date into the future automatically "un-expires"
    // the event — the organizer shouldn't have to separately flip status.
    if (newExpiry > new Date() && existing.status === EVENT_STATUS.EXPIRED) {
      updates.status = EVENT_STATUS.ACTIVE;
    }
  }

  const event = await Event.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, message: "Event updated", data: { event } });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  // Cascade-delete related records. Photo binary cleanup on Cloudinary is
  // handled by photoService when photos are deleted individually — for a
  // full event delete we also remove Cloudinary assets here.
  const photos = await Photo.find({ eventId }).select("cloudinaryPublicId");
  await Promise.all(photos.map((p) => deleteCloudinaryAsset(p.cloudinaryPublicId).catch(() => {})));

  await Promise.all([
    Photo.deleteMany({ eventId }),
    EventParticipant.deleteMany({ eventId }),
    EventPhotographer.deleteMany({ eventId }),
    Event.findByIdAndDelete(eventId),
  ]);

  res.status(200).json({ success: true, message: "Event deleted" });
});

export const joinEvent = asyncHandler(async (req, res) => {
  const { passcode, joinToken } = req.body;
  const eventId = req.params.id;

  const event = await Event.findById(eventId).select("+passcodeHash joinToken status");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  if (joinToken) {
    if (joinToken !== event.joinToken) {
      throw new AppError("Invalid join link", 400, "INVALID_JOIN_TOKEN");
    }
  } else {
    const match = await bcrypt.compare(passcode, event.passcodeHash);
    if (!match) throw new AppError("Incorrect passcode", 400, "INVALID_PASSCODE");
  }

  const existing = await EventParticipant.findOne({ eventId, userId: req.user.id });
  if (existing) {
    return res.status(200).json({ success: true, message: "Already joined this event" });
  }

  await EventParticipant.create({ eventId, userId: req.user.id });
  res.status(200).json({ success: true, message: "Joined event successfully" });
});

/**
 * Photographer self-join. This is the second of the two ways someone
 * becomes an official photographer for an event: the organizer either
 * adds them directly by email (see photographer.controller.js), OR the
 * organizer shares this event's separate photographer QR/link and
 * anyone with it can self-assign as a photographer. Also grants
 * participant access so they can browse the gallery like anyone else.
 */
export const joinEventAsPhotographer = asyncHandler(async (req, res) => {
  const { photographerToken } = req.body;
  const eventId = req.params.id;

  const event = await Event.findById(eventId).select("photographerJoinToken");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  if (photographerToken !== event.photographerJoinToken) {
    throw new AppError("Invalid photographer join link", 400, "INVALID_PHOTOGRAPHER_TOKEN");
  }

  const existing = await EventPhotographer.findOne({ eventId, userId: req.user.id });
  if (existing) {
    return res.status(200).json({ success: true, message: "Already a photographer for this event" });
  }

  await EventPhotographer.create({ eventId, userId: req.user.id, addedBy: req.user.id, canUpload: true });
  await EventParticipant.findOneAndUpdate(
    { eventId, userId: req.user.id },
    { eventId, userId: req.user.id },
    { upsert: true }
  );

  res.status(200).json({ success: true, message: "Joined event as photographer" });
});

/**
 * Leave an event — available to participants AND photographers (not the
 * organizer, who must delete the event instead since there's no one to
 * hand ownership to). Removes both relationship types for this user so
 * a photographer who leaves also stops appearing as a participant.
 */
export const leaveEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const event = await Event.findById(eventId).select("organizerId");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  if (event.organizerId.toString() === req.user.id) {
    throw new AppError(
      "You organize this event — delete it instead of leaving if you want to remove yourself.",
      400,
      "ORGANIZER_CANNOT_LEAVE"
    );
  }

  await Promise.all([
    EventParticipant.findOneAndDelete({ eventId, userId: req.user.id }),
    EventPhotographer.findOneAndDelete({ eventId, userId: req.user.id }),
  ]);

  res.status(200).json({ success: true, message: "Left event" });
});

export const getParticipants = asyncHandler(async (req, res) => {
  const { search = "", page = 1, limit = 20 } = req.query;

  const participants = await EventParticipant.find({ eventId: req.params.id })
    .populate({
      path: "userId",
      select: "name email avatarUrl",
      match: search ? { name: { $regex: search, $options: "i" } } : {},
    })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const filtered = participants
    .filter((p) => p.userId) // drop non-matching populate results
    .map((p) => {
      const obj = p.toObject();
      if (obj.userId?.email) obj.userId.email = maskEmail(obj.userId.email);
      return obj;
    });

  const total = await EventParticipant.countDocuments({ eventId: req.params.id });

  res.status(200).json({
    success: true,
    data: { participants: filtered, total },
  });
});

export const removeParticipant = asyncHandler(async (req, res) => {
  await EventParticipant.findOneAndDelete({
    eventId: req.params.id,
    userId: req.params.userId,
  });
  res.status(200).json({ success: true, message: "Participant removed" });
});

export const getJoinQr = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).select("joinToken title");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  const joinUrl = `${process.env.FRONTEND_URL}/join/${event._id}/${event.joinToken}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl);

  res.status(200).json({ success: true, data: { joinUrl, qrDataUrl } });
});

/**
 * Separate QR/link specifically for self-joining as a photographer.
 * Organizer-only to generate/view, same as the participant join QR.
 */
export const getPhotographerJoinQr = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).select("photographerJoinToken title");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  const joinUrl = `${process.env.FRONTEND_URL}/join-photographer/${event._id}/${event.photographerJoinToken}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl);

  res.status(200).json({ success: true, data: { joinUrl, qrDataUrl } });
});

/**
 * Reveal the event's participant passcode. Organizer-only — enforced by
 * requireEventOwner on the route, not just by hiding the button in the
 * UI. Decrypts the reversible copy stored at creation time; never
 * touches passcodeHash (which cannot be reversed).
 *
 * Events created before passcodeEncrypted existed will have it as
 * null — we tell the frontend that explicitly so it can prompt the
 * organizer to regenerate rather than silently failing.
 */
export const getEventPasscode = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).select("+passcodeEncrypted");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  if (!event.passcodeEncrypted) {
    return res.status(200).json({
      success: true,
      data: { passcode: null, needsRegeneration: true },
    });
  }

  let passcode;
  try {
    passcode = decryptPasscode(event.passcodeEncrypted);
  } catch (err) {
    // Tampered/corrupt ciphertext or a key mismatch — never leak the
    // raw error, just tell the organizer to regenerate.
    return res.status(200).json({ success: true, data: { passcode: null, needsRegeneration: true } });
  }

  res.status(200).json({ success: true, data: { passcode, needsRegeneration: false } });
});

/**
 * Generates a brand-new passcode for the event (invalidating the old
 * one) and returns it in plaintext once, same as at creation — for
 * legacy events with no recoverable passcode, or if an organizer wants
 * to rotate it (e.g. it was shared too widely). Organizer-only.
 */
export const regenerateEventPasscode = asyncHandler(async (req, res) => {
  const plainPasscode = generatePasscode();
  const passcodeHash = await bcrypt.hash(plainPasscode, PASSCODE_SALT_ROUNDS);
  const passcodeEncrypted = encryptPasscode(plainPasscode);

  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { passcodeHash, passcodeEncrypted },
    { new: true }
  );
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  res.status(200).json({
    success: true,
    message: "New passcode generated. The previous passcode no longer works.",
    data: { passcode: plainPasscode },
  });
});

export const getEventStats = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const [participantCount, photographerCount, officialCount, communityCount, totalLikes, totalDownloads] =
    await Promise.all([
      EventParticipant.countDocuments({ eventId }),
      EventPhotographer.countDocuments({ eventId }),
      Photo.countDocuments({ eventId, album: ALBUM_TYPE.OFFICIAL }),
      Photo.countDocuments({ eventId, album: ALBUM_TYPE.COMMUNITY }),
      Photo.aggregate([
        { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
        { $group: { _id: null, total: { $sum: "$likeCount" } } },
      ]),
      Photo.aggregate([
        { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
        { $group: { _id: null, total: { $sum: "$downloadCount" } } },
      ]),
    ]);

  res.status(200).json({
    success: true,
    data: {
      participantCount,
      photographerCount,
      totalPhotos: officialCount + communityCount,
      officialPhotos: officialCount,
      communityPhotos: communityCount,
      totalLikes: totalLikes[0]?.total || 0,
      totalDownloads: totalDownloads[0]?.total || 0,
    },
  });
});

import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import QRCode from "qrcode";
import {
  Event,
  Photo,
  EventParticipant,
  EventPhotographer,
  Purchase,
  MyPhotosCollection,
  FaceEmbedding,
  Like,
  Favourite,
  Download,
} from "../models/index.js";
import {
  deleteCloudinaryAsset,
  uploadToCloudinary,
  getOptimizedUrl,
} from "../services/cloudinaryService.js";
import { maskEmail } from "../utils/maskEmail.js";
import { AppError } from "../utils/AppError.js";
import { encryptPasscode, decryptPasscode } from "../utils/passcodeCipher.js";
import { EVENT_STATUS, ALBUM_TYPE } from "../constants/enums.js";
import { expireOverdueEvents } from "../utils/expireOverdueEvents.js";
import { generateEventCode } from "../utils/eventCode.js";
const PASSCODE_SALT_ROUNDS = 10;

const generatePasscode = () => {
  // 6-character human-typeable passcode, e.g. "K7QX2P"
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
};
const createUniqueEventCode = async () => {
  for (let i = 0; i < 8; i++) {
    const code = generateEventCode();
    if (!(await Event.exists({ eventCode: code }))) return code;
  }
  throw new AppError("Could not generate an event code, please try again", 500, "EVENT_CODE_FAILED");
};

// Gives older events a code, atomically so two simultaneous requests can't assign two.
const ensureEventCode = async (event) => {
  if (event.eventCode) return event;
  for (let i = 0; i < 5; i++) {
    try {
      const updated = await Event.findOneAndUpdate(
        { _id: event._id, eventCode: null },
        { $set: { eventCode: await createUniqueEventCode() } },
        { new: true }
      );
      const winner = updated || (await Event.findById(event._id).select("eventCode"));
      event.eventCode = winner?.eventCode;
      return event;
    } catch (err) {
      if (err.code !== 11000) throw err; // unique collision: retry with a new code
    }
  }
  return event;
};

const generateJoinToken = () => crypto.randomBytes(24).toString("base64url");
const createSlug = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "") || "event"; // symbol-only / non-latin titles would otherwise give ""

// Plain slug when it's free ("summer-party"); otherwise add a short random
// suffix ("summer-party-a3f9c1"). The eventCode fallback can't collide.
const createUniqueSlug = async (title, eventCode) => {
  const base = createSlug(title);
  if (!(await Event.exists({ slug: base }))) return base;

  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${crypto.randomBytes(3).toString("hex")}`;
    if (!(await Event.exists({ slug: candidate }))) return candidate;
  }
  return `${base}-${eventCode.toLowerCase()}`;
};

export const createEvent = asyncHandler(async (req, res) => {
  const { title, description, date, location, expiryDate } = req.body;

  if (new Date(expiryDate) <= new Date(date)) {
    throw new AppError(
      "Expiry date must be after the event date",
      400,
      "INVALID_EXPIRY"
    );
  }

  const eventId = new mongoose.Types.ObjectId();
  let coverImagePublicId = null;
  let eventCreated = false;

  try {
    // Generate event credentials.
    const plainPasscode = generatePasscode();
    const passcodeHash = await bcrypt.hash(
      plainPasscode,
      PASSCODE_SALT_ROUNDS
    );
    const passcodeEncrypted = encryptPasscode(plainPasscode);
    const joinToken = generateJoinToken();
    const photographerJoinToken = generateJoinToken();
        const eventCode = await createUniqueEventCode();
    const photographerPasscode = generatePasscode();
    const photographerPasscodeHash = await bcrypt.hash(photographerPasscode, PASSCODE_SALT_ROUNDS);
    const photographerPasscodeEncrypted = encryptPasscode(photographerPasscode);
    // Upload the optional event cover image.
    let coverImageUrl = null;

    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, {
        eventId: eventId.toString(),
        folder: "covers",
      });

      coverImageUrl = uploaded.secure_url;
      coverImagePublicId = uploaded.public_id;
    }

    // Create the event.
    const event = await Event.create({
      _id: eventId,
      eventCode,
      title,
      slug: await createUniqueSlug(title, eventCode),
      description,
      date,
      location,
      expiryDate,
      organizerId: req.user.id,
      passcodeHash,
      passcodeEncrypted,
      joinToken,
      photographerJoinToken,
      photographerPasscodeHash,
      photographerPasscodeEncrypted,
      coverImageUrl,
      coverImagePublicId,
    });

    eventCreated = true;

    // Add the organizer as a participant.
    await EventParticipant.create({
      eventId: event._id,
      userId: req.user.id,
    });

    // Return the created event and its passcode.
    res.status(201).json({
      success: true,
      message:
        "Event created. Save this passcode now — it will not be shown again.",
      data: {
        event: { ...event.toJSON(), joinToken, photographerJoinToken },
        passcode: plainPasscode,
        photographerPasscode,
      },
    });
  } catch (error) {
    // Clean up database records if creation was only partially completed.
    if (eventCreated) {
      await Promise.all([
        EventParticipant.deleteMany({ eventId }),
        Event.findByIdAndDelete(eventId),
      ]).catch((cleanupError) => {
        console.error(
          "Failed to clean up partially created event:",
          cleanupError.message
        );
      });
    }

    // Clean up the uploaded cover image, if one exists.
    if (coverImagePublicId) {
      await deleteCloudinaryAsset(coverImagePublicId).catch(
        (cleanupError) => {
          console.error(
            "Failed to clean up event cover image:",
            cleanupError.message
          );
        }
      );
    }

    throw error;
  }
});

export const getEvent = asyncHandler(async (req, res) => {
  await expireOverdueEvents();
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
  await ensureEventCode(event);

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

export const getEventBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  let event = await Event.findOne({ slug });
  if (!event && mongoose.isValidObjectId(slug)) {
    event = await Event.findById(slug);
  }

  if (!event) {
    throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
  }
await ensureEventCode(event);
  let viewerAccess = {
    isOrganizer: false,
    isPhotographer: false,
    isParticipant: false,
  };

  if (req.user) {
    const [isPhotographer, isParticipant] = await Promise.all([
      EventPhotographer.exists({
        eventId: event._id,
        userId: req.user.id,
      }),
      EventParticipant.exists({
        eventId: event._id,
        userId: req.user.id,
      }),
    ]);

    viewerAccess = {
      isOrganizer: event.organizerId.toString() === req.user.id,
      isPhotographer: Boolean(isPhotographer),
      isParticipant: Boolean(isParticipant),
    };
  }

  res.status(200).json({
    success: true,
    data: {
      event,
      viewerAccess,
    },
  });
});

export const listMyEvents = asyncHandler(async (req, res) => {
  await expireOverdueEvents();
  // Events the user organizes, is assigned to as photographer, or has joined
  const [organized, photographing, joined] = await Promise.all([
    Event.find({ organizerId: req.user.id }).sort({ createdAt: -1 }),
    EventPhotographer.find({ userId: req.user.id }).populate("eventId"),
    EventParticipant.find({ userId: req.user.id }).populate("eventId"),
  ]);
  await Promise.all(organized.map(ensureEventCode));
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
    const existing = await Event.findById(req.params.id).select("date status");
    if (!existing) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

    const newExpiry = new Date(updates.expiryDate);
    const eventDate = updates.date ? new Date(updates.date) : existing.date;

    if (newExpiry <= new Date()) {
      throw new AppError("Expiry date must be in the future", 400, "INVALID_EXPIRY");
    }
    if (newExpiry <= eventDate) {
      throw new AppError("Expiry date must be after the event date", 400, "INVALID_EXPIRY");
    }

    // A future expiry re-activates an event that had already expired.
    if (existing.status === EVENT_STATUS.EXPIRED) {
      updates.status = EVENT_STATUS.ACTIVE;
    }
  }

  const event = await Event.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, message: "Event updated", data: { event } });
});

export const updateEventCover = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Please choose an image to upload", 400, "NO_FILE");
  }

  const event = await Event.findById(req.params.id).select("coverImagePublicId");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  const uploaded = await uploadToCloudinary(req.file.buffer, {
    eventId: req.params.id,
    folder: "covers",
  });

  const oldPublicId = event.coverImagePublicId;

  try {
    event.coverImageUrl = getOptimizedUrl(uploaded.public_id, { width: 1600 });
    event.coverImagePublicId = uploaded.public_id;
    await event.save();
  } catch (err) {
    await deleteCloudinaryAsset(uploaded.public_id).catch(() => {});
    throw err;
  }

  if (oldPublicId) await deleteCloudinaryAsset(oldPublicId).catch(() => {});

  res.status(200).json({
    success: true,
    message: "Cover image updated",
    data: { coverImageUrl: event.coverImageUrl },
  });
});

export const removeEventCover = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).select("coverImagePublicId");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  const oldPublicId = event.coverImagePublicId;
  event.coverImageUrl = null;
  event.coverImagePublicId = null;
  await event.save();

  if (oldPublicId) await deleteCloudinaryAsset(oldPublicId).catch(() => {});

  res.status(200).json({
    success: true,
    message: "Cover image removed",
    data: { coverImageUrl: null },
  });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const photos = await Photo.find({ eventId }).select("_id cloudinaryPublicId deliveryType");
  const photoIds = photos.map((p) => p._id);

  // Cloudinary cleanup first — if this fails for a given asset we still
  // want the DB cleanup below to proceed, so failures are swallowed here.
  await Promise.all(photos.map((p) => deleteCloudinaryAsset(p.cloudinaryPublicId, p.deliveryType).catch(() => { })));

  await Promise.all([
    Photo.deleteMany({ eventId }),
    EventParticipant.deleteMany({ eventId }),
    EventPhotographer.deleteMany({ eventId }),
    Purchase.deleteMany({ eventId }),
    MyPhotosCollection.deleteMany({ eventId }),
    FaceEmbedding.deleteMany({ eventId }),
    Like.deleteMany({ photoId: { $in: photoIds } }),
    Favourite.deleteMany({ photoId: { $in: photoIds } }),
    Download.deleteMany({ photoId: { $in: photoIds } }),
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
    return res
      .status(200)
      .json({ success: true, message: "Already joined this event", data: { eventId: event._id } });
  }

  await EventParticipant.create({ eventId, userId: req.user.id });
  res
    .status(200)
    .json({ success: true, message: "Joined event successfully", data: { eventId: event._id } });
});


export const joinEventAsPhotographer = asyncHandler(async (req, res) => {
  const { photographerToken, photographerPasscode } = req.body;
  const eventId = req.params.id;

  const event = await Event.findById(eventId).select("+photographerPasscodeHash photographerJoinToken");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  if (photographerToken) {
    if (photographerToken !== event.photographerJoinToken) {
      throw new AppError("Invalid photographer join link", 400, "INVALID_PHOTOGRAPHER_TOKEN");
    }
  } else {
    if (!event.photographerPasscodeHash) {
      throw new AppError(
        "This event has no photographer passcode yet. Ask the organizer to generate one, or use the photographer QR code.",
        400,
        "NO_PHOTOGRAPHER_PASSCODE"
      );
    }
    const match = await bcrypt.compare(photographerPasscode.toUpperCase(), event.photographerPasscodeHash);
    if (!match) {
      throw new AppError("Incorrect photographer passcode", 400, "INVALID_PHOTOGRAPHER_PASSCODE");
    }
  }

  const existing = await EventPhotographer.findOne({ eventId, userId: req.user.id });
  if (existing) {
    return res.status(200).json({ success: true, message: "Already a photographer for this event", data: { eventId: event._id } });
  }

  await EventPhotographer.create({ eventId, userId: req.user.id, addedBy: req.user.id, canUpload: true });
  await EventParticipant.findOneAndUpdate(
    { eventId, userId: req.user.id },
    { eventId, userId: req.user.id },
    { upsert: true }
  );

        res.status(200).json({
    success: true,
    message: "Joined event as photographer",
    data: { eventId: event._id },
  });
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

  // Only the organizer gets email addresses. For everyone else the field
  // is never even loaded from the database.
  const event = await Event.findById(req.params.id).select("organizerId");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
  const isOrganizer = event.organizerId.toString() === req.user.id;

  const participants = await EventParticipant.find({ eventId: req.params.id })
    .populate({
      path: "userId",
      select: isOrganizer ? "name email avatarUrl" : "name avatarUrl",
      match: search ? { name: { $regex: search, $options: "i" } } : {},
    })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const filtered = participants.filter((p) => p.userId).map((p) => p.toObject());

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

export const getPhotographerPasscode = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).select("+photographerPasscodeEncrypted");
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  if (!event.photographerPasscodeEncrypted) {
    return res.status(200).json({ success: true, data: { passcode: null, needsRegeneration: true } });
  }
  let passcode;
  try {
    passcode = decryptPasscode(event.photographerPasscodeEncrypted);
  } catch {
    return res.status(200).json({ success: true, data: { passcode: null, needsRegeneration: true } });
  }
  res.status(200).json({ success: true, data: { passcode, needsRegeneration: false } });
});

export const regeneratePhotographerPasscode = asyncHandler(async (req, res) => {
  const plainPasscode = generatePasscode();
  const photographerPasscodeHash = await bcrypt.hash(plainPasscode, PASSCODE_SALT_ROUNDS);
  const photographerPasscodeEncrypted = encryptPasscode(plainPasscode);

  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { photographerPasscodeHash, photographerPasscodeEncrypted },
    { new: true }
  );
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");

  res.status(200).json({
    success: true,
    message: "New photographer passcode generated. The previous one no longer works.",
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

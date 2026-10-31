import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Photo, EventParticipant, Report } from "../models/index.js";
import { REPORT_STATUS } from "../models/Report.model.js";
import { getThumbnailUrl } from "../services/cloudinaryService.js";
import { removePhotoCompletely } from "../utils/removePhoto.js";
import { AppError } from "../utils/AppError.js";

/** POST /api/photos/:photoId/report: any member of the event can flag a photo. */
export const reportPhoto = asyncHandler(async (req, res) => {
  const photo = await Photo.findById(req.params.photoId).select("eventId uploaderId");
  if (!photo) throw new AppError("Photo not found", 404, "PHOTO_NOT_FOUND");

  if (photo.uploaderId.toString() === req.user.id) {
    throw new AppError("You can't report your own photo", 400, "OWN_PHOTO");
  }

  const isMember = await EventParticipant.exists({ eventId: photo.eventId, userId: req.user.id });
  if (!isMember) {
    throw new AppError("You must be in this event to report its photos", 403, "NOT_EVENT_MEMBER");
  }

  try {
    await Report.create({
      photoId: photo._id,
      eventId: photo.eventId,
      reporterId: req.user.id,
      reason: req.body.reason,
      note: req.body.note || "",
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(200).json({ success: true, message: "You've already reported this photo" });
    }
    throw err;
  }

  res.status(201).json({ success: true, message: "Thanks, the organizer will review this photo" });
});

/** GET /api/events/:id/reports: organizers only, open reports, one row per photo. */
export const listEventReports = asyncHandler(async (req, res) => {
  const rows = await Report.aggregate([
    { $match: { eventId: new mongoose.Types.ObjectId(req.event._id), status: REPORT_STATUS.OPEN } },
    {
      $group: {
        _id: "$photoId",
        count: { $sum: 1 },
        reasons: { $addToSet: "$reason" },
        notes: { $push: "$note" },
        latestAt: { $max: "$createdAt" },
      },
    },
    { $sort: { latestAt: -1 } },
    { $lookup: { from: "photos", localField: "_id", foreignField: "_id", as: "photo" } },
    { $unwind: "$photo" }, // drops reports whose photo no longer exists
    { $lookup: { from: "users", localField: "photo.uploaderId", foreignField: "_id", as: "uploader" } },
    { $unwind: { path: "$uploader", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        photoId: "$_id",
        count: 1,
        reasons: 1,
        notes: 1,
        latestAt: 1,
        album: "$photo.album",
        cloudinaryPublicId: "$photo.cloudinaryPublicId",
        deliveryType: "$photo.deliveryType",
        uploaderName: "$uploader.name",
      },
    },
  ]);

  const reports = rows.map(({ cloudinaryPublicId, deliveryType, notes, ...rest }) => ({
    ...rest,
    notes: notes.filter(Boolean),
    thumbnailUrl: getThumbnailUrl(cloudinaryPublicId, { type: deliveryType || "upload" }),
  }));

  res.status(200).json({ success: true, data: { reports } });
});

/**
 * POST /api/events/:id/reports/photos/:photoId/resolve  { action: "remove" | "dismiss" }
 * Resolves every open report on that photo at once.
 */
export const resolvePhotoReports = asyncHandler(async (req, res) => {
  const { photoId } = req.params;
  const { action } = req.body;
  const eventId = req.event._id;

  if (!mongoose.isValidObjectId(photoId)) {
    throw new AppError("Invalid photo id", 400, "INVALID_ID");
  }

  const openCount = await Report.countDocuments({ photoId, eventId, status: REPORT_STATUS.OPEN });
  if (openCount === 0) {
    throw new AppError("There are no open reports for this photo", 404, "NO_OPEN_REPORTS");
  }

  if (action === "remove") {
    const photo = await Photo.findOne({ _id: photoId, eventId });
    if (photo) await removePhotoCompletely(photo);
  }

  await Report.updateMany(
    { photoId, eventId, status: REPORT_STATUS.OPEN },
    {
      $set: {
        status: action === "remove" ? REPORT_STATUS.REMOVED : REPORT_STATUS.DISMISSED,
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
      },
    }
  );

  res.status(200).json({
    success: true,
    message: action === "remove" ? "Photo removed" : "Reports dismissed",
  });
});
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Event, Photo, EventParticipant, EventPhotographer } from "../models/index.js";
import { EVENT_STATUS } from "../constants/enums.js";

/**
 * Unified dashboard — there's no fixed ORGANIZER/PHOTOGRAPHER account
 * type anymore, so this single endpoint returns whichever stats are
 * relevant based on the user's actual per-event relationships. A user
 * who has never organized an event simply gets zeros in that section;
 * the frontend decides what to show/hide based on the counts.
 */
export const getMyDashboard = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const organizedEvents = await Event.find({ organizerId: userId }).select("_id");
  const organizedEventIds = organizedEvents.map((e) => e._id);

  const [
    totalEventsOrganizing,
    activeEventsOrganizing,
    participantsAcrossMyEvents,
    organizerPhotoStats,
    recentActivity,
    myUploadStats,
    recentUploads,
  ] = await Promise.all([
    Event.countDocuments({ organizerId: userId }),
    Event.countDocuments({ organizerId: userId, status: EVENT_STATUS.ACTIVE }),
    EventParticipant.countDocuments({ eventId: { $in: organizedEventIds } }),
    Photo.aggregate([
      { $match: { eventId: { $in: organizedEventIds } } },
      {
        $group: {
          _id: null,
          totalPhotos: { $sum: 1 },
          totalStorageBytes: { $sum: "$fileSizeBytes" },
          totalDownloads: { $sum: "$downloadCount" },
          totalLikes: { $sum: "$likeCount" },
        },
      },
    ]),
    Photo.find({ eventId: { $in: organizedEventIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("uploaderId", "name")
      .populate("eventId", "title"),
    Photo.aggregate([
      { $match: { uploaderId: userId } },
      {
        $group: {
          _id: null,
          totalPhotos: { $sum: 1 },
          totalDownloads: { $sum: "$downloadCount" },
          totalLikes: { $sum: "$likeCount" },
        },
      },
    ]),
    Photo.find({ uploaderId: userId }).sort({ createdAt: -1 }).limit(10).populate("eventId", "title"),
  ]);

  const orgStats = organizerPhotoStats[0] || {
    totalPhotos: 0,
    totalStorageBytes: 0,
    totalDownloads: 0,
    totalLikes: 0,
  };
  const uploadStats = myUploadStats[0] || { totalPhotos: 0, totalDownloads: 0, totalLikes: 0 };

  const [totalPhotographing, totalJoined] = await Promise.all([
    EventPhotographer.countDocuments({ userId }),
    EventParticipant.countDocuments({ userId }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      organizing: {
        totalEvents: totalEventsOrganizing,
        activeEvents: activeEventsOrganizing,
        totalParticipants: participantsAcrossMyEvents,
        totalPhotos: orgStats.totalPhotos,
        storageUsedMB: Math.round(((orgStats.totalStorageBytes || 0) / (1024 * 1024)) * 100) / 100,
        totalDownloads: orgStats.totalDownloads,
        totalLikes: orgStats.totalLikes,
        recentActivity,
      },
      photographing: {
        totalEventsPhotographing: totalPhotographing,
        totalPhotosUploaded: uploadStats.totalPhotos,
        totalDownloads: uploadStats.totalDownloads,
        totalLikes: uploadStats.totalLikes,
        recentUploads,
      },
      participating: {
        totalEventsJoined: totalJoined,
      },
    },
  });
});

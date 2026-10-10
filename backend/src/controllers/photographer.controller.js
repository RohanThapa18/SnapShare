import asyncHandler from "express-async-handler";
import { EventParticipant, EventPhotographer, User } from "../models/index.js";
import { AppError } from "../utils/AppError.js";


export const addPhotographer = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const eventId = req.params.id;

  const photographer = await User.findOne({ email });
  if (!photographer) {
    throw new AppError(
      "No account found with that email. They need to register on SnapShare first.",
      404,
      "USER_NOT_FOUND"
    );
  }

  const existing = await EventPhotographer.findOne({ eventId, userId: photographer._id });
  if (existing) {
    throw new AppError("This person is already a photographer for this event", 409, "ALREADY_ASSIGNED");
  }

  const assignment = await EventPhotographer.create({
    eventId,
    userId: photographer._id,
    addedBy: req.user.id,
    canUpload: true,
  });

  // Same as the self-join path: a photographer is also a participant,
  // otherwise participant-gated event/gallery routes return 403.
    await EventParticipant.updateOne(
    { eventId, userId: photographer._id },
    { $setOnInsert: { eventId, userId: photographer._id } },
    { upsert: true }
  );

  res.status(201).json({ success: true, message: "Photographer added", data: { assignment } });

  res.status(201).json({ success: true, message: "Photographer added", data: { assignment } });
});

export const removePhotographer = asyncHandler(async (req, res) => {
  await EventPhotographer.findOneAndDelete({ eventId: req.params.id, userId: req.params.userId });
  res.status(200).json({ success: true, message: "Photographer removed" });
});

export const listPhotographers = asyncHandler(async (req, res) => {
  const photographers = await EventPhotographer.find({ eventId: req.params.id }).populate(
    "userId",
    "name email avatarUrl"
  );
  res.status(200).json({ success: true, data: { photographers } });
});

export const setPhotographerPermission = asyncHandler(async (req, res) => {
  const { canUpload } = req.body;
  const assignment = await EventPhotographer.findOneAndUpdate(
    { eventId: req.params.id, userId: req.params.userId },
    { canUpload },
    { new: true }
  );
  if (!assignment) throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
  res.status(200).json({ success: true, message: "Permission updated", data: { assignment } });
});

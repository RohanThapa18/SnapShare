import asyncHandler from "express-async-handler";
import { Like, Favourite, Photo } from "../models/index.js";
import { AppError } from "../utils/AppError.js";

export const likePhoto = asyncHandler(async (req, res) => {
  const { photoId } = req.params;
  try {
    await Like.create({ photoId, userId: req.user.id });
    await Photo.findByIdAndUpdate(photoId, { $inc: { likeCount: 1 } });
  } catch (err) {
    if (err.code === 11000) throw new AppError("Already liked", 409, "ALREADY_LIKED");
    throw err;
  }
  res.status(201).json({ success: true, message: "Liked" });
});

export const unlikePhoto = asyncHandler(async (req, res) => {
  const { photoId } = req.params;
  const deleted = await Like.findOneAndDelete({ photoId, userId: req.user.id });
  if (deleted) await Photo.findByIdAndUpdate(photoId, { $inc: { likeCount: -1 } });
  res.status(200).json({ success: true, message: "Unliked" });
});

export const favouritePhoto = asyncHandler(async (req, res) => {
  const { photoId } = req.params;
  try {
    await Favourite.create({ photoId, userId: req.user.id });
    await Photo.findByIdAndUpdate(photoId, { $inc: { favouriteCount: 1 } });
  } catch (err) {
    if (err.code === 11000) throw new AppError("Already favourited", 409, "ALREADY_FAVOURITED");
    throw err;
  }
  res.status(201).json({ success: true, message: "Added to favourites" });
});

export const unfavouritePhoto = asyncHandler(async (req, res) => {
  const { photoId } = req.params;
  const deleted = await Favourite.findOneAndDelete({ photoId, userId: req.user.id });
  if (deleted) await Photo.findByIdAndUpdate(photoId, { $inc: { favouriteCount: -1 } });
  res.status(200).json({ success: true, message: "Removed from favourites" });
});

export const listMyFavourites = asyncHandler(async (req, res) => {
  const favourites = await Favourite.find({ userId: req.user.id })
    .populate("photoId")
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: { photos: favourites.map((f) => f.photoId).filter(Boolean) },
  });
});

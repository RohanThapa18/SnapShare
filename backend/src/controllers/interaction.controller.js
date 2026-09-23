import asyncHandler from "express-async-handler";
import { Like, Favourite, Photo, Purchase } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { getWatermarkedUrl } from "../services/cloudinaryService.js";

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

// Shared by listMyLikes/listMyFavourites: attaches purchased/watermark
// status plus likedByMe/favouritedByMe flags so the hearts/bookmarks in
// this view (and the ability to un-like/un-favourite from here) work
// exactly like they do in the event gallery.
const enrichPhotosForViewer = async (photos, userId) => {
  const photoIds = photos.map((p) => p._id);
  const [purchases, likes, favourites] = await Promise.all([
    Purchase.find({ userId, photoId: { $in: photoIds } }).select("photoId"),
    Like.find({ userId, photoId: { $in: photoIds } }).select("photoId"),
    Favourite.find({ userId, photoId: { $in: photoIds } }).select("photoId"),
  ]);
  const purchasedIds = new Set(purchases.map((p) => p.photoId.toString()));
  const likedIds = new Set(likes.map((l) => l.photoId.toString()));
  const favouritedIds = new Set(favourites.map((f) => f.photoId.toString()));

  return photos.map((photo) => {
    const id = photo._id.toString();
    const isPurchased = purchasedIds.has(id);
    return {
      ...photo,
      url: photo.isPaid && !isPurchased ? getWatermarkedUrl(photo.cloudinaryPublicId) : photo.url,
      purchased: photo.isPaid ? isPurchased : true,
      likedByMe: likedIds.has(id),
      favouritedByMe: favouritedIds.has(id),
    };
  });
};

export const listMyLikes = asyncHandler(async (req, res) => {
  const likes = await Like.find({ userId: req.user.id })
    .populate({ path: "photoId", populate: { path: "eventId", select: "title" } })
    .sort({ createdAt: -1 });

  const photos = likes.map((l) => l.photoId).filter(Boolean).map((p) => p.toObject());
  const enriched = await enrichPhotosForViewer(photos, req.user.id);

  res.status(200).json({ success: true, data: { photos: enriched } });
});

export const listMyFavourites = asyncHandler(async (req, res) => {
  const favourites = await Favourite.find({ userId: req.user.id })
    .populate({ path: "photoId", populate: { path: "eventId", select: "title" } })
    .sort({ createdAt: -1 });

  const photos = favourites.map((f) => f.photoId).filter(Boolean).map((p) => p.toObject());
  const enriched = await enrichPhotosForViewer(photos, req.user.id);

  res.status(200).json({ success: true, data: { photos: enriched } });
});
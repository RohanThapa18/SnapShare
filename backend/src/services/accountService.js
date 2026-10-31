import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  User,
  Event,
  EventParticipant,
  EventPhotographer,
  Photo,
  Purchase,
  Like,
  Favourite,
  Download,
  MyPhotosCollection,
  Report,
} from "../models/index.js";
import { deleteCloudinaryAsset } from "./cloudinaryService.js";
import { removePhotoCompletely } from "../utils/removePhoto.js";
import { AppError } from "../utils/AppError.js";

const inChunks = async (items, size, fn) => {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
};

/**
 * Deletes a user's account by ANONYMISING it, so money records and other
 * people's purchases stay intact.
 *  - Refused while the user still owns events or has unpaid earnings.
 *  - Photos they uploaded are deleted, EXCEPT ones someone has bought.
 *  - Likes, favourites, downloads, saved results, memberships and reports
 *    made by the user are removed.
 *  - The account is stripped of name, email, avatar and UPI ID and deactivated.
 */
export const deleteAccount = async (userId) => {
  const user = await User.findById(userId).select("+avatarPublicId");
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const ownedEvents = await Event.countDocuments({ organizerId: userId });
  if (ownedEvents > 0) {
    throw new AppError(
      `You still own ${ownedEvents} event${ownedEvents === 1 ? "" : "s"}. Delete ${ownedEvents === 1 ? "it" : "them"} first (event Settings → Danger Zone), then try again.`,
      409,
      "OWNS_EVENTS"
    );
  }

  // Only meaningful once the manual-payout fields exist on Purchase
  if (Purchase.schema.path("payoutId")) {
    const unpaid = await Purchase.countDocuments({ photographerId: userId, payoutId: null });
    if (unpaid > 0) {
      throw new AppError(
        "You have earnings that haven't been paid out yet. Get paid out first, then delete your account.",
        409,
        "PENDING_PAYOUT"
      );
    }
  }

  const myPhotos = await Photo.find({ uploaderId: userId }).select("_id cloudinaryPublicId deliveryType");
  const soldIds = new Set(
    (await Purchase.distinct("photoId", { photoId: { $in: myPhotos.map((p) => p._id) } })).map(String)
  );
  const deletable = myPhotos.filter((p) => !soldIds.has(String(p._id)));
  await inChunks(deletable, 5, removePhotoCompletely);

  const [likedPhotoIds, favouritedPhotoIds] = await Promise.all([
    Like.distinct("photoId", { userId }),
    Favourite.distinct("photoId", { userId }),
  ]);
  await Promise.all([
    Photo.updateMany({ _id: { $in: likedPhotoIds } }, { $inc: { likeCount: -1 } }),
    Photo.updateMany({ _id: { $in: favouritedPhotoIds } }, { $inc: { favouriteCount: -1 } }),
  ]);

  await Promise.all([
    Like.deleteMany({ userId }),
    Favourite.deleteMany({ userId }),
    Download.deleteMany({ userId }),
    MyPhotosCollection.deleteMany({ userId }),
    EventParticipant.deleteMany({ userId }),
    EventPhotographer.deleteMany({ userId }),
    Report.deleteMany({ reporterId: userId }),
    Event.updateMany({ coOrganizerIds: userId }, { $pull: { coOrganizerIds: userId } }),
  ]);

  if (user.avatarPublicId) await deleteCloudinaryAsset(user.avatarPublicId).catch(() => {});

  user.name = "Deleted user";
  user.email = `deleted-${user._id}@deleted.invalid`;
  user.avatarUrl = null;
  user.avatarPublicId = null;
  user.upiId = null;
  user.isActive = false;
  user.deletedAt = new Date();
  user.passwordChangedAt = new Date();
  user.passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  await user.save();

  return { keptPhotos: myPhotos.length - deletable.length, deletedPhotos: deletable.length };
};
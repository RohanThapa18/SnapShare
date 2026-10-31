import { Photo, Like, Favourite, Download, FaceEmbedding, MyPhotosCollection } from "../models/index.js";
import { deleteCloudinaryAsset } from "../services/cloudinaryService.js";

/**
 * Fully removes one photo: the Cloudinary asset, the document, and everything
 * that points at it. A Cloudinary failure is logged but doesn't stop the
 * database cleanup; the "Sync with Cloudinary" sweep tidies up stragglers.
 */
export const removePhotoCompletely = async (photo) => {
  try {
    await deleteCloudinaryAsset(photo.cloudinaryPublicId, photo.deliveryType);
  } catch (err) {
    console.warn(`[removePhoto] Cloudinary delete failed for ${photo._id}: ${err.message}`);
  }

  await Promise.all([
    Photo.deleteOne({ _id: photo._id }),
    Like.deleteMany({ photoId: photo._id }),
    Favourite.deleteMany({ photoId: photo._id }),
    Download.deleteMany({ photoId: photo._id }),
    FaceEmbedding.deleteMany({ photoId: photo._id }),
    MyPhotosCollection.updateMany({ photoIds: photo._id }, { $pull: { photoIds: photo._id } }),
  ]);
};
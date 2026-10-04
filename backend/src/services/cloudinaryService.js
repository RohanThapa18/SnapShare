import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import { AppError } from "../utils/AppError.js";

export const uploadToCloudinary = async (buffer, { eventId, folder = "photos", type = "upload" }) => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env.",
      500,
      "CLOUDINARY_NOT_CONFIGURED"
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `snapshare/${eventId}/${folder}`,
        resource_type: "image",
        type,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export const deleteCloudinaryAsset = async (publicId, type = "upload") => {
  if (!publicId || !isCloudinaryConfigured()) return;
  await cloudinary.uploader.destroy(publicId, { type, invalidate: true });
};

// "authenticated" assets are only reachable through signed URLs; "upload"
// assets (legacy photos, event cover images) are publicly reachable.
const deliveryOpts = (type = "upload") =>
  type === "authenticated" ? { type: "authenticated", sign_url: true } : {};

export const getOptimizedUrl = (publicId, { width = 1600, type } = {}) =>
  cloudinary.url(publicId, {
    ...deliveryOpts(type),
    secure: true,
    quality: "auto",
    fetch_format: "auto",
    width,
    crop: "limit",
  });

export const getThumbnailUrl = (publicId, { type } = {}) =>
  cloudinary.url(publicId, {
    ...deliveryOpts(type),
    secure: true,
    quality: "auto",
    fetch_format: "auto",
    width: 600,
    crop: "limit",
  });

export const getWatermarkedUrl = (publicId, { width = 1200, type } = {}) =>
  cloudinary.url(publicId, {
    ...deliveryOpts(type),
    secure: true,
    quality: "auto",
    fetch_format: "auto",
    width,
    crop: "limit",
    transformation: [
      {
        overlay: { font_family: "Arial", font_size: 40, font_weight: "bold", text: "SnapShare Preview" },
        color: "#FFFFFF",
        opacity: 45,
        gravity: "center",
        angle: -20,
      },
    ],
  });

export const checkExistingPublicIds = async (publicIds, type = "upload") => {
  if (!isCloudinaryConfigured() || publicIds.length === 0) return new Set(publicIds);

  const existing = new Set();
  const BATCH_SIZE = 100;

  for (let i = 0; i < publicIds.length; i += BATCH_SIZE) {
    const batch = publicIds.slice(i, i + BATCH_SIZE);
    try {
      const result = await cloudinary.api.resources_by_ids(batch, { resource_type: "image", type });
      result.resources.forEach((r) => existing.add(r.public_id));
    } catch (err) {
      console.error("[cloudinary] resources_by_ids check failed, assuming batch still exists:", err.message);
      batch.forEach((id) => existing.add(id));
    }
  }

  return existing;
};

// Takes Photo docs (needs cloudinaryPublicId + deliveryType). Checks each
// delivery type separately, otherwise "authenticated" photos would look deleted.
export const checkExistingPhotos = async (photos) => {
  const byType = {};
  photos.forEach((p) => {
    const t = p.deliveryType || "upload";
    (byType[t] ||= []).push(p.cloudinaryPublicId);
  });
  const existing = new Set();
  for (const [type, ids] of Object.entries(byType)) {
    (await checkExistingPublicIds(ids, type)).forEach((id) => existing.add(id));
  }
  return existing;
};

export const getInternalFetchUrl = (publicId, { type } = {}) =>
  cloudinary.url(publicId, { ...deliveryOpts(type), secure: true, quality: "auto:best" });

export const getOriginalUrl = (publicId, { filename } = {}) =>
  cloudinary.url(publicId, {
    secure: true,
    quality: "auto:best",
    flags: filename ? `attachment:${filename}` : "attachment",
  });
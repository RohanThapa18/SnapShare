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
// Returns the Set of public IDs that still exist on Cloudinary. A public ID
// lives under ONE delivery type, and a lookup with the wrong type says "not
// found", so anything not found as "upload" is looked up as "authenticated".
// It deliberately doesn't trust a stored deliveryType.
export const checkExistingPhotos = async (photos) => {
  const ids = photos.map((p) => p.cloudinaryPublicId);
  const found = await checkExistingPublicIds(ids, "upload");

  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) {
    (await checkExistingPublicIds(missing, "authenticated")).forEach((id) => found.add(id));
  }
  return found;
};

// Safety valve: if every photo (or most of a big batch) looks "missing", the
// lookup is far more likely to be wrong than all of them really being deleted.
export const looksLikeBadLookup = (total, missing) =>
  missing > 0 && total > 1 && (missing === total || (missing >= 5 && missing / total > 0.5));

// Active check used when sync thinks ALL of an event's photos are gone:
// look at the event's photo folders on Cloudinary directly. If nothing is
// there (under either delivery type) the photos really were deleted. If
// files ARE there, the "missing" answer was wrong. If Cloudinary can't be
// reached, answer true so that nothing gets deleted on a guess.
export const eventPhotoFilesExist = async (eventId) => {
  if (!isCloudinaryConfigured()) return true;
  try {
    for (const type of ["upload", "authenticated"]) {
      for (const album of ["official", "community"]) {
        const res = await cloudinary.api.resources({
          resource_type: "image",
          type,
          prefix: `snapshare/${eventId}/${album}/`,
          max_results: 1,
        });
        if (res.resources.length > 0) return true;
      }
    }
    return false;
  } catch (err) {
    console.error("[cloudinary] folder check failed, assuming files still exist:", err.message);
    return true;
  }
};

export const getInternalFetchUrl = (publicId, { type } = {}) =>
  cloudinary.url(publicId, { ...deliveryOpts(type), secure: true, quality: "auto:best" });

export const getOriginalUrl = (publicId, { filename } = {}) =>
  cloudinary.url(publicId, {
    secure: true,
    quality: "auto:best",
    flags: filename ? `attachment:${filename}` : "attachment",
  });
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import { AppError } from "../utils/AppError.js";

/**
 * Uploads a processed image buffer to Cloudinary under a folder scoped
 * to the event, so assets are easy to locate/clean up per event.
 * Returns the public ID + delivery URLs needed for the Photo document.
 */
export const uploadToCloudinary = async (buffer, { eventId, folder = "photos" }) => {
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
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export const deleteCloudinaryAsset = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) return;
  await cloudinary.uploader.destroy(publicId);
};

/**
 * Builds an optimized delivery URL (auto format/quality, capped width)
 * for gallery display — never the raw original.
 */
export const getOptimizedUrl = (publicId, { width = 1600 } = {}) =>
  cloudinary.url(publicId, {
    secure: true,
    quality: "auto",
    fetch_format: "auto",
    width,
    crop: "limit",
  });

/**
 * Grid-sized preview — capped width only, no forced aspect ratio. The
 * full image is shown, just resized down for fast loading, rather than
 * center-cropped into a square.
 */
export const getThumbnailUrl = (publicId) =>
  cloudinary.url(publicId, {
    secure: true,
    quality: "auto",
    fetch_format: "auto",
    width: 600,
    crop: "limit",
  });

/**
 * Watermarked preview for paid photos — applied via Cloudinary
 * transformation only, at delivery time. The original asset stored in
 * Cloudinary is never modified.
 */
export const getWatermarkedUrl = (publicId) =>
  cloudinary.url(publicId, {
    secure: true,
    quality: "auto",
    fetch_format: "auto",
    width: 1200,
    crop: "limit",
    transformation: [
      {
        overlay: {
          font_family: "Arial",
          font_size: 40,
          font_weight: "bold",
          text: "SnapShare Preview",
        },
        color: "#FFFFFF",
        opacity: 45,
        gravity: "center",
        angle: -20,
      },
    ],
  });

/**
 * Checks which of the given Cloudinary public IDs still actually exist
 * on Cloudinary. Used to detect and clean up Photo documents whose
 * underlying asset was deleted directly on Cloudinary (bypassing our
 * API), which would otherwise leave broken, undeletable-looking photos
 * stuck in the app forever. Batches in groups of 100 (Cloudinary Admin
 * API limit per resources_by_ids call).
 */
export const checkExistingPublicIds = async (publicIds) => {
  if (!isCloudinaryConfigured() || publicIds.length === 0) return new Set(publicIds);

  const existing = new Set();
  const BATCH_SIZE = 100;

  for (let i = 0; i < publicIds.length; i += BATCH_SIZE) {
    const batch = publicIds.slice(i, i + BATCH_SIZE);
    try {
      const result = await cloudinary.api.resources_by_ids(batch, { resource_type: "image" });
      result.resources.forEach((r) => existing.add(r.public_id));
    } catch (err) {
      // If the Admin API call itself fails (rate limit, network blip),
      // don't treat that as "these photos don't exist" — assume they
      // still do, so we never delete data based on an inconclusive check.
      console.error("[cloudinary] resources_by_ids check failed, assuming batch still exists:", err.message);
      batch.forEach((id) => existing.add(id));
    }
  }

  return existing;
};

/**
 * Plain full-resolution URL with no attachment flag — used internally
 * (e.g. the AI worker fetching image bytes for face detection), where
 * we just want the raw image, not a download-triggering response header.
 */
export const getInternalFetchUrl = (publicId) =>
  cloudinary.url(publicId, { secure: true, quality: "auto:best" });

/**
 * Returns the true original, full-resolution delivery URL, flagged so
 * the browser downloads it directly to disk (Content-Disposition:
 * attachment) instead of just opening it in a new tab. Only ever called
 * by controllers AFTER verifying the requester purchased the photo (or
 * it's free) — never exposed unconditionally.
 */
export const getOriginalUrl = (publicId, { filename } = {}) =>
  cloudinary.url(publicId, {
    secure: true,
    quality: "auto:best",
    flags: filename ? `attachment:${filename}` : "attachment",
  });

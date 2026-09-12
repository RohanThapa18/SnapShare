import sharp from "sharp";
import { AppError } from "../utils/AppError.js";

/**
 * Validates and compresses an uploaded image buffer before it goes to
 * Cloudinary. Keeps a reasonable max dimension so we're not shipping
 * absurdly large originals, while preserving enough quality for paid
 * full-resolution downloads.
 */
export const processImage = async (buffer) => {
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new AppError("Uploaded file is not a valid image", 400, "INVALID_IMAGE");
  }

  if (!metadata.width || !metadata.height) {
    throw new AppError("Could not read image dimensions", 400, "INVALID_IMAGE");
  }

  const MAX_DIMENSION = 4000;

  const processed = await sharp(buffer)
    .rotate() // auto-orient based on EXIF, then strip EXIF for privacy (location data etc.)
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: processed.data,
    width: processed.info.width,
    height: processed.info.height,
    sizeBytes: processed.info.size,
  };
};

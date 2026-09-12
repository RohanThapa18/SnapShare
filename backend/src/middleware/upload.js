import multer from "multer";
import { AppError } from "../utils/AppError.js";

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 15);
const MAX_FILES_PER_UPLOAD = Number(process.env.MAX_FILES_PER_UPLOAD || 50);
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.memoryStorage(); // buffer goes straight to Sharp, never touches disk

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new AppError(
        `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP.`,
        400,
        "INVALID_FILE_TYPE"
      )
    );
  }
  cb(null, true);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: MAX_FILES_PER_UPLOAD,
  },
});

export const uploadSingle = uploader.single("photo");
export const uploadMultiple = uploader.array("photos", MAX_FILES_PER_UPLOAD);
export const uploadSelfie = uploader.single("selfie");

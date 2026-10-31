import archiver from "archiver";
import asyncHandler from "express-async-handler";
import { Event, Photo } from "../models/index.js";
import { getInternalFetchUrl } from "../services/cloudinaryService.js";
import { AppError } from "../utils/AppError.js";

const CONCURRENCY = 4;

const fetchBuffer = async (photo) => {
  try {
    const response = await fetch(getInternalFetchUrl(photo.cloudinaryPublicId, { type: photo.deliveryType }));
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null; // skip this file, don't fail the whole archive
  }
};

/**
 * GET /api/events/:id/export: organizers only.
 * Streams a ZIP of every photo in the event (original quality), split into
 * Official/ and Community/ folders. Capped by MAX_EXPORT_PHOTOS.
 */
export const exportEventPhotos = asyncHandler(async (req, res) => {
  const eventId = req.event._id;
  const max = Number(process.env.MAX_EXPORT_PHOTOS) || 400;

  const [event, total] = await Promise.all([
    Event.findById(eventId).select("title"),
    Photo.countDocuments({ eventId }),
  ]);
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
  if (total === 0) throw new AppError("This event has no photos to export yet", 404, "NO_PHOTOS");
  if (total > max) {
    throw new AppError(
      `This event has ${total} photos, and exports are limited to ${max} at a time.`,
      413,
      "EXPORT_TOO_LARGE"
    );
  }

  const photos = await Photo.find({ eventId })
    .sort({ createdAt: 1 })
    .select("cloudinaryPublicId deliveryType album")
    .lean();

  const safeName = event.title.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Event";
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="SnapShare_${safeName}_all_photos.zip"`);
  res.setHeader("X-Photo-Count", String(total));
  res.setHeader("Access-Control-Expose-Headers", "X-Photo-Count, Content-Disposition");

  // JPEGs are already compressed, so just store them (much faster than deflating)
  const archive = archiver("zip", { store: true });
  let aborted = false;

  res.on("close", () => {
    if (!res.writableFinished) {
      aborted = true; // the organizer cancelled the download: stop fetching
      archive.abort();
    }
  });
  archive.on("error", (err) => {
    console.error("[exportEventPhotos] archive error:", err);
    res.end();
  });
  archive.pipe(res);

  const counters = { OFFICIAL: 0, COMMUNITY: 0 };

  for (let i = 0; i < photos.length && !aborted; i += CONCURRENCY) {
    const chunk = photos.slice(i, i + CONCURRENCY);
    const buffers = await Promise.all(chunk.map(fetchBuffer));

    chunk.forEach((photo, j) => {
      if (aborted || !buffers[j]) return;
      counters[photo.album] = (counters[photo.album] || 0) + 1;
      const folder = photo.album === "OFFICIAL" ? "Official" : "Community";
      const name = `${folder}/photo_${String(counters[photo.album]).padStart(4, "0")}.jpg`;
      archive.append(buffers[j], { name });
    });
  }

  if (!aborted) await archive.finalize();
});
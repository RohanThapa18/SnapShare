import "dotenv/config";
import mongoose from "mongoose";
import cloudinary, { isCloudinaryConfigured } from "../src/config/cloudinary.js";
import { Event, Photo } from "../src/models/index.js";
import { getOptimizedUrl, getThumbnailUrl } from "../src/services/cloudinaryService.js";
import { enqueuePhotoForAiProcessing } from "../src/queues/aiProcessing.queue.js";
import { ALBUM_TYPE } from "../src/constants/enums.js";

const APPLY = process.argv.includes("--apply");
const ONLY_EVENT = (process.argv.find((a) => a.startsWith("--event=")) || "").split("=")[1];

const ALBUMS = { official: ALBUM_TYPE.OFFICIAL, community: ALBUM_TYPE.COMMUNITY };

// Photos are stored as snapshare/<eventId>/<official|community>/<random>.
// Anything else (event covers, other files) is ignored.
const parsePublicId = (publicId) => {
  const m = /^snapshare\/([0-9a-f]{24})\/(official|community)\/[^/]+$/.exec(publicId);
  return m ? { eventId: m[1], album: ALBUMS[m[2]] } : null;
};

const listAssets = async (type) => {
  const assets = [];
  let next_cursor;
  do {
    const res = await cloudinary.api.resources({
      type,
      resource_type: "image",
      prefix: "snapshare/",
      max_results: 500,
      next_cursor,
    });
    res.resources.forEach((r) => assets.push({ ...r, type }));
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return assets;
};

const main = async () => {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary is not configured in .env");
  await mongoose.connect(process.env.MONGO_URI);

  console.log(APPLY ? "MODE: APPLY (will write to the database)" : "MODE: DRY RUN (nothing will be changed)");

  const assets = [...(await listAssets("authenticated")), ...(await listAssets("upload"))]
    .map((r) => ({ r, parsed: parsePublicId(r.public_id) }))
    .filter((x) => x.parsed && (!ONLY_EVENT || x.parsed.eventId === ONLY_EVENT));
  console.log(`Found ${assets.length} photo file(s) on Cloudinary`);

  const eventIds = [...new Set(assets.map((x) => x.parsed.eventId))];
  const events = await Event.find({ _id: { $in: eventIds } }).select("_id title organizerId");
  const eventById = new Map(events.map((e) => [e._id.toString(), e]));

  const existing = new Set(
    (await Photo.find({ eventId: { $in: events.map((e) => e._id) } }).select("cloudinaryPublicId")).map(
      (p) => p.cloudinaryPublicId
    )
  );

  const toRestore = assets.filter((x) => eventById.has(x.parsed.eventId) && !existing.has(x.r.public_id));
  const skippedNoEvent = assets.filter((x) => !eventById.has(x.parsed.eventId)).length;

  const perEvent = {};
  toRestore.forEach((x) => (perEvent[x.parsed.eventId] = (perEvent[x.parsed.eventId] || 0) + 1));
  Object.entries(perEvent).forEach(([id, n]) =>
    console.log(`  ${eventById.get(id).title} (${id}): ${n} photo(s) to restore`)
  );
  console.log(
    `${toRestore.length} to restore, ${assets.length - toRestore.length - skippedNoEvent} already in the database, ${skippedNoEvent} skipped (event no longer exists)`
  );

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to restore these.");
    return;
  }

  let restored = 0;
  for (const { r, parsed } of toRestore) {
    const event = eventById.get(parsed.eventId);
    const photo = await Photo.create({
      eventId: parsed.eventId,
      uploaderId: event.organizerId, // the real uploader wasn't stored on Cloudinary
      album: parsed.album,
      cloudinaryPublicId: r.public_id,
      deliveryType: r.type,
      url: getOptimizedUrl(r.public_id, { type: r.type }),
      thumbnailUrl: getThumbnailUrl(r.public_id, { type: r.type }),
      width: r.width,
      height: r.height,
      fileSizeBytes: r.bytes,
      isPaid: false,
      price: 0,
      createdAt: new Date(r.created_at),
    });
    await enqueuePhotoForAiProcessing(photo._id.toString());
    restored++;
  }
  console.log(`\nRestored ${restored} photo(s) and queued them for face processing.`);
};

main()
  .catch((err) => {
    console.error("Restore failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit();
  });
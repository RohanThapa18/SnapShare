import "dotenv/config";
import mongoose from "mongoose";
import cloudinary from "../src/config/cloudinary.js";
import { Photo } from "../src/models/index.js";
import { getOptimizedUrl, getThumbnailUrl } from "../src/services/cloudinaryService.js";

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;

await mongoose.connect(process.env.MONGO_URI);
const photos = await Photo.find({ deliveryType: { $ne: "authenticated" } }).limit(limit);
console.log(`Migrating ${photos.length} photo(s)`);

for (const p of photos) {
  try {
    await cloudinary.uploader.rename(p.cloudinaryPublicId, p.cloudinaryPublicId, {
      type: "upload",
      to_type: "authenticated",
      overwrite: true,
      invalidate: true,
    });
    p.deliveryType = "authenticated";
    p.url = getOptimizedUrl(p.cloudinaryPublicId, { type: "authenticated" });
    p.thumbnailUrl = getThumbnailUrl(p.cloudinaryPublicId, { type: "authenticated" });
    await p.save();
    console.log("ok", p._id.toString());
  } catch (err) {
    console.error("FAILED", p._id.toString(), err.message);
  }
}
await mongoose.disconnect();
import "dotenv/config";
import mongoose from "mongoose";
import { EventPhotographer, EventParticipant } from "../src/models/index.js";

await mongoose.connect(process.env.MONGO_URI);

const assignments = await EventPhotographer.find().select("eventId userId").lean();
let created = 0;
for (const { eventId, userId } of assignments) {
  const res = await EventParticipant.updateOne(
    { eventId, userId },
    { $setOnInsert: { eventId, userId } },
    { upsert: true }
  );
  if (res.upsertedCount) created++;
}

console.log(`Checked ${assignments.length} photographers, added ${created} participant records.`);
await mongoose.disconnect();
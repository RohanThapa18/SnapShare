import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/index.js";

await mongoose.connect(process.env.MONGO_URI);
console.log("Host:", mongoose.connection.host);
console.log("Database:", mongoose.connection.name);

const users = await User.find()
  .select("name email isActive createdAt")
  .sort({ createdAt: -1 })
  .lean();

console.log(`${users.length} user(s):`);
users.forEach((u) =>
  console.log(`- ${u.email} | ${u.name} | active=${u.isActive} | ${u.createdAt?.toISOString()}`)
);

await mongoose.disconnect();
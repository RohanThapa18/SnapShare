import mongoose from "mongoose";

/**
 * Establishes the MongoDB Atlas connection using Mongoose.
 * Fails fast and loudly if MONGO_URI is missing or unreachable,
 * rather than letting the app start in a broken state.
 */
export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error(
      "[db] MONGO_URI is not set. Copy .env.example to .env and add your MongoDB Atlas connection string."
    );
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("[db] MongoDB disconnected");
});

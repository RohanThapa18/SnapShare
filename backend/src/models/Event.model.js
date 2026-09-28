import mongoose from "mongoose";
import { EVENT_STATUS } from "../constants/enums.js";

const eventSchema = new mongoose.Schema(
  {
    // Event title
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // URL-friendly event name
    // Example:
    // "Freshers 2026" -> "freshers-2026"
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    coverImageUrl: {
      type: String,
      default: null,
    },

    coverImagePublicId: {
      type: String,
      default: null,
    },

    date: {
      type: Date,
      required: true,
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Passcode is bcrypt-hashed at creation time.
    // Used only for verifying event join attempts.
    passcodeHash: {
      type: String,
      required: true,
      select: false,
    },

    // Encrypted copy used only by the organizer-only
    // reveal-passcode endpoint.
    passcodeEncrypted: {
      type: String,
      select: false,
      default: null,
    },

    // Participant QR join token.
    // This is NOT the event URL slug.
    joinToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Photographer QR join token.
    photographerJoinToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Existing useful index
eventSchema.index({
  organizerId: 1,
  status: 1,
});

// Useful for event lookup by slug
eventSchema.index({
  slug: 1,
});

export default mongoose.model("Event", eventSchema);
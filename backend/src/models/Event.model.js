import mongoose from "mongoose";
import { EVENT_STATUS } from "../constants/enums.js";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    coverImageUrl: { type: String, default: null },
    coverImagePublicId: { type: String, default: null },
    date: { type: Date, required: true },
    location: { type: String, trim: true, default: "" },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Passcode is bcrypt-hashed at creation time and remains the source
    // of truth for verifying a join attempt — never decrypted or
    // compared as plaintext.
    passcodeHash: { type: String, required: true, select: false },

    // A SEPARATE, reversibly-encrypted copy of the same passcode
    // (AES-256-GCM, see utils/passcodeCipher.js), used ONLY by the
    // organizer-only "reveal passcode" endpoint so organizers can pull
    // up the code again later instead of it being shown once and lost.
    // Never used for join verification. Events created before this
    // field existed will have it as null — the reveal endpoint tells
    // the organizer to regenerate in that case.
    passcodeEncrypted: { type: String, select: false, default: null },

    // Cryptographically random opaque token used for QR-code joining as
    // a PARTICIPANT. Never exposes the passcode or the raw Mongo _id.
    joinToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // A SEPARATE opaque token for joining as a PHOTOGRAPHER. Sharing
    // this link (or its QR code) is how an organizer lets someone
    // self-assign as an official photographer for this event, as an
    // alternative to the organizer adding them by email.
    photographerJoinToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiryDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.ACTIVE,
      index: true,
    },
  },
  { timestamps: true }
);

eventSchema.index({ organizerId: 1, status: 1 });

export default mongoose.model("Event", eventSchema);

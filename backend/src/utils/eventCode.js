import crypto from "crypto";

// No 0/O/1/I/L so a code read aloud or off a screenshot can't be mistyped.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const EVENT_CODE_LENGTH = 8;

export const generateEventCode = () =>
  Array.from({ length: EVENT_CODE_LENGTH }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join("");

// Accepts "k7qx-2pmh", "K7QX 2PMH", "K7QX2PMH" -> "K7QX2PMH"
export const normalizeEventCode = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
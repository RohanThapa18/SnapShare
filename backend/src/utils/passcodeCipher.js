import crypto from "crypto";

/**
 * Reversible encryption for event passcodes ONLY.
 *
 * This is deliberately separate from `Event.passcodeHash` (bcrypt,
 * one-way, used to verify a join attempt). An event passcode is more
 * like a "room code" an organizer hands out repeatedly over the life
 * of an event than an account credential — the product requirement is
 * that an organizer can come back and view it anytime, which a
 * one-way hash can never support. So we ALSO store an encrypted copy
 * (AES-256-GCM, authenticated) that only the backend, holding
 * PASSCODE_ENCRYPTION_KEY, can decrypt. The bcrypt hash remains the
 * source of truth for verifying joins; this encrypted copy is only
 * ever decrypted by the organizer-only "reveal passcode" endpoint.
 *
 * PASSCODE_ENCRYPTION_KEY must be a 64-character hex string (32 raw
 * bytes) — generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM

const getKey = () => {
  const hex = process.env.PASSCODE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "PASSCODE_ENCRYPTION_KEY is not set (or not a 64-char hex string) in .env. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
};

/** Encrypts plaintext, returning a single `iv:authTag:ciphertext` hex string. */
export const encryptPasscode = (plaintext) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
};

/** Decrypts a string produced by encryptPasscode. Throws if tampered/invalid. */
export const decryptPasscode = (payload) => {
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted passcode payload");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
};

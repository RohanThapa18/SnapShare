import jwt from "jsonwebtoken";

/**
 * Tokens no longer embed a role — authorization is resolved per-event
 * from EventParticipant / EventPhotographer / Event.organizerId at
 * request time (see middleware/membership.js), not from a fixed
 * account-level role baked into the JWT.
 */
export const signToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in .env");
  }
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

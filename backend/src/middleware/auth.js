import { verifyToken } from "../services/tokenService.js";
import { AppError } from "../utils/AppError.js";
import { User } from "../models/index.js";

/**
 * Requires a valid JWT (from Authorization: Bearer <token> or an
 * httpOnly cookie named "token"). Attaches the authenticated user's id
 * to req.user.
 *
 * There is no global account-level role anymore — a user's permissions
 * (organizer / photographer / participant) are entirely per-event and
 * resolved by the membership middleware (requireEventOwner,
 * requireEventPhotographer, requireEventParticipant) at request time.
 * This mirrors a Google-Classroom-style model: the same account can
 * create some events and join others as a participant or photographer.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const bearerToken = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;
    const token = bearerToken || req.cookies?.token;

    if (!token) {
      throw new AppError("Authentication required", 401, "NO_TOKEN");
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new AppError("User not found or inactive", 401, "USER_INACTIVE");
    }

    req.user = { id: user._id.toString(), email: user.email };
    next();
  } catch (err) {
    next(err);
  }
};

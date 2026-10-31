import { AppError } from "../utils/AppError.js";

/** Use after requireAuth. Admins are listed in the ADMIN_EMAILS env var. */
export const requireAdmin = (req, res, next) => {
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!req.user?.email || !admins.includes(req.user.email.toLowerCase())) {
    return next(new AppError("Admin access required", 403, "NOT_ADMIN"));
  }
  next();
};
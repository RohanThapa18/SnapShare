import { AppError } from "../utils/AppError.js";

export const originCheck = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const origin = req.get("origin");
  const allowed = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

  if (origin && origin !== allowed) {
    return next(new AppError("Cross-origin request blocked", 403, "BAD_ORIGIN"));
  }
  next();
};
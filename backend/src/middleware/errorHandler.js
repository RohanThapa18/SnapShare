/**
 * Centralized error handler. Every route/controller/service should
 * throw AppError (or let Mongoose/validation errors bubble up) and
 * let this middleware format the final response.
 *
 * Response shape is consistent across the whole API:
 * { success: false, message, code }
 *
 * In production, stack traces and internal error details are never
 * sent to the client.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let code = err.code || "INTERNAL_ERROR";

  // Mongoose invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
    code = "INVALID_ID";
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    code = "VALIDATION_ERROR";
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists` : "Duplicate value";
    code = "DUPLICATE_KEY";
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
    code = "INVALID_TOKEN";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired";
    code = "TOKEN_EXPIRED";
  }

  if (process.env.NODE_ENV !== "production" && !err.isOperational) {
    // Unexpected (non-operational) errors get logged with full stack in dev
    console.error("[error]", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
  });
};

/**
 * Catches requests to routes that don't exist.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: "ROUTE_NOT_FOUND",
  });
};

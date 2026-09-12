/**
 * AppError represents a known, expected error condition (bad input,
 * missing resource, unauthorized action, etc.) as opposed to an
 * unexpected bug. Controllers/services throw this; the centralized
 * error handler in middleware/errorHandler.js turns it into the
 * standard { success, message, code } response shape.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // distinguishes expected errors from bugs/crashes
    Error.captureStackTrace(this, this.constructor);
  }
}

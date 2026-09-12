import { AppError } from "../utils/AppError.js";

/**
 * Generic Zod-schema-driven request validator.
 * Usage: router.post("/x", validate(schema), handler)
 * schema should be a Zod object matching { body?, params?, query? }
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return next(new AppError(message, 400, "VALIDATION_ERROR"));
  }

  // Overwrite with parsed/coerced values
  if (result.data.body) req.body = result.data.body;
  if (result.data.query) req.query = result.data.query;
  next();
};

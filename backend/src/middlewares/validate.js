import { ApiError } from "../utils/ApiError.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });
  if (!result.success) {
    const details = result.error.issues.map(i => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return next(new ApiError(400, "Validation failed", details));
  }
  req.validated = result.data;
  next();
};

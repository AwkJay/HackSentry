/* Global Error Handler Middleware */

/* Custom error class for API errors */
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    Error.captureStackTrace(this, this.constructor);
  }
}

/* 404 Not Found handler */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

/* Async wrapper to catch errors in async controllers */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/* Global error handler */
export const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  /* Default values */
  error.statusCode = err.statusCode || 500;
  error.status = err.status || "error";

  /* Log error in development */
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ Error:", {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
      path: req.originalUrl,
      method: req.method,
    });
  }

  /* Handle specific error types */

  /* MongoDB CastError (invalid ObjectId) */
  if (err.name === "CastError") {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  /* MongoDB Duplicate Key Error */
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(400, `Duplicate value for field: ${field}`);
  }

  /* MongoDB Validation Error */
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(400, `Validation failed: ${messages.join(", ")}`);
  }

  /* JWT Errors */
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token. Please log in again.");
  }

  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Token expired. Please log in again.");
  }

  /* Mongoose connection error */
  if (err.name === "MongooseServerSelectionError") {
    error = new ApiError(503, "Database connection failed");
  }

  /* Send response */
  res.status(error.statusCode).json({
    success: false,
    status: error.status,
    message: error.message,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
};

export default {
  ApiError,
  notFoundHandler,
  asyncHandler,
  globalErrorHandler,
};

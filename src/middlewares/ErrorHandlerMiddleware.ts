import { NextFunction, Request, Response } from 'express';
import { AppError, formatErrorResponse } from '../utils/errors';

/**
 * Global error handling middleware
 * Should be registered last in the middleware chain
 */
export const ErrorHandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle operational errors (expected errors)
  if (err instanceof AppError) {
    const errorResponse = formatErrorResponse(err);
    return res.status(errorResponse.statusCode).json(errorResponse);
  }

  // Handle unexpected errors
  console.error('❌ Unexpected error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: res.locals.user?.id,
  });

  // Don't expose internal error details to client
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    statusCode: 500,
  });
};

/**
 * Wrapper for async route handlers to catch errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

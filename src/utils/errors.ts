/**
 * Custom error classes for consistent error handling across the application
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', code = 'INTERNAL_ERROR') {
    super(message, 500, code, false);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', code = 'DATABASE_ERROR') {
    super(message, 500, code, false);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, code = 'EXTERNAL_SERVICE_ERROR') {
    super(message, 502, code, true);
  }
}

export class SelfExclusionError extends ForbiddenError {
  constructor(
    message = 'You are currently self-excluded from betting activities through GamStop. This restriction prevents you from accessing your account. If you believe this is an error, please contact support.',
  ) {
    super(message, 'SELF_EXCLUSION_ACTIVE');
  }
}

export class DepositLimitError extends ForbiddenError {
  constructor(message: string) {
    super(message, 'DEPOSIT_LIMIT_EXCEEDED');
  }
}

export class BetLimitError extends ForbiddenError {
  constructor(message: string) {
    super(message, 'BET_LIMIT_EXCEEDED');
  }
}

/**
 * Type guard to check if error is an operational error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error response for API
 */
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  statusCode: number;
}

export function formatErrorResponse(error: AppError): ErrorResponse {
  return {
    error: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
  };
}

// Custom error classes for the server

import { ErrorCode, ErrorCodes } from '@playdate/shared';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Room-specific errors
export class RoomError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    const statusCode = getStatusCodeForRoomError(code);
    super(code, message, statusCode, details);
  }
}

function getStatusCodeForRoomError(code: ErrorCode): number {
  switch (code) {
    case ErrorCodes.ROOM_NOT_FOUND:
      return 404;
    case ErrorCodes.ROOM_FULL:
    case ErrorCodes.ROOM_CLOSED:
      return 403;
    case ErrorCodes.ROOM_PASSWORD_INVALID:
      return 401;
    case ErrorCodes.ROOM_LOCKED:
      return 423;
    case ErrorCodes.RATE_LIMITED:
      return 429;
    default:
      return 400;
  }
}

// Game-specific errors
export class GameError extends AppError {
  public readonly gameKey?: string;

  constructor(
    code: ErrorCode,
    message: string,
    gameKey?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, 400, details);
    this.gameKey = gameKey;
  }
}

// Authentication errors
export class AuthError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCodes.UNAUTHORIZED, message, 401, details);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, details);
  }
}

// Not found error
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(ErrorCodes.ROOM_NOT_FOUND, message, 404);
  }
}

// Helper to check if error is operational
export function isOperationalError(error: Error): boolean {
  return error instanceof AppError && error.isOperational;
}


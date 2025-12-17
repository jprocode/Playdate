// Express error handling middleware

import type { Request, Response, NextFunction } from 'express';

import { AppError, isOperationalError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  if (isOperationalError(err)) {
    logger.warn({ err }, 'Operational error');
  } else {
    logger.error({ err }, 'Unexpected error');
  }

  // If it's an operational error, send the appropriate response
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // For unexpected errors, send a generic response
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Resource not found',
  });
}


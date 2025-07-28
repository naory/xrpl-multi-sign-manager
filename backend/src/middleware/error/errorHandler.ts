import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Handle Sequelize validation errors
  if (error instanceof ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    
    res.status(statusCode).json({
      success: false,
      message,
      errors: error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }))
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle specific operational errors
  if (error.isOperational) {
    res.status(statusCode).json({
      success: false,
      message
    });
    return;
  }

  // Log unexpected errors
  console.error('Unexpected error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  if (process.env['NODE_ENV'] === 'production') {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 
import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { createLogger } from '../utils/logger';
import { ApiError } from '../types';

const logger = createLogger('Error Handler');

// 自定義錯誤類
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 常見錯誤類型
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, true, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'TOO_MANY_REQUESTS');
    this.name = 'TooManyRequestsError';
  }
}

// Prisma 錯誤處理
const handlePrismaError = (error: PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // 唯一約束違反
      const field = error.meta?.target as string[] | undefined;
      const fieldName = field?.[0] || 'field';
      return new ConflictError(`${fieldName} already exists`);
    
    case 'P2025':
      // 記錄不存在
      return new NotFoundError('Record not found');
    
    case 'P2003':
      // 外鍵約束違反
      return new ValidationError('Referenced record does not exist');
    
    case 'P2014':
      // 無效的 ID
      return new ValidationError('Invalid ID provided');
    
    default:
      logger.error('Unhandled Prisma error', { code: error.code, message: error.message });
      return new AppError('Database error', 500, true, 'DATABASE_ERROR');
  }
};

// 錯誤處理中間件
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let appError: AppError;

  // 判斷錯誤類型
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  } else {
    // 未知錯誤
    appError = new AppError(
      process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      500,
      false
    );
  }

  // 記錄錯誤
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: appError.code,
      statusCode: appError.statusCode,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
  };

  if (appError.statusCode >= 500) {
    logger.error('Server error', logData);
  } else {
    logger.warn('Client error', logData);
  }

  // 構建響應
  const response: any = {
    success: false,
    error: appError.message,
    code: appError.code,
  };

  // 開發環境添加錯誤詳情
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = error;
  }

  res.status(appError.statusCode).json(response);
};

// 404 處理中間件
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.url} not found`);
  
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    success: false,
    error: error.message,
    code: error.code,
  });
};

// 異步錯誤包裝器
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 未捕獲異常處理
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error);
    // 優雅關閉應用程序
    process.exit(1);
  });
};

// 未處理的 Promise 拒絕
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString(),
    });
    // 優雅關閉應用程序
    process.exit(1);
  });
};

// 響應成功的輔助函數
export const sendSuccess = (
  res: Response,
  data: any = null,
  message: string = 'Success',
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// 響應錯誤的輔助函數
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string
): void => {
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
  });
};

// 響應分頁數據的輔助函數
export const sendPaginatedResponse = (
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number
): void => {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore,
    },
  });
};

// 驗證錯誤響應
export const sendValidationError = (
  res: Response,
  errors: Array<{ field: string; message: string; code: string }>
): void => {
  res.status(400).json({
    success: false,
    error: 'Validation failed',
    details: errors,
  });
};
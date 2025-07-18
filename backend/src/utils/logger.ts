import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// 自定義日誌格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 開發環境格式
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// 創建日誌目錄
const logDir = path.join(process.cwd(), 'logs');

// 配置日誌傳輸
const transports: winston.transport[] = [
  // 控制台輸出
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'development' ? developmentFormat : logFormat,
  }),
];

// 生產環境添加文件輸出
if (process.env.NODE_ENV === 'production') {
  transports.push(
    // 錯誤日誌
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
      level: 'error',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      format: logFormat,
    }),
    // 組合日誌
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      format: logFormat,
    }),
    // 訪問日誌
    new DailyRotateFile({
      filename: path.join(logDir, 'access-%DATE%.log'),
      datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
      level: 'http',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      format: logFormat,
    })
  );
}

// 創建 logger 實例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  // 處理未捕獲的異常
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }),
  ],
  // 處理未處理的 Promise rejection
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }),
  ],
});

// 創建不同類型的日誌記錄器
export const createLogger = (module: string) => {
  return {
    info: (message: string, meta?: any) => {
      logger.info(message, { module, ...meta });
    },
    error: (message: string, error?: Error | any, meta?: any) => {
      logger.error(message, { 
        module, 
        error: error?.message || error, 
        stack: error?.stack,
        ...meta 
      });
    },
    warn: (message: string, meta?: any) => {
      logger.warn(message, { module, ...meta });
    },
    debug: (message: string, meta?: any) => {
      logger.debug(message, { module, ...meta });
    },
    http: (message: string, meta?: any) => {
      logger.http(message, { module, ...meta });
    },
  };
};

// 導出默認 logger
export { logger };
export default logger;

// 創建結構化日誌的輔助函數
export const logWithContext = (
  level: string,
  message: string,
  context: {
    userId?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: any;
  } = {}
) => {
  logger.log(level, message, context);
};

// 性能日誌
export const logPerformance = (
  operation: string,
  duration: number,
  context: any = {}
) => {
  logger.info(`Performance: ${operation}`, {
    operation,
    duration,
    ...context,
  });
};

// 安全日誌
export const logSecurity = (
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: any = {}
) => {
  logger.warn(`Security: ${event}`, {
    event,
    severity,
    ...details,
  });
};

// 業務日誌
export const logBusiness = (
  event: string,
  details: any = {}
) => {
  logger.info(`Business: ${event}`, {
    event,
    ...details,
  });
};

// 審計日誌
export const logAudit = (
  userId: string,
  action: string,
  resource: string,
  details: any = {}
) => {
  logger.info(`Audit: ${action} on ${resource}`, {
    userId,
    action,
    resource,
    ...details,
  });
};
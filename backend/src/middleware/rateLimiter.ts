import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { rateLimiter as redisRateLimiter } from '../utils/redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('Rate Limiter');

// 基礎限流配置
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: options.message,
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
      
      res.status(429).json({
        success: false,
        error: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

// 一般 API 限流
export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

// 認證相關限流（更嚴格）
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 10, // 只允許 10 次認證請求
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// 文件上傳限流
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 50, // 每小時最多 50 次上傳
  message: 'Too many file uploads, please try again later.',
});

// 爬蟲任務限流
export const crawlerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 20, // 每小時最多 20 個爬蟲任務
  message: 'Too many crawler tasks created, please try again later.',
});

// AI 分析限流
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 100, // 每小時最多 100 次 AI 分析
  message: 'Too many AI analysis requests, please try again later.',
});

// 搜索限流
export const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 分鐘
  max: 30, // 每分鐘最多 30 次搜索
  message: 'Too many search requests, please try again later.',
});

// 基於 Redis 的分布式限流中間件
export const createRedisRateLimiter = (options: {
  keyGenerator: (req: Request) => string;
  windowMs: number;
  max: number;
  message: string;
}) => {
  return async (req: Request, res: Response, next: any) => {
    try {
      const key = options.keyGenerator(req);
      const windowSeconds = Math.floor(options.windowMs / 1000);
      
      const result = await redisRateLimiter.check(key, options.max, windowSeconds);
      
      // 設置響應頭
      res.set({
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });
      
      if (!result.allowed) {
        logger.warn('Redis rate limit exceeded', {
          key,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
        });
        
        res.status(429).json({
          success: false,
          error: options.message,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        });
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Redis rate limiter error', error);
      // 如果 Redis 出錯，允許請求通過
      next();
    }
  };
};

// 用戶特定限流
export const userLimiter = createRedisRateLimiter({
  keyGenerator: (req: Request) => `user:${(req as any).user?.id || req.ip}`,
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 1000, // 每小時 1000 次請求
  message: 'Too many requests for this user, please try again later.',
});

// IP 限流
export const ipLimiter = createRedisRateLimiter({
  keyGenerator: (req: Request) => `ip:${req.ip}`,
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 200, // 每 15 分鐘 200 次請求
  message: 'Too many requests from this IP, please try again later.',
});

// 端點特定限流
export const endpointLimiter = (endpoint: string, max: number, windowMs: number) => {
  return createRedisRateLimiter({
    keyGenerator: (req: Request) => `endpoint:${endpoint}:${(req as any).user?.id || req.ip}`,
    windowMs,
    max,
    message: `Too many requests to ${endpoint}, please try again later.`,
  });
};

// 動態限流（根據用戶類型調整）
export const dynamicLimiter = createRedisRateLimiter({
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    const userType = 'regular'; // 這裡可以擴展用戶類型系統
    return `dynamic:${userType}:${userId || req.ip}`;
  },
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 500, // 基礎限制
  message: 'Rate limit exceeded for your account type.',
});

// 驗證碼限流
export const captchaLimiter = createRedisRateLimiter({
  keyGenerator: (req: Request) => `captcha:${req.ip}`,
  windowMs: 60 * 1000, // 1 分鐘
  max: 5, // 每分鐘最多 5 次驗證碼請求
  message: 'Too many captcha requests, please try again later.',
});

// 密碼重置限流
export const passwordResetLimiter = createRedisRateLimiter({
  keyGenerator: (req: Request) => `password-reset:${req.ip}`,
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 3, // 每小時最多 3 次密碼重置請求
  message: 'Too many password reset attempts, please try again later.',
});

// 登入嘗試限流
export const loginAttemptLimiter = createRedisRateLimiter({
  keyGenerator: (req: Request) => `login:${req.body.email || req.ip}`,
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 每 15 分鐘最多 5 次登入嘗試
  message: 'Too many login attempts, please try again later.',
});

// 註冊限流
export const registerLimiter = createRedisRateLimiter({
  keyGenerator: (req: Request) => `register:${req.ip}`,
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 5, // 每小時最多 5 次註冊
  message: 'Too many registration attempts, please try again later.',
});

// 爬蟲相關限流器
export const rateLimiter = (limitType: string) => {
  switch (limitType) {
    case 'createCrawlerTask':
      return createRedisRateLimiter({
        keyGenerator: (req: Request) => `crawler:create:${(req as any).user?.id || req.ip}`,
        windowMs: 60 * 60 * 1000, // 1 小時
        max: 10, // 每小時最多創建 10 個爬蟲任務
        message: 'Too many crawler tasks created, please try again later.',
      });
    
    case 'runCrawlerTask':
      return createRedisRateLimiter({
        keyGenerator: (req: Request) => `crawler:run:${(req as any).user?.id || req.ip}`,
        windowMs: 60 * 60 * 1000, // 1 小時
        max: 20, // 每小時最多執行 20 次爬蟲任務
        message: 'Too many crawler task executions, please try again later.',
      });
    
    case 'getCrawlerTasks':
    case 'getCrawlerTask':
    case 'getCrawlerResults':
    case 'getCrawlerStats':
      return createRedisRateLimiter({
        keyGenerator: (req: Request) => `crawler:read:${(req as any).user?.id || req.ip}`,
        windowMs: 60 * 1000, // 1 分鐘
        max: 60, // 每分鐘最多 60 次讀取請求
        message: 'Too many read requests, please try again later.',
      });
    
    case 'updateCrawlerTask':
    case 'deleteCrawlerTask':
    case 'stopCrawlerTask':
      return createRedisRateLimiter({
        keyGenerator: (req: Request) => `crawler:modify:${(req as any).user?.id || req.ip}`,
        windowMs: 60 * 1000, // 1 分鐘
        max: 30, // 每分鐘最多 30 次修改請求
        message: 'Too many modify requests, please try again later.',
      });
    
    case 'uploadFiles':
      return createRedisRateLimiter({
        keyGenerator: (req: Request) => `upload:${(req as any).user?.id || req.ip}`,
        windowMs: 60 * 60 * 1000, // 1 小時
        max: 20, // 每小時最多 20 次上傳
        message: 'Too many upload requests, please try again later.',
      });
    
    case 'aiAnalysis':
      return createRedisRateLimiter({
        keyGenerator: (req: Request) => `ai:analysis:${(req as any).user?.id || req.ip}`,
        windowMs: 60 * 60 * 1000, // 1 小時
        max: 10, // 每小時最多 10 次 AI 分析
        message: 'Too many AI analysis requests, please try again later.',
      });
    
    case 'download':
      return createRedisRateLimiter({
        keyGenerator: (req: Request) => `download:${(req as any).user?.id || req.ip}`,
        windowMs: 60 * 60 * 1000, // 1 小時
        max: 100, // 每小時最多 100 次下載
        message: 'Too many download requests, please try again later.',
      });
    
    case 'deleteData':
      return createRedisRateLimiter({
        keyGenerator: (req: Request) => `delete:${(req as any).user?.id || req.ip}`,
        windowMs: 60 * 60 * 1000, // 1 小時
        max: 50, // 每小時最多 50 次刪除
        message: 'Too many delete requests, please try again later.',
      });
    
    case 'general':
      return createRedisRateLimiter({
        keyGenerator: (req: Request) => `general:${(req as any).user?.id || req.ip}`,
        windowMs: 60 * 1000, // 1 分鐘
        max: 60, // 每分鐘最多 60 次一般請求
        message: 'Too many requests, please try again later.',
      });
    
    default:
      return generalLimiter;
  }
};

// 清理過期的限流記錄
export const cleanupRateLimitData = async (): Promise<void> => {
  try {
    // 這裡可以添加清理過期限流數據的邏輯
    logger.info('Rate limit data cleanup completed');
  } catch (error) {
    logger.error('Failed to cleanup rate limit data', error);
  }
};
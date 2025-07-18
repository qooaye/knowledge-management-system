import Redis from 'ioredis';
import { createLogger } from './logger';

const logger = createLogger('Redis');

// Redis 客戶端配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// 創建 Redis 客戶端
const redis = new Redis(redisConfig);

// 事件監聽
redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (error) => {
  logger.error('Redis error', error);
});

redis.on('close', () => {
  logger.info('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting');
});

// 連接測試
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redis.ping();
    logger.info('Redis connection test successful');
    return true;
  } catch (error) {
    logger.error('Redis connection test failed', error);
    return false;
  }
};

// 緩存操作封裝
export const cache = {
  // 獲取緩存
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', error, { key });
      return null;
    }
  },

  // 設置緩存
  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error', error, { key, ttl });
      return false;
    }
  },

  // 刪除緩存
  async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', error, { key });
      return false;
    }
  },

  // 批量刪除
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await redis.del(...keys);
      return result;
    } catch (error) {
      logger.error('Cache delete pattern error', error, { pattern });
      return 0;
    }
  },

  // 檢查是否存在
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', error, { key });
      return false;
    }
  },

  // 設置過期時間
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      await redis.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Cache expire error', error, { key, ttl });
      return false;
    }
  },

  // 獲取剩餘過期時間
  async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error', error, { key });
      return -1;
    }
  },

  // 原子性增加
  async incr(key: string, increment: number = 1): Promise<number> {
    try {
      return await redis.incrby(key, increment);
    } catch (error) {
      logger.error('Cache increment error', error, { key, increment });
      return 0;
    }
  },

  // 哈希操作
  hash: {
    async get(key: string, field: string): Promise<string | null> {
      try {
        return await redis.hget(key, field);
      } catch (error) {
        logger.error('Cache hash get error', error, { key, field });
        return null;
      }
    },

    async set(key: string, field: string, value: string): Promise<boolean> {
      try {
        await redis.hset(key, field, value);
        return true;
      } catch (error) {
        logger.error('Cache hash set error', error, { key, field });
        return false;
      }
    },

    async getAll(key: string): Promise<Record<string, string>> {
      try {
        return await redis.hgetall(key);
      } catch (error) {
        logger.error('Cache hash getall error', error, { key });
        return {};
      }
    },

    async del(key: string, field: string): Promise<boolean> {
      try {
        await redis.hdel(key, field);
        return true;
      } catch (error) {
        logger.error('Cache hash delete error', error, { key, field });
        return false;
      }
    },
  },

  // 列表操作
  list: {
    async push(key: string, value: any): Promise<number> {
      try {
        return await redis.lpush(key, JSON.stringify(value));
      } catch (error) {
        logger.error('Cache list push error', error, { key });
        return 0;
      }
    },

    async pop(key: string): Promise<any> {
      try {
        const value = await redis.rpop(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        logger.error('Cache list pop error', error, { key });
        return null;
      }
    },

    async length(key: string): Promise<number> {
      try {
        return await redis.llen(key);
      } catch (error) {
        logger.error('Cache list length error', error, { key });
        return 0;
      }
    },

    async range(key: string, start: number = 0, end: number = -1): Promise<any[]> {
      try {
        const values = await redis.lrange(key, start, end);
        return values.map(value => JSON.parse(value));
      } catch (error) {
        logger.error('Cache list range error', error, { key, start, end });
        return [];
      }
    },
  },

  // 集合操作
  setOps: {
    async add(key: string, value: any): Promise<boolean> {
      try {
        await redis.sadd(key, JSON.stringify(value));
        return true;
      } catch (error) {
        logger.error('Cache set add error', error, { key });
        return false;
      }
    },

    async members(key: string): Promise<any[]> {
      try {
        const values = await redis.smembers(key);
        return values.map(value => JSON.parse(value));
      } catch (error) {
        logger.error('Cache set members error', error, { key });
        return [];
      }
    },

    async remove(key: string, value: any): Promise<boolean> {
      try {
        await redis.srem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        logger.error('Cache set remove error', error, { key });
        return false;
      }
    },
  },
};

// 分布式鎖
export const distributedLock = {
  async acquire(key: string, ttl: number = 30): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    
    try {
      const result = await redis.set(lockKey, lockValue, 'EX', ttl, 'NX');
      return result === 'OK' ? lockValue : null;
    } catch (error) {
      logger.error('Distributed lock acquire error', error, { key, ttl });
      return null;
    }
  },

  async release(key: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await redis.eval(script, 1, lockKey, lockValue);
      return result === 1;
    } catch (error) {
      logger.error('Distributed lock release error', error, { key });
      return false;
    }
  },
};

// 限流器
export const rateLimiter = {
  async check(key: string, limit: number, window: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const rateLimitKey = `rate_limit:${key}`;
    
    try {
      const current = await redis.incr(rateLimitKey);
      
      if (current === 1) {
        await redis.expire(rateLimitKey, window);
      }
      
      const ttl = await redis.ttl(rateLimitKey);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      };
    } catch (error) {
      logger.error('Rate limiter check error', error, { key, limit, window });
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + (window * 1000),
      };
    }
  },
};

// 健康檢查
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connected: boolean;
    latency: number;
    error?: string;
  };
}> => {
  const startTime = Date.now();
  
  try {
    await redis.ping();
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      details: {
        connected: true,
        latency,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connected: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
};

// 優雅關閉
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('Redis connection closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connection', error);
  }
};

export default redis;
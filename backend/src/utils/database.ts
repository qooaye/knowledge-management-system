import { PrismaClient } from '@prisma/client';
import { createLogger } from './logger';

const logger = createLogger('Database');

// 創建 Prisma 客戶端實例
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// 監聽資料庫事件
prisma.$on('query', (e) => {
  logger.debug('Database query executed', {
    query: e.query,
    params: e.params,
    duration: e.duration,
  });
});

prisma.$on('error', (e) => {
  logger.error('Database error', e);
});

prisma.$on('info', (e) => {
  logger.info('Database info', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Database warning', e);
});

// 資料庫連接測試
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
    return true;
  } catch (error) {
    logger.error('Database connection failed', error);
    return false;
  }
};

// 優雅關閉資料庫連接
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', error);
  }
};

// 事務輔助函數
export const executeTransaction = async <T>(
  callback: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> => {
  return prisma.$transaction(callback);
};

// 分頁輔助函數
export const createPagination = (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit,
  };
};

// 排序輔助函數
export const createOrderBy = (
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  return {
    [sortBy]: sortOrder,
  };
};

// 搜索輔助函數
export const createSearchFilter = (
  query: string,
  fields: string[]
) => {
  return {
    OR: fields.map(field => ({
      [field]: {
        contains: query,
        mode: 'insensitive' as const,
      },
    })),
  };
};

// 日期範圍過濾器
export const createDateRangeFilter = (
  field: string,
  start?: Date,
  end?: Date
) => {
  const filter: any = {};
  
  if (start || end) {
    filter[field] = {};
    if (start) {
      filter[field].gte = start;
    }
    if (end) {
      filter[field].lte = end;
    }
  }
  
  return filter;
};

// 批量操作輔助函數
export const batchCreate = async <T>(
  model: any,
  data: T[],
  batchSize: number = 100
): Promise<void> => {
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    await model.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
};

// 軟刪除輔助函數
export const softDelete = async (
  model: any,
  id: string
): Promise<void> => {
  await model.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

// 統計輔助函數
export const getModelStats = async (
  model: any,
  groupBy: string
): Promise<any[]> => {
  return model.groupBy({
    by: [groupBy],
    _count: true,
  });
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
    await prisma.$queryRaw`SELECT 1`;
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

export { prisma };
export default prisma;
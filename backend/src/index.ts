import { server } from './app';
import { createLogger } from './utils/logger';
import { testDatabaseConnection, closeDatabaseConnection } from './utils/database';
import { testRedisConnection, closeRedisConnection } from './utils/redis';
import { handleUncaughtException, handleUnhandledRejection } from './middleware/error';

const logger = createLogger('Server');

// 處理未捕獲的異常
handleUncaughtException();
handleUnhandledRejection();

// 啟動服務器
const startServer = async (): Promise<void> => {
  try {
    // 測試資料庫連接
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // 測試 Redis 連接
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      logger.warn('Redis connection failed, some features may not work properly');
    }

    // 啟動 HTTP 服務器
    const PORT = process.env.PORT || 3001;
    
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      });
    });

    // 定期清理任務
    setInterval(async () => {
      try {
        // 清理過期的 refresh tokens
        const { authService } = await import('./services/authService');
        await authService.cleanupExpiredTokens();
      } catch (error) {
        logger.error('Cleanup task failed', error);
      }
    }, 60 * 60 * 1000); // 每小時執行一次

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// 優雅關閉
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // 停止接受新的連接
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // 關閉資料庫連接
      await closeDatabaseConnection();
      
      // 關閉 Redis 連接
      await closeRedisConnection();
      
      logger.info('All connections closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  });

  // 強制關閉超時
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// 監聽關閉信號
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 啟動服務器
startServer();

// 處理 PM2 信號
process.on('message', (message) => {
  if (message === 'shutdown') {
    gracefulShutdown('PM2 shutdown');
  }
});
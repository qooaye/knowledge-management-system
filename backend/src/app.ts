import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

import { createLogger } from './utils/logger';
import { testDatabaseConnection } from './utils/database';
import { testRedisConnection } from './utils/redis';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/error';
import apiRoutes from './routes';

const logger = createLogger('App');

// 創建 Express 應用
const app = express();
const server = createServer(app);

// 創建 Socket.IO 實例
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 安全中間件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS 設定
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 基礎中間件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 限流中間件
app.use(generalLimiter);

// 請求日誌中間件
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
});

// 健康檢查端點
app.get('/health', async (req, res) => {
  const checks = {
    database: await testDatabaseConnection(),
    redis: await testRedisConnection(),
    server: true,
  };

  const isHealthy = Object.values(checks).every(check => check === true);

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API 路由
app.use('/api', apiRoutes);

// 靜態文件服務（上傳的文件）
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static('uploads'));
}

// Socket.IO 連接處理
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  // 用戶加入房間（基於用戶 ID）
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.info('User joined room', { userId, socketId: socket.id });
  });

  // 處理斷開連接
  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// 將 Socket.IO 實例附加到 app 以供其他模塊使用
app.set('io', io);

// 404 處理
app.use(notFoundHandler);

// 錯誤處理中間件
app.use(errorHandler);

// 導出 app 和 server
export { app, server, io };
export default app;
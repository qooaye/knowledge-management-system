import { Router } from 'express';
import authRoutes from './authRoutes';
import documentRoutes from './documentRoutes';
import aiRoutes from './ai';
import crawlerRoutes from './crawler';
import knowledgeRoutes from './knowledgeRoutes';
import aiAnalysisRoutes from './aiAnalysisRoutes';
import batchAnalysisRoutes from './batchAnalysisRoutes';

const router = Router();

// API 版本
const API_VERSION = process.env.API_VERSION || 'v1';

// 健康檢查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Knowledge Management System API is running',
    version: API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// 路由註冊
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/ai', aiRoutes);
router.use('/ai-analysis', aiAnalysisRoutes);
router.use('/batch-analysis', batchAnalysisRoutes);
router.use('/crawler', crawlerRoutes);
router.use('/knowledge-cards', knowledgeRoutes);

export default router;
import express from 'express';
import { knowledgeController } from '../controllers/knowledgeController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = express.Router();

// 驗證 schemas
const createKnowledgeCardSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    content: z.string().min(1, 'Content is required'),
    category: z.string().min(1, 'Category is required'),
    tags: z.array(z.string()).optional().default([]),
    sourceDocumentId: z.string().optional(),
    sourceCrawlerResultId: z.string().optional(),
  }),
});

const updateKnowledgeCardSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const searchKnowledgeCardsSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    category: z.string().optional(),
    tags: z.string().optional(),
    limit: z.string().transform(Number).optional(),
    offset: z.string().transform(Number).optional(),
  }),
});

// 應用認證中間件到所有路由
router.use(authenticateToken);

// GET /api/knowledge-cards - 獲取知識卡片列表
router.get('/', knowledgeController.getKnowledgeCards);

// POST /api/knowledge-cards - 創建知識卡片
router.post('/', validateRequest(createKnowledgeCardSchema), knowledgeController.createKnowledgeCard);

// GET /api/knowledge-cards/search - 搜索知識卡片
router.get('/search', validateRequest(searchKnowledgeCardsSchema), knowledgeController.searchKnowledgeCards);

// GET /api/knowledge-cards/connections - 獲取知識卡片關聯
router.get('/connections', knowledgeController.getKnowledgeConnections);

// GET /api/knowledge-cards/:id - 獲取單個知識卡片
router.get('/:id', knowledgeController.getKnowledgeCard);

// PUT /api/knowledge-cards/:id - 更新知識卡片
router.put('/:id', validateRequest(updateKnowledgeCardSchema), knowledgeController.updateKnowledgeCard);

// DELETE /api/knowledge-cards/:id - 刪除知識卡片
router.delete('/:id', knowledgeController.deleteKnowledgeCard);

export default router;
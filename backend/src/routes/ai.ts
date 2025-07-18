import express from 'express';
import { aiController } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// AI 服務專用的速率限制
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 每個 IP 每 15 分鐘最多 100 次請求
  message: {
    success: false,
    error: '請求太頻繁，請稍後再試',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 高消耗的 AI 操作更嚴格的限制
const heavyAIRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 20, // 每個 IP 每 15 分鐘最多 20 次請求
  message: {
    success: false,
    error: 'AI 分析請求太頻繁，請稍後再試',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 批量操作的限制
const batchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 每個 IP 每 15 分鐘最多 5 次批量請求
  message: {
    success: false,
    error: '批量分析請求太頻繁，請稍後再試',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 中間件：檢查 AI 服務可用性
const checkAIAvailability = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 這個檢查會在控制器中進行，這裡只是作為示例
  next();
};

/**
 * @swagger
 * /api/ai/status:
 *   get:
 *     summary: 獲取 AI 服務狀態
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: AI 服務狀態
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: boolean
 *                     model:
 *                       type: string
 *                     features:
 *                       type: object
 */
router.get('/status', aiRateLimit, aiController.getStatus);

/**
 * @swagger
 * /api/ai/analyze:
 *   post:
 *     summary: 分析文檔內容
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 要分析的文檔內容
 *               title:
 *                 type: string
 *                 description: 文檔標題
 *               documentType:
 *                 type: string
 *                 description: 文檔類型
 *               maxSummaryLength:
 *                 type: number
 *                 minimum: 50
 *                 maximum: 1000
 *                 description: 摘要最大長度
 *               maxKeywords:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 20
 *                 description: 最大關鍵詞數量
 *               maxTags:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 15
 *                 description: 最大標籤數量
 *     responses:
 *       200:
 *         description: 分析結果
 *       400:
 *         description: 請求參數無效
 *       401:
 *         description: 未授權
 *       503:
 *         description: AI 服務不可用
 */
router.post('/analyze', authenticateToken, heavyAIRateLimit, checkAIAvailability, aiController.analyzeDocument);

/**
 * @swagger
 * /api/ai/analyze/{documentId}:
 *   post:
 *     summary: 根據文檔 ID 分析文檔
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 文檔 ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxSummaryLength:
 *                 type: number
 *                 minimum: 50
 *                 maximum: 1000
 *               maxKeywords:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 20
 *               maxTags:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 15
 *     responses:
 *       200:
 *         description: 分析結果
 *       404:
 *         description: 文檔不存在
 *       503:
 *         description: AI 服務不可用
 */
router.post('/analyze/:documentId', authenticateToken, heavyAIRateLimit, checkAIAvailability, aiController.analyzeDocumentById);

/**
 * @swagger
 * /api/ai/summary:
 *   post:
 *     summary: 生成文檔摘要
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 要生成摘要的內容
 *               maxLength:
 *                 type: number
 *                 minimum: 50
 *                 maximum: 1000
 *                 description: 摘要最大長度
 *               language:
 *                 type: string
 *                 description: 語言代碼
 *     responses:
 *       200:
 *         description: 摘要生成成功
 *       400:
 *         description: 請求參數無效
 *       503:
 *         description: AI 服務不可用
 */
router.post('/summary', authenticateToken, heavyAIRateLimit, checkAIAvailability, aiController.generateSummary);

/**
 * @swagger
 * /api/ai/keywords:
 *   post:
 *     summary: 提取關鍵詞
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 要提取關鍵詞的內容
 *               maxKeywords:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 20
 *                 description: 最大關鍵詞數量
 *     responses:
 *       200:
 *         description: 關鍵詞提取成功
 *       400:
 *         description: 請求參數無效
 *       503:
 *         description: AI 服務不可用
 */
router.post('/keywords', authenticateToken, aiRateLimit, checkAIAvailability, aiController.extractKeywords);

/**
 * @swagger
 * /api/ai/tags:
 *   post:
 *     summary: 生成標籤
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 要生成標籤的內容
 *               maxTags:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 15
 *                 description: 最大標籤數量
 *     responses:
 *       200:
 *         description: 標籤生成成功
 *       400:
 *         description: 請求參數無效
 *       503:
 *         description: AI 服務不可用
 */
router.post('/tags', authenticateToken, aiRateLimit, checkAIAvailability, aiController.generateTags);

/**
 * @swagger
 * /api/ai/sentiment:
 *   post:
 *     summary: 分析情感
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 要分析情感的內容
 *     responses:
 *       200:
 *         description: 情感分析成功
 *       400:
 *         description: 請求參數無效
 *       503:
 *         description: AI 服務不可用
 */
router.post('/sentiment', authenticateToken, aiRateLimit, checkAIAvailability, aiController.analyzeSentiment);

/**
 * @swagger
 * /api/ai/batch:
 *   post:
 *     summary: 批量分析文檔
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requests
 *             properties:
 *               requests:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   required:
 *                     - content
 *                   properties:
 *                     content:
 *                       type: string
 *                     title:
 *                       type: string
 *                     documentType:
 *                       type: string
 *                     maxSummaryLength:
 *                       type: number
 *                     maxKeywords:
 *                       type: number
 *                     maxTags:
 *                       type: number
 *     responses:
 *       200:
 *         description: 批量分析成功
 *       400:
 *         description: 請求參數無效
 *       503:
 *         description: AI 服務不可用
 */
router.post('/batch', authenticateToken, batchRateLimit, checkAIAvailability, aiController.analyzeBatch);

export default router;
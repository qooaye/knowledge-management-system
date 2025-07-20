import { Router } from 'express';
import { aiAnalysisController } from '../controllers/aiAnalysisController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有路由都需要認證
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     AIAnalysisResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 分析結果ID
 *         title:
 *           type: string
 *           description: 分析標題
 *         summary:
 *           type: string
 *           description: 分析摘要
 *         keywords:
 *           type: string
 *           description: 關鍵詞（逗號分隔）
 *         categories:
 *           type: string
 *           description: 分類標籤（逗號分隔）
 *         analysisType:
 *           type: string
 *           enum: [single, batch]
 *           description: 分析類型
 *         indexKey:
 *           type: string
 *           description: 索引鍵
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 */

/**
 * @swagger
 * /api/ai-analysis/upload:
 *   post:
 *     summary: 上傳文件並進行AI分析
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 要分析的文件（支援PDF、Word、Excel、TXT、圖片等）
 *     responses:
 *       200:
 *         description: 分析成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     analysisId:
 *                       type: string
 *                     fileCount:
 *                       type: number
 *                     analysisType:
 *                       type: string
 */
router.post('/upload', aiAnalysisController.uploadAndAnalyze);

/**
 * @swagger
 * /api/ai-analysis:
 *   get:
 *     summary: 獲取AI分析結果列表
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 頁碼
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每頁數量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索關鍵詞
 *     responses:
 *       200:
 *         description: 獲取成功
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
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AIAnalysisResult'
 *                     pagination:
 *                       type: object
 */
router.get('/', aiAnalysisController.getAnalysisResults);

/**
 * @swagger
 * /api/ai-analysis/{id}:
 *   get:
 *     summary: 獲取單個AI分析結果
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 分析結果ID
 *     responses:
 *       200:
 *         description: 獲取成功
 *       404:
 *         description: 分析結果不存在
 */
router.get('/:id', aiAnalysisController.getAnalysisResult);

/**
 * @swagger
 * /api/ai-analysis/{id}/download:
 *   get:
 *     summary: 下載Markdown格式的分析結果
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 分析結果ID
 *     responses:
 *       200:
 *         description: 下載成功
 *         content:
 *           text/markdown:
 *             schema:
 *               type: string
 *       404:
 *         description: 分析結果不存在
 */
router.get('/:id/download', aiAnalysisController.downloadMarkdown);

/**
 * @swagger
 * /api/ai-analysis/{id}:
 *   delete:
 *     summary: 刪除AI分析結果
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 分析結果ID
 *     responses:
 *       200:
 *         description: 刪除成功
 *       404:
 *         description: 分析結果不存在
 */
router.delete('/:id', aiAnalysisController.deleteAnalysisResult);

export default router;
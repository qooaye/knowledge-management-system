import { Router } from 'express';
import { crawlerController } from '../controllers/crawlerController';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// 應用認證中間件
router.use(authenticateToken);

// 創建爬蟲任務 - 較嚴格的限制
router.post('/tasks', rateLimiter('createCrawlerTask'), crawlerController.createTask);

// 獲取用戶的爬蟲任務列表
router.get('/tasks', rateLimiter('getCrawlerTasks'), crawlerController.getTasks);

// 獲取單個爬蟲任務詳情
router.get('/tasks/:id', rateLimiter('getCrawlerTask'), crawlerController.getTask);

// 更新爬蟲任務
router.put('/tasks/:id', rateLimiter('updateCrawlerTask'), crawlerController.updateTask);

// 刪除爬蟲任務
router.delete('/tasks/:id', rateLimiter('deleteCrawlerTask'), crawlerController.deleteTask);

// 立即執行爬蟲任務 - 較嚴格的限制
router.post('/tasks/:id/run', rateLimiter('runCrawlerTask'), crawlerController.runTask);

// 停止爬蟲任務
router.post('/tasks/:id/stop', rateLimiter('stopCrawlerTask'), crawlerController.stopTask);

// 獲取爬蟲結果
router.get('/tasks/:id/results', rateLimiter('getCrawlerResults'), crawlerController.getResults);

// 獲取統計信息
router.get('/stats', rateLimiter('getCrawlerStats'), crawlerController.getStats);

export default router;
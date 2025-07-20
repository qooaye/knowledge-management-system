import { Router } from 'express';
import { 
  uploadBatchFiles,
  performBatchAnalysis,
  getAnalysisList,
  getAnalysisDetail,
  downloadMarkdown,
  deleteAnalysis
} from '../controllers/batchAnalysisController';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// 所有路由都需要認證
router.use(authenticateToken);

// 批次上傳文件
router.post('/upload', 
  rateLimiter('uploadFiles'),
  uploadBatchFiles
);

// 執行 AI 批次分析
router.post('/analyze',
  rateLimiter('aiAnalysis'),
  performBatchAnalysis
);

// 獲取 AI 分析列表
router.get('/list',
  rateLimiter('general'),
  getAnalysisList
);

// 獲取單個 AI 分析詳情
router.get('/:id',
  rateLimiter('general'),
  getAnalysisDetail
);

// 下載 Markdown 格式
router.get('/:id/download',
  rateLimiter('download'),
  downloadMarkdown
);

// 刪除 AI 分析記錄
router.delete('/:id',
  rateLimiter('deleteData'),
  deleteAnalysis
);

export default router;
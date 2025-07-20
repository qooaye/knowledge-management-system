import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { claudeAnalysisService, FileContent } from '../services/claudeAnalysisService';
import { documentService } from '../services/documentService';

// 配置文件上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // 最多10個文件
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
      'text/html',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支援的文件類型: ${file.mimetype}`));
    }
  }
});

class AIAnalysisController {
  /**
   * 上傳文件並進行AI分析
   */
  async uploadAndAnalyze(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: '未授權' });
      }

      // 處理文件上傳
      const uploadMiddleware = upload.array('files', 10);
      
      uploadMiddleware(req, res, async (err) => {
        if (err) {
          console.error('文件上傳錯誤:', err);
          return res.status(400).json({ 
            success: false, 
            message: `文件上傳失敗: ${err.message}` 
          });
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ 
            success: false, 
            message: '沒有上傳任何文件' 
          });
        }

        try {
          // 提取文件內容
          const fileContents: FileContent[] = [];
          
          for (const file of files) {
            try {
              const fileBuffer = fs.readFileSync(file.path);
              const result = await documentService.processDocument(fileBuffer, file.mimetype, file.originalname);
              const content = result.content || '';
              fileContents.push({
                fileName: file.filename,
                originalName: file.originalname,
                content: content,
                fileType: file.mimetype,
                size: file.size
              });
            } catch (error) {
              console.error(`提取文件內容失敗 ${file.originalname}:`, error);
              // 繼續處理其他文件，不讓單個文件錯誤中斷整個流程
              fileContents.push({
                fileName: file.filename,
                originalName: file.originalname,
                content: `無法提取內容: ${(error as Error).message}`,
                fileType: file.mimetype,
                size: file.size
              });
            }
          }

          // 清理臨時文件
          files.forEach(file => {
            try {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (error) {
              console.error('清理臨時文件失敗:', error);
            }
          });

          // 判斷分析類型
          const analysisType = fileContents.length > 1 ? 'batch' : 'single';

          // 進行AI分析
          const analysisId = await claudeAnalysisService.analyzeFiles(
            fileContents, 
            userId, 
            analysisType
          );

          res.json({
            success: true,
            message: 'AI分析完成',
            data: {
              analysisId,
              fileCount: fileContents.length,
              analysisType
            }
          });

        } catch (error) {
          console.error('AI分析失敗:', error);
          
          // 清理臨時文件
          files.forEach(file => {
            try {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (cleanupError) {
              console.error('清理臨時文件失敗:', cleanupError);
            }
          });

          res.status(500).json({
            success: false,
            message: `AI分析失敗: ${(error as Error).message}`
          });
        }
      });

    } catch (error) {
      console.error('處理請求失敗:', error);
      res.status(500).json({
        success: false,
        message: `處理請求失敗: ${(error as Error).message}`
      });
    }
  }

  /**
   * 獲取AI分析結果列表
   */
  async getAnalysisResults(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: '未授權' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      let results;
      if (search) {
        results = await claudeAnalysisService.searchAnalysisResults(userId, search, page, limit);
      } else {
        results = await claudeAnalysisService.getAnalysisResults(userId, page, limit);
      }

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('獲取分析結果失敗:', error);
      res.status(500).json({
        success: false,
        message: `獲取分析結果失敗: ${(error as Error).message}`
      });
    }
  }

  /**
   * 獲取單個AI分析結果
   */
  async getAnalysisResult(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: '未授權' });
      }

      const { id } = req.params;
      const result = await claudeAnalysisService.getAnalysisResult(id, userId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('獲取分析結果失敗:', error);
      res.status(404).json({
        success: false,
        message: `獲取分析結果失敗: ${(error as Error).message}`
      });
    }
  }

  /**
   * 下載Markdown格式的分析結果
   */
  async downloadMarkdown(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: '未授權' });
      }

      const { id } = req.params;
      const result = await claudeAnalysisService.getAnalysisResult(id, userId);

      // 設置下載headers
      const filename = `AI分析報告_${result.indexKey}.md`;
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      res.send(result.markdownContent);

    } catch (error) {
      console.error('下載Markdown失敗:', error);
      res.status(404).json({
        success: false,
        message: `下載失敗: ${(error as Error).message}`
      });
    }
  }

  /**
   * 刪除AI分析結果
   */
  async deleteAnalysisResult(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: '未授權' });
      }

      const { id } = req.params;
      await claudeAnalysisService.deleteAnalysisResult(id, userId);

      res.json({
        success: true,
        message: '分析結果已刪除'
      });

    } catch (error) {
      console.error('刪除分析結果失敗:', error);
      res.status(404).json({
        success: false,
        message: `刪除失敗: ${(error as Error).message}`
      });
    }
  }
}

export const aiAnalysisController = new AIAnalysisController();
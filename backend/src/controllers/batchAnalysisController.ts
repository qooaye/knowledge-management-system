import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { claudeAnalysisService } from '../services/claudeAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import pdf from 'pdf-parse';

const prisma = new PrismaClient();
const logger = createLogger('BatchAnalysisController');

// 配置文件上傳
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads/batch');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 20 // 最多 20 個文件
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
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支援的文件格式: ${file.mimetype}`));
    }
  }
});

/**
 * 文本提取函數
 */
async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  try {
    switch (mimeType) {
      case 'text/plain':
      case 'text/markdown':
      case 'text/html':
        return await fs.readFile(filePath, 'utf-8');
      
      case 'application/pdf':
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(pdfBuffer);
        return pdfData.text;
      
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docBuffer = await fs.readFile(filePath);
        const docResult = await mammoth.extractRawText({ buffer: docBuffer });
        return docResult.value;
      
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        const workbook = XLSX.readFile(filePath);
        let excelText = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          excelText += XLSX.utils.sheet_to_txt(sheet) + '\n';
        });
        return excelText;
      
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
        // 對於圖片，返回文件名和基本信息
        return `圖片文件: ${path.basename(filePath)}`;
      
      default:
        throw new Error(`不支援的文件類型: ${mimeType}`);
    }
  } catch (error) {
    logger.error('文本提取失敗', { filePath, mimeType, error });
    throw new Error(`無法從文件提取文本: ${error}`);
  }
}

/**
 * 批次上傳文件
 */
export const uploadBatchFiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    
    // 使用 multer 處理文件上傳
    upload.array('files', 20)(req, res, async (err) => {
      if (err) {
        logger.error('文件上傳失敗', err);
        return res.status(400).json({
          success: false,
          message: `文件上傳失敗: ${err.message}`
        });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '請選擇要上傳的文件'
        });
      }

      // 為這批文件創建一個唯一的分析標識
      const batchId = uuidv4();
      const indexKey = `batch_${Date.now()}_${batchId.substring(0, 8)}`;

      try {
        // 提取所有文件的文本內容
        const extractedFiles: Array<{
          fileName: string;
          originalName: string;
          fileType: string;
          size: number;
          path: string;
          extractedText: string;
        }> = [];

        for (const file of files) {
          try {
            const extractedText = await extractTextFromFile(file.path, file.mimetype);
            extractedFiles.push({
              fileName: file.filename,
              originalName: file.originalname,
              fileType: file.mimetype,
              size: file.size,
              path: file.path,
              extractedText
            });
          } catch (error) {
            logger.error('文件文本提取失敗', { file: file.originalname, error });
            // 繼續處理其他文件，但記錄錯誤
            extractedFiles.push({
              fileName: file.filename,
              originalName: file.originalname,
              fileType: file.mimetype,
              size: file.size,
              path: file.path,
              extractedText: `文本提取失敗: ${error}`
            });
          }
        }

        res.json({
          success: true,
          message: `成功上傳 ${files.length} 個文件`,
          data: {
            batchId,
            indexKey,
            fileCount: files.length,
            files: extractedFiles.map(f => ({
              fileName: f.fileName,
              originalName: f.originalName,
              fileType: f.fileType,
              size: f.size
            }))
          }
        });

      } catch (error) {
        logger.error('批次文件處理失敗', error);
        
        // 清理已上傳的文件
        await Promise.all(files.map(async (file) => {
          try {
            await fs.unlink(file.path);
          } catch (cleanupError) {
            logger.error('清理文件失敗', { file: file.path, error: cleanupError });
          }
        }));

        res.status(500).json({
          success: false,
          message: '文件處理失敗'
        });
      }
    });

  } catch (error) {
    logger.error('批次上傳控制器錯誤', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
};

/**
 * 執行 AI 批次分析
 */
export const performBatchAnalysis = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { batchId, indexKey, title } = req.body;

    if (!batchId || !indexKey) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的參數'
      });
    }

    // 查找上傳的文件
    const uploadDir = path.join(process.cwd(), 'uploads/batch');
    const files = await fs.readdir(uploadDir);
    const batchFiles = files.filter(f => f.includes(batchId.substring(0, 8)));

    if (batchFiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到相關的上傳文件'
      });
    }

    // 提取所有文件的文本內容
    let combinedText = '';
    const fileDetails: any[] = [];

    for (const fileName of batchFiles) {
      try {
        const filePath = path.join(uploadDir, fileName);
        const stats = await fs.stat(filePath);
        
        // 根據文件擴展名判斷 MIME 類型
        const ext = path.extname(fileName).toLowerCase();
        let mimeType = 'text/plain';
        
        const mimeMap: { [key: string]: string } = {
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.xls': 'application/vnd.ms-excel',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.txt': 'text/plain',
          '.md': 'text/markdown',
          '.html': 'text/html',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        
        if (mimeMap[ext]) {
          mimeType = mimeMap[ext];
        }

        const extractedText = await extractTextFromFile(filePath, mimeType);
        combinedText += `\n\n=== 文件: ${fileName} ===\n${extractedText}\n`;
        
        fileDetails.push({
          fileName,
          originalName: fileName,
          fileType: mimeType,
          size: stats.size,
          path: filePath,
          extractedText
        });
      } catch (error) {
        logger.error('文件處理失敗', { fileName, error });
      }
    }

    if (!combinedText.trim()) {
      return res.status(400).json({
        success: false,
        message: '無法從上傳的文件中提取文本內容'
      });
    }

    // 準備文件內容用於分析
    const filesForAnalysis = fileDetails.map((file, index) => ({
      fileName: file.fileName,
      originalName: file.originalName,
      content: file.extractedText || '',
      fileType: file.fileType,
      size: file.size
    }));

    // 調用 Claude AI 進行分析
    const analysisId = await claudeAnalysisService.analyzeFiles(
      filesForAnalysis,
      userId,
      'batch'
    );

    // 獲取剛創建的分析結果
    const analysisResult = await claudeAnalysisService.getAnalysisResult(analysisId, userId);

    // 如果提供了自訂標題，更新分析結果
    if (title && title !== analysisResult.title) {
      await prisma.aIAnalysis.update({
        where: { id: analysisId },
        data: { title }
      });
    }

    res.json({
      success: true,
      message: 'AI 分析完成',
      data: {
        analysisId: analysisResult.id,
        indexKey: analysisResult.indexKey,
        title: title || analysisResult.title,
        summary: analysisResult.summary,
        keyPoints: analysisResult.keyPoints,
        insights: analysisResult.insights,
        keywords: analysisResult.keywords,
        categories: analysisResult.categories,
        fileCount: fileDetails.length,
        createdAt: analysisResult.createdAt
      }
    });

  } catch (error) {
    logger.error('AI 批次分析失敗', error);
    res.status(500).json({
      success: false,
      message: 'AI 分析失敗'
    });
  }
};

/**
 * 獲取 AI 分析列表
 */
export const getAnalysisList = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { page = 1, limit = 10, search, category } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { userId };
    
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { summary: { contains: search as string } },
        { keywords: { contains: search as string } },
        { indexKey: { contains: search as string } },
        { keyPoints: { contains: search as string } },
        { insights: { contains: search as string } }
      ];
    }
    
    if (category) {
      where.categories = { contains: category as string };
    }

    const [analyses, total] = await Promise.all([
      prisma.aIAnalysis.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          originalFiles: {
            select: {
              originalName: true,
              fileType: true,
              size: true
            }
          }
        }
      }),
      prisma.aIAnalysis.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        analyses,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('獲取分析列表失敗', error);
    res.status(500).json({
      success: false,
      message: '獲取分析列表失敗'
    });
  }
};

/**
 * 獲取單個 AI 分析詳情
 */
export const getAnalysisDetail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { id } = req.params;

    const analysis = await prisma.aIAnalysis.findFirst({
      where: {
        id,
        userId
      },
      include: {
        originalFiles: true
      }
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: '找不到該分析記錄'
      });
    }

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('獲取分析詳情失敗', error);
    res.status(500).json({
      success: false,
      message: '獲取分析詳情失敗'
    });
  }
};

/**
 * 下載 Markdown 格式
 */
export const downloadMarkdown = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { id } = req.params;

    const analysis = await prisma.aIAnalysis.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: '找不到該分析記錄'
      });
    }

    // 設置下載標頭
    const fileName = `${analysis.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${analysis.indexKey}.md`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    
    res.send(analysis.markdownContent);

  } catch (error) {
    logger.error('下載 Markdown 失敗', error);
    res.status(500).json({
      success: false,
      message: '下載失敗'
    });
  }
};

/**
 * 刪除 AI 分析記錄
 */
export const deleteAnalysis = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { id } = req.params;

    const analysis = await prisma.aIAnalysis.findFirst({
      where: {
        id,
        userId
      },
      include: {
        originalFiles: true
      }
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: '找不到該分析記錄'
      });
    }

    // 刪除相關文件
    await Promise.all(analysis.originalFiles.map(async (file) => {
      try {
        if (file.path) {
          await fs.unlink(file.path);
        }
      } catch (error) {
        logger.error('刪除文件失敗', { filePath: file.path, error });
      }
    }));

    // 刪除資料庫記錄
    await prisma.aIAnalysis.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: '分析記錄已刪除'
    });

  } catch (error) {
    logger.error('刪除分析記錄失敗', error);
    res.status(500).json({
      success: false,
      message: '刪除失敗'
    });
  }
};
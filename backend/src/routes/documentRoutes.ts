import { Router } from 'express';
import { z } from 'zod';
import { upload, uploadErrorHandler, validateFile, generateFileName, getFileCategory } from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { documentService } from '../services/documentService';
import { storageService } from '../services/storageService';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
// DocumentStatus is string type in schema
const DocumentStatus = {
  UPLOADING: 'UPLOADING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  ERROR: 'ERROR',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const;

const router = Router();

// 上傳文件驗證 schema
const uploadDocumentSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.string().optional(),
    category: z.string().optional(),
  }),
});

// 獲取文件列表驗證 schema
const getDocumentsSchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED']).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'size']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * 上傳單個文件
 */
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  validate(uploadDocumentSchema),
  async (req, res) => {
    try {
      const { title, description, tags, category } = req.body;
      const file = req.file;
      const userId = (req as any).user!.id;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: '請選擇要上傳的文件',
        });
      }

      // 驗證文件
      const validation = validateFile(file);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      // 生成文件名和存儲路徑
      const fileName = generateFileName(file.originalname, userId);
      const fileCategory = getFileCategory(file.mimetype);

      // 創建文件記錄
      const document = await prisma.document.create({
        data: {
          title: title || file.originalname,
          description: description || '',
          originalName: file.originalname,
          fileName,
          mimeType: file.mimetype,
          size: file.size,
          path: `/uploads/${fileName}`,
          category: category || fileCategory,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          status: DocumentStatus.PROCESSING,
          userId,
        },
      });

      // 上傳到存儲
      const uploadResult = await storageService.uploadFile(
        fileName,
        file.buffer,
        file.mimetype,
        {
          userId,
          documentId: document.id,
          originalName: file.originalname,
        }
      );

      if (!uploadResult.success) {
        // 如果上傳失敗，刪除資料庫記錄
        await prisma.document.delete({
          where: { id: document.id },
        });

        return res.status(500).json({
          success: false,
          message: '文件上傳失敗',
          error: uploadResult.error,
        });
      }

      // 處理文件內容
      const processingResult = await documentService.processDocument(
        file.buffer,
        file.mimetype,
        file.originalname
      );

      // 更新文件記錄
      const updatedDocument = await prisma.document.update({
        where: { id: document.id },
        data: {
          storageUrl: uploadResult.url,
          status: processingResult.success ? DocumentStatus.COMPLETED : DocumentStatus.FAILED,
          content: processingResult.content || '',
          metadata: JSON.stringify(processingResult.metadata || {}),
          processingError: processingResult.error,
        },
      });

      logger.info(`文件上傳成功: ${fileName}`, {
        userId,
        documentId: document.id,
        fileName,
      });

      res.json({
        success: true,
        message: '文件上傳成功',
        data: {
          id: updatedDocument.id,
          title: updatedDocument.title,
          fileName: updatedDocument.fileName,
          originalName: updatedDocument.originalName,
          size: updatedDocument.size,
          category: updatedDocument.category,
          status: updatedDocument.status,
          processingResult: {
            success: processingResult.success,
            hasContent: !!processingResult.content,
            error: processingResult.error,
          },
        },
      });
    } catch (error) {
      logger.error('文件上傳處理失敗:', error);
      res.status(500).json({
        success: false,
        message: '文件上傳處理失敗',
        error: error instanceof Error ? error.message : '未知錯誤',
      });
    }
  }
);

/**
 * 批量上傳文件
 */
router.post(
  '/upload/batch',
  authenticateToken,
  upload.array('files', 10),
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const userId = (req as any).user!.id;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '請選擇要上傳的文件',
        });
      }

      const results = [];

      for (const file of files) {
        try {
          // 驗證文件
          const validation = validateFile(file);
          if (!validation.isValid) {
            results.push({
              originalName: file.originalname,
              success: false,
              error: validation.error,
            });
            continue;
          }

          // 生成文件名和存儲路徑
          const fileName = generateFileName(file.originalname, userId);
          const fileCategory = getFileCategory(file.mimetype);

          // 創建文件記錄
          const document = await prisma.document.create({
            data: {
              title: file.originalname,
              originalName: file.originalname,
              fileName,
              mimeType: file.mimetype,
              size: file.size,
              path: `/uploads/${fileName}`,
              category: fileCategory,
              tags: '',
              status: DocumentStatus.PROCESSING,
              user: {
                connect: { id: userId }
              },
            },
          });

          // 上傳到存儲
          const uploadResult = await storageService.uploadFile(
            fileName,
            file.buffer,
            file.mimetype,
            {
              userId,
              documentId: document.id,
              originalName: file.originalname,
            }
          );

          if (!uploadResult.success) {
            await prisma.document.delete({
              where: { id: document.id },
            });

            results.push({
              originalName: file.originalname,
              success: false,
              error: uploadResult.error,
            });
            continue;
          }

          // 處理文件內容
          const processingResult = await documentService.processDocument(
            file.buffer,
            file.mimetype,
            file.originalname
          );

          // 更新文件記錄
          await prisma.document.update({
            where: { id: document.id },
            data: {
              storageUrl: uploadResult.url,
              status: processingResult.success ? DocumentStatus.COMPLETED : DocumentStatus.FAILED,
              content: processingResult.content || '',
              metadata: JSON.stringify(processingResult.metadata || {}),
              processingError: processingResult.error,
            },
          });

          results.push({
            originalName: file.originalname,
            success: true,
            documentId: document.id,
          });
        } catch (error) {
          logger.error(`處理文件 ${file.originalname} 失敗:`, error);
          results.push({
            originalName: file.originalname,
            success: false,
            error: error instanceof Error ? error.message : '未知錯誤',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      res.json({
        success: true,
        message: `批量上傳完成: ${successCount} 成功, ${failCount} 失敗`,
        data: {
          results,
          summary: {
            total: files.length,
            success: successCount,
            failed: failCount,
          },
        },
      });
    } catch (error) {
      logger.error('批量文件上傳失敗:', error);
      res.status(500).json({
        success: false,
        message: '批量文件上傳失敗',
        error: error instanceof Error ? error.message : '未知錯誤',
      });
    }
  }
);

/**
 * 獲取文件列表
 */
router.get(
  '/',
  authenticateToken,
  validate(getDocumentsSchema),
  async (req, res) => {
    try {
      const { page, limit, search, category, status, sortBy, sortOrder } = req.query;
      const userId = (req as any).user!.id;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      const where: any = { userId };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { originalName: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (status) {
        where.status = status;
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip: offset,
          take: limitNum,
          orderBy: {
            [sortBy as string]: sortOrder,
          },
          select: {
            id: true,
            title: true,
            description: true,
            originalName: true,
            fileName: true,
            mimeType: true,
            size: true,
            category: true,
            tags: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            metadata: true,
            processingError: true,
          },
        }),
        prisma.document.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          documents,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error('獲取文件列表失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取文件列表失敗',
        error: error instanceof Error ? error.message : '未知錯誤',
      });
    }
  }
);

/**
 * 獲取單個文件詳情
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文件不存在',
      });
    }

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    logger.error('獲取文件詳情失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取文件詳情失敗',
      error: error instanceof Error ? error.message : '未知錯誤',
    });
  }
});

/**
 * 更新文件信息
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags, category } = req.body;
    const userId = (req as any).user!.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文件不存在',
      });
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        title: title || document.title,
        description: description !== undefined ? description : document.description,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : document.tags,
        category: category || document.category,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: '文件信息更新成功',
      data: updatedDocument,
    });
  } catch (error) {
    logger.error('更新文件信息失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新文件信息失敗',
      error: error instanceof Error ? error.message : '未知錯誤',
    });
  }
});

/**
 * 刪除文件
 */
/**
 * 分析單個文件 - 統一使用AI分析系統
 */
router.post('/:id/analyze', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = (req as any).user!.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文件不存在',
      });
    }

    if (document.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: '文件尚未處理完成，無法進行分析',
      });
    }

    if (!document.content) {
      return res.status(400).json({
        success: false,
        message: '文件內容為空，無法進行分析',
      });
    }

    // 使用統一的AI分析服務
    const { claudeAnalysisService } = await import('../services/claudeAnalysisService');
    
    // 準備文件用於分析
    const filesForAnalysis = [{
      fileName: document.fileName,
      originalName: document.originalName,
      content: document.content,
      fileType: document.mimeType,
      size: document.size
    }];

    // 調用統一的AI分析服務
    const analysisId = await claudeAnalysisService.analyzeFiles(
      filesForAnalysis,
      userId,
      'single'
    );

    // 獲取分析結果
    const analysisResult = await claudeAnalysisService.getAnalysisResult(analysisId, userId);

    // 如果提供了自訂標題，更新分析結果
    if (title && title !== analysisResult.title) {
      await prisma.aIAnalysis.update({
        where: { id: analysisId },
        data: { 
          title,
          updatedAt: new Date()
        }
      });
    }

    // 更新原始文件狀態
    await prisma.document.update({
      where: { id },
      data: {
        status: 'ANALYZED',
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: '文件AI分析完成',
      data: {
        analysisId: analysisResult.id,
        indexKey: analysisResult.indexKey,
        title: title || analysisResult.title,
        summary: analysisResult.summary,
        keyPoints: analysisResult.keyPoints,
        insights: analysisResult.insights,
        keywords: analysisResult.keywords,
        categories: analysisResult.categories,
        markdownContent: analysisResult.markdownContent,
        createdAt: analysisResult.createdAt,
        downloadUrl: `/api/batch-analysis/${analysisId}/download`
      },
    });
  } catch (error) {
    console.error('文件分析失敗:', error);
    res.status(500).json({
      success: false,
      message: '文件分析失敗',
      error: error instanceof Error ? error.message : '未知錯誤',
    });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文件不存在',
      });
    }

    // 從存儲中刪除文件
    if (document.fileName) {
      await storageService.deleteFile(document.fileName);
    }

    // 從資料庫中刪除記錄
    await prisma.document.delete({
      where: { id },
    });

    logger.info(`文件刪除成功: ${document.fileName}`, {
      userId,
      documentId: id,
    });

    res.json({
      success: true,
      message: '文件刪除成功',
    });
  } catch (error) {
    logger.error('刪除文件失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除文件失敗',
      error: error instanceof Error ? error.message : '未知錯誤',
    });
  }
});

/**
 * 獲取文件下載 URL
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: '文件不存在',
      });
    }

    if (!document.fileName) {
      return res.status(400).json({
        success: false,
        message: '文件未完成上傳',
      });
    }

    const downloadUrl = await storageService.getFileUrl(document.fileName, 3600); // 1小時有效期

    res.json({
      success: true,
      data: {
        downloadUrl,
        fileName: document.originalName,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    logger.error('獲取文件下載 URL 失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取文件下載 URL 失敗',
      error: error instanceof Error ? error.message : '未知錯誤',
    });
  }
});

// 添加上傳錯誤處理中間件
router.use(uploadErrorHandler);

export default router;
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { createLogger } from '../utils/logger';

const logger = createLogger('Validation Middleware');

// 驗證中間件工廠函數
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn('Validation failed', { errors: validationErrors });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        });
      } else {
        logger.error('Unexpected validation error', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  };
};

// 常用驗證 Schema
export const schemas = {
  // 用戶註冊
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
      password: z.string().min(8, 'Password must be at least 8 characters').regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    }),
  }),

  // 用戶登入
  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  // 刷新 Token
  refreshToken: z.object({
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
  }),

  // 修改密碼
  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters').regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    }),
  }),

  // 更新用戶資料
  updateProfile: z.object({
    body: z.object({
      username: z.string().min(3).max(50).optional(),
      avatar: z.string().url().optional(),
    }),
  }),

  // 分頁參數
  pagination: z.object({
    query: z.object({
      page: z.string().regex(/^\d+$/).transform(Number).optional(),
      limit: z.string().regex(/^\d+$/).transform(Number).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
  }),

  // 搜索參數
  search: z.object({
    query: z.object({
      query: z.string().optional(),
      page: z.string().regex(/^\d+$/).transform(Number).optional(),
      limit: z.string().regex(/^\d+$/).transform(Number).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
  }),

  // 文件上傳
  uploadDocument: z.object({
    body: z.object({
      description: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  }),

  // 文件分析
  analyzeDocument: z.object({
    params: z.object({
      id: z.string().uuid('Invalid document ID format'),
    }),
  }),

  // 爬蟲任務創建
  createCrawlerTask: z.object({
    body: z.object({
      name: z.string().min(1, 'Task name is required').max(100, 'Task name must be less than 100 characters'),
      platform: z.enum(['facebook', 'instagram', 'threads', 'twitter', 'medium', 'ptt', 'mobile01', 'dcard']),
      keywords: z.array(z.string().min(1)).min(1, 'At least one keyword is required'),
      config: z.object({
        maxResults: z.number().min(1).max(1000).optional(),
        dateRange: z.object({
          start: z.string().datetime().optional(),
          end: z.string().datetime().optional(),
        }).optional(),
        filterKeywords: z.array(z.string()).optional(),
        minRelevanceScore: z.number().min(0).max(1).optional(),
      }).optional(),
      scheduledAt: z.string().datetime().optional(),
    }),
  }),

  // 知識卡片創建
  createKnowledgeCard: z.object({
    body: z.object({
      title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
      content: z.string().min(1, 'Content is required'),
      category: z.string().min(1, 'Category is required'),
      tags: z.array(z.string()).optional(),
      sourceDocumentId: z.string().uuid().optional(),
      sourceCrawlerResultId: z.string().uuid().optional(),
    }),
  }),

  // 知識卡片更新
  updateKnowledgeCard: z.object({
    params: z.object({
      id: z.string().uuid('Invalid card ID format'),
    }),
    body: z.object({
      title: z.string().min(1).max(200).optional(),
      content: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      tags: z.array(z.string()).optional(),
    }),
  }),

  // 卡片連接創建
  createCardConnection: z.object({
    body: z.object({
      fromCardId: z.string().uuid('Invalid from card ID format'),
      toCardId: z.string().uuid('Invalid to card ID format'),
      connectionType: z.enum(['RELATED', 'PREREQUISITE', 'FOLLOWUP', 'CONTRADICTION', 'EXAMPLE', 'REFERENCE']),
      strength: z.number().min(0).max(1).optional(),
      description: z.string().optional(),
    }),
  }),

  // AI 內容分析
  analyzeContent: z.object({
    body: z.object({
      content: z.string().min(1, 'Content is required'),
      type: z.enum(['document', 'crawler_result']),
    }),
  }),

  // 關鍵字生成
  generateKeywords: z.object({
    body: z.object({
      documentSummary: z.string().min(1, 'Document summary is required'),
      platform: z.enum(['facebook', 'instagram', 'threads', 'twitter', 'medium', 'ptt', 'mobile01', 'dcard']).optional(),
    }),
  }),

  // 相關性評估
  assessRelevance: z.object({
    body: z.object({
      userTopic: z.string().min(1, 'User topic is required'),
      crawlerContent: z.string().min(1, 'Crawler content is required'),
    }),
  }),

  // ID 參數驗證
  idParam: z.object({
    params: z.object({
      id: z.string().uuid('Invalid ID format'),
    }),
  }),

  // 批量操作
  batchIds: z.object({
    body: z.object({
      ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
    }),
  }),
};

// 文件上傳驗證中間件
export const validateFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file && !req.files) {
    res.status(400).json({
      success: false,
      error: 'No file uploaded',
    });
    return;
  }

  // 獲取文件對象
  let file: Express.Multer.File | undefined;
  
  if (req.file) {
    file = req.file;
  } else if (req.files) {
    if (Array.isArray(req.files)) {
      file = req.files[0];
    } else {
      // req.files is { [fieldname: string]: Express.Multer.File[] }
      const filesArray = Object.values(req.files);
      if (filesArray.length > 0 && filesArray[0].length > 0) {
        file = filesArray[0][0];
      }
    }
  }
  
  if (!file) {
    res.status(400).json({
      success: false,
      error: 'Invalid file',
    });
    return;
  }

  // 檢查文件大小
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE || '104857600'); // 100MB
  if (file.size > maxSize) {
    res.status(400).json({
      success: false,
      error: `File size exceeds limit of ${maxSize / 1024 / 1024}MB`,
    });
    return;
  }

  // 檢查文件類型
  const allowedTypes = (process.env.UPLOAD_ALLOWED_TYPES || '').split(',');
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    res.status(400).json({
      success: false,
      error: `File type ${file.mimetype} not allowed`,
    });
    return;
  }

  next();
};

// 批量文件上傳驗證
export const validateMultipleFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    res.status(400).json({
      success: false,
      error: 'No files uploaded',
    });
    return;
  }

  const files = req.files as Express.Multer.File[];
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE || '104857600');
  const allowedTypes = (process.env.UPLOAD_ALLOWED_TYPES || '').split(',');

  for (const file of files) {
    if (file.size > maxSize) {
      res.status(400).json({
        success: false,
        error: `File ${file.originalname} exceeds size limit of ${maxSize / 1024 / 1024}MB`,
      });
      return;
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        error: `File type ${file.mimetype} not allowed for ${file.originalname}`,
      });
      return;
    }
  }

  next();
};
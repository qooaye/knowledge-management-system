import { Request, Response } from 'express';
import { aiService, DocumentAnalysisRequest } from '../services/aiService';
import { documentService } from '../services/documentService';
import { createLogger } from '../utils/logger';

const logger = createLogger('AIController');
import { z } from 'zod';

// Validation schemas
const analyzeDocumentSchema = z.object({
  content: z.string().min(1, '內容不能為空'),
  title: z.string().optional().or(z.undefined()),
  documentType: z.string().optional().or(z.undefined()),
  maxSummaryLength: z.number().min(50).max(1000).optional().or(z.undefined()),
  maxKeywords: z.number().min(1).max(20).optional().or(z.undefined()),
  maxTags: z.number().min(1).max(15).optional().or(z.undefined()),
});

const analyzeDocumentByIdSchema = z.object({
  documentId: z.string().min(1, '文檔 ID 不能為空'),
  maxSummaryLength: z.number().min(50).max(1000).optional().or(z.undefined()),
  maxKeywords: z.number().min(1).max(20).optional().or(z.undefined()),
  maxTags: z.number().min(1).max(15).optional().or(z.undefined()),
});

const generateSummarySchema = z.object({
  content: z.string().min(1, '內容不能為空'),
  maxLength: z.number().min(50).max(1000).optional(),
  language: z.string().optional(),
});

const extractKeywordsSchema = z.object({
  content: z.string().min(1, '內容不能為空'),
  maxKeywords: z.number().min(1).max(20).optional(),
});

const generateTagsSchema = z.object({
  content: z.string().min(1, '內容不能為空'),
  maxTags: z.number().min(1).max(15).optional(),
});

const analyzeSentimentSchema = z.object({
  content: z.string().min(1, '內容不能為空'),
});

export class AIController {
  /**
   * 檢查 AI 服務狀態
   */
  async getStatus(req: Request, res: Response) {
    try {
      const isAvailable = aiService.isAvailable();
      
      return res.json({
        success: true,
        data: {
          available: isAvailable,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          features: {
            documentAnalysis: isAvailable,
            summaryGeneration: isAvailable,
            keywordExtraction: isAvailable,
            tagGeneration: isAvailable,
            sentimentAnalysis: isAvailable,
          },
        },
      });
    } catch (error) {
      logger.error('檢查 AI 狀態失敗:', error);
      return res.status(500).json({
        success: false,
        error: 'AI 服務狀態檢查失敗',
      });
    }
  }

  /**
   * 分析文檔內容
   */
  async analyzeDocument(req: Request, res: Response) {
    try {
      const validatedData = analyzeDocumentSchema.parse(req.body);
      
      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'AI 服務未配置或不可用',
        });
      }

      const result = await aiService.analyzeDocument(validatedData as DocumentAnalysisRequest);
      
      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '請求參數無效',
          details: error.errors,
        });
      }

      logger.error('文檔分析失敗:', error);
      return res.status(500).json({
        success: false,
        error: '文檔分析失敗',
      });
    }
  }

  /**
   * 根據文檔 ID 分析文檔
   */
  async analyzeDocumentById(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const validatedData = analyzeDocumentByIdSchema.parse({
        documentId,
        ...req.body,
      });

      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'AI 服務未配置或不可用',
        });
      }

      // 獲取文檔信息
      const document = await documentService.getDocumentById(validatedData.documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          error: '文檔不存在',
        });
      }

      // 構建分析請求
      const analysisRequest = {
        content: document.extractedText || '',
        title: document.fileName,
        documentType: document.fileType,
        maxSummaryLength: validatedData.maxSummaryLength,
        maxKeywords: validatedData.maxKeywords,
        maxTags: validatedData.maxTags,
      };

      const result = await aiService.analyzeDocument(analysisRequest);
      
      return res.json({
        success: true,
        data: {
          document: {
            id: document.id,
            fileName: document.fileName,
            fileType: document.fileType,
            fileSize: document.fileSize,
          },
          analysis: result,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '請求參數無效',
          details: error.errors,
        });
      }

      logger.error('文檔分析失敗:', error);
      return res.status(500).json({
        success: false,
        error: '文檔分析失敗',
      });
    }
  }

  /**
   * 生成摘要
   */
  async generateSummary(req: Request, res: Response) {
    try {
      const validatedData = generateSummarySchema.parse(req.body);
      
      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'AI 服務未配置或不可用',
        });
      }

      const summary = await aiService.generateSummary(
        validatedData.content,
        validatedData.maxLength,
        validatedData.language
      );
      
      return res.json({
        success: true,
        data: {
          summary,
          originalLength: validatedData.content.length,
          summaryLength: summary.length,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '請求參數無效',
          details: error.errors,
        });
      }

      logger.error('生成摘要失敗:', error);
      return res.status(500).json({
        success: false,
        error: '生成摘要失敗',
      });
    }
  }

  /**
   * 提取關鍵詞
   */
  async extractKeywords(req: Request, res: Response) {
    try {
      const validatedData = extractKeywordsSchema.parse(req.body);
      
      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'AI 服務未配置或不可用',
        });
      }

      const keywords = await aiService.extractKeywords(
        validatedData.content,
        validatedData.maxKeywords
      );
      
      return res.json({
        success: true,
        data: {
          keywords,
          count: keywords.length,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '請求參數無效',
          details: error.errors,
        });
      }

      logger.error('提取關鍵詞失敗:', error);
      return res.status(500).json({
        success: false,
        error: '提取關鍵詞失敗',
      });
    }
  }

  /**
   * 生成標籤
   */
  async generateTags(req: Request, res: Response) {
    try {
      const validatedData = generateTagsSchema.parse(req.body);
      
      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'AI 服務未配置或不可用',
        });
      }

      const tags = await aiService.generateTags(
        validatedData.content,
        validatedData.maxTags
      );
      
      return res.json({
        success: true,
        data: {
          tags,
          count: tags.length,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '請求參數無效',
          details: error.errors,
        });
      }

      logger.error('生成標籤失敗:', error);
      return res.status(500).json({
        success: false,
        error: '生成標籤失敗',
      });
    }
  }

  /**
   * 分析情感
   */
  async analyzeSentiment(req: Request, res: Response) {
    try {
      const validatedData = analyzeSentimentSchema.parse(req.body);
      
      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'AI 服務未配置或不可用',
        });
      }

      const sentimentResult = await aiService.analyzeSentiment(validatedData.content);
      
      return res.json({
        success: true,
        data: sentimentResult,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '請求參數無效',
          details: error.errors,
        });
      }

      logger.error('情感分析失敗:', error);
      return res.status(500).json({
        success: false,
        error: '情感分析失敗',
      });
    }
  }

  /**
   * 批量分析文檔
   */
  async analyzeBatch(req: Request, res: Response) {
    try {
      const { requests } = req.body;
      
      if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({
          success: false,
          error: '請求列表不能為空',
        });
      }

      if (requests.length > 10) {
        return res.status(400).json({
          success: false,
          error: '批量處理最多支援 10 個文檔',
        });
      }

      if (!aiService.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'AI 服務未配置或不可用',
        });
      }

      // 驗證每個請求
      const validatedRequests = requests.map((request: any, index: number) => {
        try {
          return analyzeDocumentSchema.parse(request);
        } catch (error) {
          throw new Error(`第 ${index + 1} 個請求參數無效`);
        }
      });

      const results = await aiService.analyzeBatch(validatedRequests as DocumentAnalysisRequest[]);
      
      return res.json({
        success: true,
        data: {
          results,
          total: results.length,
          processed: results.length,
        },
      });
    } catch (error) {
      logger.error('批量分析失敗:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '批量分析失敗',
      });
    }
  }
}

export const aiController = new AIController();
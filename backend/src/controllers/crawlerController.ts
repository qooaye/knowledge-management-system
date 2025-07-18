import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { crawlerService } from '../services/crawlerService';
import { taskScheduler } from '../services/taskScheduler';
import { createLogger } from '../utils/logger';
import { CrawlerStatus, CrawlerPlatform } from '../../../shared/types';
import { z } from 'zod';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

const logger = createLogger('CrawlerController');

// 驗證模式
const createCrawlerTaskSchema = z.object({
  name: z.string().min(1, '任務名稱不能為空'),
  platform: z.nativeEnum(CrawlerPlatform),
  keywords: z.array(z.string()).min(1, '至少需要一個關鍵字'),
  config: z.object({
    maxResults: z.number().min(1).max(100).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
    filterKeywords: z.array(z.string()).optional(),
    minRelevanceScore: z.number().min(0).max(1).optional(),
  }).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const updateCrawlerTaskSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.nativeEnum(CrawlerStatus).optional(),
  config: z.object({
    maxResults: z.number().min(1).max(100).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
    filterKeywords: z.array(z.string()).optional(),
    minRelevanceScore: z.number().min(0).max(1).optional(),
  }).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export class CrawlerController {
  /**
   * 創建爬蟲任務
   */
  async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用戶未認證',
        });
      }

      const validatedData = createCrawlerTaskSchema.parse(req.body);
      
      // 創建任務
      const task = await prisma.crawlerTask.create({
        data: {
          userId,
          name: validatedData.name,
          platform: validatedData.platform,
          keywords: validatedData.keywords,
          config: validatedData.config || {},
          status: 'PENDING',
          scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
        },
      });

      // 如果設置了排程時間，加入調度器
      if (validatedData.scheduledAt) {
        const scheduledDate = new Date(validatedData.scheduledAt);
        const cronExpression = this.createCronExpression(scheduledDate);
        await taskScheduler.scheduleTask(task.id, cronExpression);
      }

      logger.info(`爬蟲任務已創建: ${task.id}`);
      
      return res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '請求參數無效',
          details: error.errors,
        });
      }

      logger.error('創建爬蟲任務失敗:', error);
      return res.status(500).json({
        success: false,
        error: '創建任務失敗',
      });
    }
  }

  /**
   * 獲取用戶的爬蟲任務列表
   */
  async getTasks(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '用戶未認證',
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [tasks, total] = await Promise.all([
        prisma.crawlerTask.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            results: {
              select: {
                id: true,
                title: true,
                relevanceScore: true,
                createdAt: true,
              },
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
            _count: {
              select: { results: true },
            },
          },
        }),
        prisma.crawlerTask.count({
          where: { userId },
        }),
      ]);

      return res.json({
        success: true,
        data: {
          tasks,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('獲取爬蟲任務失敗:', error);
      return res.status(500).json({
        success: false,
        error: '獲取任務失敗',
      });
    }
  }

  /**
   * 獲取單個爬蟲任務詳情
   */
  async getTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const taskId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '未授權',
        });
      }
      
      if (!taskId) {
        return res.status(400).json({
          success: false,
          error: '任務 ID 必須提供',
        });
      }

      const task = await prisma.crawlerTask.findFirst({
        where: {
          id: taskId,
          userId,
        },
        include: {
          results: {
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { results: true },
          },
        },
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任務不存在',
        });
      }

      // 獲取調度狀態
      const scheduleStatus = taskScheduler.getTaskStatus(taskId);

      return res.json({
        success: true,
        data: {
          ...task,
          scheduleStatus,
        },
      });
    } catch (error) {
      logger.error('獲取爬蟲任務詳情失敗:', error);
      return res.status(500).json({
        success: false,
        error: '獲取任務詳情失敗',
      });
    }
  }

  /**
   * 更新爬蟲任務
   */
  async updateTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const taskId = req.params.id;
      const validatedData = updateCrawlerTaskSchema.parse(req.body);

      // 檢查任務是否存在且屬於當前用戶
      const existingTask = await prisma.crawlerTask.findFirst({
        where: {
          id: taskId,
          userId,
        },
      });

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: '任務不存在',
        });
      }

      // 更新任務
      const updatedTask = await prisma.crawlerTask.update({
        where: { id: taskId },
        data: {
          ...validatedData,
          scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
          updatedAt: new Date(),
        } as any,
      });

      // 更新調度
      if (validatedData.scheduledAt) {
        const scheduledDate = new Date(validatedData.scheduledAt);
        const cronExpression = this.createCronExpression(scheduledDate);
        await taskScheduler.scheduleTask(taskId, cronExpression);
      }

      logger.info(`爬蟲任務已更新: ${taskId}`);
      
      return res.json({
        success: true,
        data: updatedTask,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '請求參數無效',
          details: error.errors,
        });
      }

      logger.error('更新爬蟲任務失敗:', error);
      return res.status(500).json({
        success: false,
        error: '更新任務失敗',
      });
    }
  }

  /**
   * 刪除爬蟲任務
   */
  async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const taskId = req.params.id;

      // 檢查任務是否存在且屬於當前用戶
      const existingTask = await prisma.crawlerTask.findFirst({
        where: {
          id: taskId,
          userId,
        },
      });

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: '任務不存在',
        });
      }

      // 取消調度
      await taskScheduler.unscheduleTask(taskId);

      // 刪除任務和相關結果
      await prisma.crawlerTask.delete({
        where: { id: taskId },
      });

      logger.info(`爬蟲任務已刪除: ${taskId}`);
      
      return res.json({
        success: true,
        message: '任務已刪除',
      });
    } catch (error) {
      logger.error('刪除爬蟲任務失敗:', error);
      return res.status(500).json({
        success: false,
        error: '刪除任務失敗',
      });
    }
  }

  /**
   * 立即執行爬蟲任務
   */
  async runTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const taskId = req.params.id;

      // 檢查任務是否存在且屬於當前用戶
      const task = await prisma.crawlerTask.findFirst({
        where: {
          id: taskId,
          userId,
        },
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任務不存在',
        });
      }

      // 檢查任務狀態
      if (task.status === 'RUNNING') {
        return res.status(400).json({
          success: false,
          error: '任務正在執行中',
        });
      }

      // 異步執行任務
      taskScheduler.runTaskNow(taskId).catch(error => {
        logger.error(`任務執行失敗 ${taskId}:`, error);
      });

      logger.info(`開始執行爬蟲任務: ${taskId}`);
      
      return res.json({
        success: true,
        message: '任務開始執行',
      });
    } catch (error) {
      logger.error('執行爬蟲任務失敗:', error);
      return res.status(500).json({
        success: false,
        error: '執行任務失敗',
      });
    }
  }

  /**
   * 停止爬蟲任務
   */
  async stopTask(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const taskId = req.params.id;

      // 檢查任務是否存在且屬於當前用戶
      const task = await prisma.crawlerTask.findFirst({
        where: {
          id: taskId,
          userId,
        },
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任務不存在',
        });
      }

      // 更新任務狀態
      await prisma.crawlerTask.update({
        where: { id: taskId },
        data: {
          status: 'STOPPED',
          updatedAt: new Date(),
        },
      });

      // 暫停調度
      await taskScheduler.pauseTask(taskId);

      logger.info(`爬蟲任務已停止: ${taskId}`);
      
      return res.json({
        success: true,
        message: '任務已停止',
      });
    } catch (error) {
      logger.error('停止爬蟲任務失敗:', error);
      return res.status(500).json({
        success: false,
        error: '停止任務失敗',
      });
    }
  }

  /**
   * 獲取爬蟲結果
   */
  async getResults(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const taskId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // 檢查任務是否存在且屬於當前用戶
      const task = await prisma.crawlerTask.findFirst({
        where: {
          id: taskId,
          userId,
        },
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任務不存在',
        });
      }

      const [results, total] = await Promise.all([
        prisma.crawlerResult.findMany({
          where: { taskId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.crawlerResult.count({
          where: { taskId },
        }),
      ]);

      return res.json({
        success: true,
        data: {
          results,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('獲取爬蟲結果失敗:', error);
      return res.status(500).json({
        success: false,
        error: '獲取結果失敗',
      });
    }
  }

  /**
   * 獲取統計信息
   */
  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      const stats = await prisma.crawlerTask.groupBy({
        by: ['status'],
        where: { userId },
        _count: {
          status: true,
        },
      });

      const totalResults = await prisma.crawlerResult.count({
        where: {
          task: {
            userId,
          },
        },
      });

      const recentResults = await prisma.crawlerResult.findMany({
        where: {
          task: {
            userId,
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          relevanceScore: true,
          createdAt: true,
          task: {
            select: {
              name: true,
              platform: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        data: {
          taskStats: stats,
          totalResults,
          recentResults,
        },
      });
    } catch (error) {
      logger.error('獲取統計信息失敗:', error);
      return res.status(500).json({
        success: false,
        error: '獲取統計信息失敗',
      });
    }
  }

  /**
   * 創建 cron 表達式
   */
  private createCronExpression(scheduledDate: Date): string {
    const minute = scheduledDate.getMinutes();
    const hour = scheduledDate.getHours();
    
    // 每天同一時間執行
    return `${minute} ${hour} * * *`;
  }
}

export const crawlerController = new CrawlerController();
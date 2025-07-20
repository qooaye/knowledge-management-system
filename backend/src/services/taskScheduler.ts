import { CronJob } from 'cron';
import { prisma } from '../utils/database';
import { crawlerService } from './crawlerService';
import { createLogger } from '../utils/logger';
import { CrawlerStatus, CrawlerPlatform } from '../types';

const logger = createLogger('TaskScheduler');

export interface ScheduledTask {
  id: string;
  cronExpression: string;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  job?: CronJob;
}

export class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.initializeScheduler();
  }

  /**
   * 初始化調度器
   */
  private async initializeScheduler(): Promise<void> {
    try {
      logger.info('正在初始化任務調度器...');
      
      // 從資料庫載入所有已排程的任務
      const scheduledTasks = await prisma.crawlerTask.findMany({
        where: {
          scheduledAt: {
            not: null,
          },
          status: {
            not: 'STOPPED',
          },
        },
      });

      // 為每個任務創建 cron job
      for (const task of scheduledTasks) {
        if (task.scheduledAt) {
          await this.scheduleTask(task.id, this.createCronExpression(task.scheduledAt));
        }
      }

      this.isRunning = true;
      logger.info(`任務調度器已初始化，載入了 ${scheduledTasks.length} 個任務`);
    } catch (error) {
      logger.error('任務調度器初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 排程任務
   */
  async scheduleTask(taskId: string, cronExpression: string): Promise<void> {
    try {
      // 如果任務已存在，先停止它
      if (this.tasks.has(taskId)) {
        await this.unscheduleTask(taskId);
      }

      // 創建新的 cron job
      const job = new CronJob(cronExpression, async () => {
        await this.executeTask(taskId);
      });

      const scheduledTask: ScheduledTask = {
        id: taskId,
        cronExpression,
        isActive: true,
        job,
      };

      // 啟動任務
      job.start();
      this.tasks.set(taskId, scheduledTask);

      logger.info(`任務 ${taskId} 已排程: ${cronExpression}`);
    } catch (error) {
      logger.error(`排程任務失敗 ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * 取消排程任務
   */
  async unscheduleTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task && task.job) {
      task.job.stop();
      task.job.stop();
      this.tasks.delete(taskId);
      logger.info(`任務 ${taskId} 已取消排程`);
    }
  }

  /**
   * 執行任務
   */
  private async executeTask(taskId: string): Promise<void> {
    try {
      logger.info(`開始執行任務: ${taskId}`);
      
      // 獲取任務詳情
      const task = await prisma.crawlerTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        logger.error(`任務不存在: ${taskId}`);
        return;
      }

      // 檢查任務狀態
      if (task.status === 'RUNNING') {
        logger.warn(`任務 ${taskId} 正在執行中，跳過此次排程`);
        return;
      }

      // 更新任務狀態
      await prisma.crawlerTask.update({
        where: { id: taskId },
        data: {
          status: 'RUNNING',
          progress: 0,
          updatedAt: new Date(),
        },
      });

      // 執行爬蟲任務
      await this.runCrawlerTask(task);

      // 更新任務狀態
      await prisma.crawlerTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          updatedAt: new Date(),
        },
      });

      logger.info(`任務 ${taskId} 執行完成`);
    } catch (error) {
      logger.error(`任務執行失敗 ${taskId}:`, error);
      
      // 更新任務狀態為失敗
      await prisma.crawlerTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * 執行爬蟲任務
   */
  private async runCrawlerTask(task: any): Promise<void> {
    const { keywords, platform, config } = task;
    const maxResults = config.maxResults || 10;
    
    let allResults: any[] = [];
    let processedCount = 0;

    for (const keyword of keywords) {
      try {
        logger.info(`爬取關鍵字: ${keyword} (平台: ${platform})`);
        
        // 執行爬蟲
        const crawledContents = await crawlerService.crawlByPlatform(
          platform as CrawlerPlatform,
          keyword,
          maxResults
        );

        // 內容去重
        const uniqueContents = await crawlerService.deduplicateContent(crawledContents);

        // 分析相關性並保存結果
        for (const content of uniqueContents) {
          try {
            const userTopic = keywords.join(' ');
            const relevanceAnalysis = await crawlerService.analyzeRelevance(content, userTopic);
            
            // 檢查相關性閾值
            const minRelevanceScore = config.minRelevanceScore || 0.3;
            if (relevanceAnalysis.relevanceScore < minRelevanceScore) {
              logger.debug(`內容相關性過低，跳過: ${content.title}`);
              continue;
            }

            // 保存爬蟲結果
            await prisma.crawlerResult.create({
              data: {
                taskId: task.id,
                url: content.url,
                title: content.title,
                content: content.content,
                author: content.author,
                publishedAt: content.publishedAt,
                platform: platform,
                relevanceScore: relevanceAnalysis.relevanceScore,
                relevanceReason: relevanceAnalysis.reasoning,
                summary: relevanceAnalysis.summary,
                keyPoints: Array.isArray(relevanceAnalysis.keyPoints) ? relevanceAnalysis.keyPoints.join(',') : relevanceAnalysis.keyPoints,
                tags: Array.isArray(relevanceAnalysis.tags) ? relevanceAnalysis.tags.join(',') : relevanceAnalysis.tags,
              },
            });

            allResults.push(content);
            processedCount++;

            // 更新進度
            const progress = Math.round((processedCount / (keywords.length * maxResults)) * 100);
            await prisma.crawlerTask.update({
              where: { id: task.id },
              data: {
                progress,
                resultCount: allResults.length,
              },
            });

            logger.info(`已處理 ${processedCount} 個結果`);
          } catch (error) {
            logger.error(`處理內容失敗:`, error);
            continue;
          }
        }

        // 關鍵字間的延遲
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`爬取關鍵字失敗 ${keyword}:`, error);
        continue;
      }
    }

    logger.info(`任務完成，共獲取 ${allResults.length} 個結果`);
  }

  /**
   * 創建 cron 表達式
   */
  private createCronExpression(scheduledDate: Date): string {
    const minute = scheduledDate.getMinutes();
    const hour = scheduledDate.getHours();
    const day = scheduledDate.getDate();
    const month = scheduledDate.getMonth() + 1;
    
    // 每天同一時間執行
    return `${minute} ${hour} * * *`;
  }

  /**
   * 獲取任務狀態
   */
  getTaskStatus(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 獲取所有任務
   */
  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 立即執行任務
   */
  async runTaskNow(taskId: string): Promise<void> {
    await this.executeTask(taskId);
  }

  /**
   * 暫停任務
   */
  async pauseTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task && task.job) {
      task.job.stop();
      task.isActive = false;
      logger.info(`任務 ${taskId} 已暫停`);
    }
  }

  /**
   * 恢復任務
   */
  async resumeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task && task.job) {
      task.job.start();
      task.isActive = true;
      logger.info(`任務 ${taskId} 已恢復`);
    }
  }

  /**
   * 停止調度器
   */
  async stop(): Promise<void> {
    logger.info('正在停止任務調度器...');
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.job) {
        task.job.stop();
        task.job.stop();
      }
    }
    
    this.tasks.clear();
    this.isRunning = false;
    
    logger.info('任務調度器已停止');
  }

  /**
   * 檢查調度器是否運行
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

export const taskScheduler = new TaskScheduler();

// 優雅關閉
process.on('SIGINT', async () => {
  await taskScheduler.stop();
});

process.on('SIGTERM', async () => {
  await taskScheduler.stop();
});
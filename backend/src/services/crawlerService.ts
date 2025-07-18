import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import { createLogger } from '../utils/logger';
import { CrawlerTask, CrawlerResult, CrawlerStatus, CrawlerPlatform } from '../types';
import { aiService } from './aiService';

const logger = createLogger('CrawlerService');

export interface CrawlerTaskRequest {
  userId: string;
  name: string;
  platform: CrawlerPlatform;
  keywords: string[];
  config: {
    maxResults?: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
    filterKeywords?: string[];
    minRelevanceScore?: number;
  };
}

export interface CrawlerConfig {
  userAgent: string;
  timeout: number;
  retryAttempts: number;
  delay: number;
  concurrent: number;
  headers: Record<string, string>;
}

export interface CrawledContent {
  url: string;
  title: string;
  content: string;
  author?: string;
  publishedAt?: Date;
  metadata?: Record<string, any>;
}

export class CrawlerService {
  private browser: Browser | null = null;
  private defaultConfig: CrawlerConfig = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    timeout: 30000,
    retryAttempts: 3,
    delay: 1000,
    concurrent: 3,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  };

  constructor() {
    // 延遲初始化瀏覽器，避免在載入時立即初始化
  }

  async initializeBrowser(): Promise<void> {
    const browserOptions = {
      headless: "new" as const,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--remote-debugging-port=9222',
      ],
    };

    try {
      // 嘗試使用系統 Chrome
      this.browser = await puppeteer.launch({
        ...browserOptions,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      });
      logger.info('瀏覽器已初始化（使用系統 Chrome）');
    } catch (error) {
      logger.warn('系統 Chrome 初始化失敗:', error);
      // 如果系統 Chrome 不可用，嘗試使用 Puppeteer 提供的 Chrome
      try {
        this.browser = await puppeteer.launch(browserOptions);
        logger.info('瀏覽器已初始化（使用 Puppeteer Chrome）');
      } catch (fallbackError) {
        logger.error('瀏覽器初始化完全失敗:', fallbackError);
        throw fallbackError;
      }
    }
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.initializeBrowser();
    }
    
    const page = await this.browser!.newPage();
    
    // 設置用戶代理
    await page.setUserAgent(this.defaultConfig.userAgent);
    
    // 設置請求頭
    await page.setExtraHTTPHeaders(this.defaultConfig.headers);
    
    // 設置超時
    page.setDefaultTimeout(this.defaultConfig.timeout);
    
    // 攔截請求以優化性能
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // 阻止圖片、CSS、字體等資源加載
      if (['image', 'stylesheet', 'font', 'other'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    return page;
  }

  /**
   * 通用網頁爬取方法
   */
  async crawlWebsite(url: string, selectors: Record<string, string>): Promise<CrawledContent | null> {
    const page = await this.createPage();
    
    try {
      logger.info(`開始爬取網址: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // 等待頁面加載
      await page.waitForTimeout(2000);
      
      // 提取內容
      const content = await page.evaluate((selectors) => {
        const getTextContent = (selector: string) => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() || '' : '';
        };
        
        const getMultipleTextContent = (selector: string) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.textContent?.trim() || '').filter(Boolean);
        };
        
        return {
          title: getTextContent(selectors.title) || '',
          content: getMultipleTextContent(selectors.content).join('\n'),
          author: getTextContent(selectors.author) || '',
          publishedAt: getTextContent(selectors.publishedAt) || '',
          metadata: {
            url: window.location.href,
            timestamp: new Date().toISOString(),
          },
        };
      }, selectors);
      
      // 處理發布時間
      let publishedAt: Date | undefined;
      if (content.publishedAt) {
        publishedAt = this.parseDate(content.publishedAt);
      }
      
      return {
        url,
        title: content.title,
        content: content.content,
        author: content.author || undefined,
        publishedAt,
        metadata: content.metadata,
      };
      
    } catch (error) {
      logger.error(`爬取失敗 ${url}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * PTT 爬蟲
   */
  async crawlPTT(keyword: string, maxResults: number = 10): Promise<CrawledContent[]> {
    const results: CrawledContent[] = [];
    const page = await this.createPage();
    
    try {
      const searchUrl = `https://www.ptt.cc/search?q=${encodeURIComponent(keyword)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // 獲取文章列表
      const articleLinks = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/bbs/"]');
        return Array.from(links).map(link => ({
          url: 'https://www.ptt.cc' + link.getAttribute('href'),
          title: link.textContent?.trim() || '',
        }));
      });
      
      // 限制結果數量
      const limitedLinks = articleLinks.slice(0, maxResults);
      
      for (const link of limitedLinks) {
        const content = await this.crawlWebsite(link.url, {
          title: '#main-content .article-meta-value',
          content: '#main-content',
          author: '.article-meta-value',
          publishedAt: '.article-meta-value',
        });
        
        if (content) {
          results.push(content);
        }
        
        // 延遲以避免被封鎖
        await page.waitForTimeout(this.defaultConfig.delay);
      }
      
    } catch (error) {
      logger.error('PTT 爬取失敗:', error);
    } finally {
      await page.close();
    }
    
    return results;
  }

  /**
   * Dcard 爬蟲
   */
  async crawlDcard(keyword: string, maxResults: number = 10): Promise<CrawledContent[]> {
    const results: CrawledContent[] = [];
    const page = await this.createPage();
    
    try {
      const searchUrl = `https://www.dcard.tw/search?query=${encodeURIComponent(keyword)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // 等待內容加載
      await page.waitForTimeout(3000);
      
      // 獲取文章列表
      const articleLinks = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/f/"]');
        return Array.from(links).map(link => ({
          url: 'https://www.dcard.tw' + link.getAttribute('href'),
          title: link.textContent?.trim() || '',
        }));
      });
      
      const limitedLinks = articleLinks.slice(0, maxResults);
      
      for (const link of limitedLinks) {
        const content = await this.crawlWebsite(link.url, {
          title: 'h1',
          content: '.Post_content_2FdeX',
          author: '.PostAuthor_root_3vAJp',
          publishedAt: 'time',
        });
        
        if (content) {
          results.push(content);
        }
        
        await page.waitForTimeout(this.defaultConfig.delay);
      }
      
    } catch (error) {
      logger.error('Dcard 爬取失敗:', error);
    } finally {
      await page.close();
    }
    
    return results;
  }

  /**
   * Mobile01 爬蟲
   */
  async crawlMobile01(keyword: string, maxResults: number = 10): Promise<CrawledContent[]> {
    const results: CrawledContent[] = [];
    const page = await this.createPage();
    
    try {
      const searchUrl = `https://www.mobile01.com/search.php?q=${encodeURIComponent(keyword)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      const articleLinks = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="topicdetail"]');
        return Array.from(links).map(link => ({
          url: link.getAttribute('href') || '',
          title: link.textContent?.trim() || '',
        }));
      });
      
      const limitedLinks = articleLinks.slice(0, maxResults);
      
      for (const link of limitedLinks) {
        const content = await this.crawlWebsite(link.url, {
          title: '.topic-title',
          content: '.single-post-content',
          author: '.username',
          publishedAt: '.date',
        });
        
        if (content) {
          results.push(content);
        }
        
        await page.waitForTimeout(this.defaultConfig.delay);
      }
      
    } catch (error) {
      logger.error('Mobile01 爬取失敗:', error);
    } finally {
      await page.close();
    }
    
    return results;
  }

  /**
   * 根據平台執行爬蟲
   */
  async crawlByPlatform(platform: CrawlerPlatform, keyword: string, maxResults: number = 10): Promise<CrawledContent[]> {
    switch (platform) {
      case CrawlerPlatform.PTT:
        return this.crawlPTT(keyword, maxResults);
      case CrawlerPlatform.DCARD:
        return this.crawlDcard(keyword, maxResults);
      case CrawlerPlatform.MOBILE01:
        return this.crawlMobile01(keyword, maxResults);
      default:
        throw new Error(`不支援的平台: ${platform}`);
    }
  }

  /**
   * 內容相關性分析
   */
  async analyzeRelevance(content: CrawledContent, userTopic: string): Promise<{
    relevanceScore: number;
    reasoning: string;
    summary: string;
    keyPoints: string[];
    tags: string[];
  }> {
    try {
      if (!aiService.isAvailable()) {
        // 簡單的關鍵字匹配作為備選方案
        const keywords = userTopic.toLowerCase().split(' ');
        const contentLower = (content.title + ' ' + content.content).toLowerCase();
        const matches = keywords.filter(keyword => contentLower.includes(keyword));
        const relevanceScore = matches.length / keywords.length;
        
        return {
          relevanceScore: Math.min(relevanceScore * 0.8, 1.0), // 最多 0.8 分
          reasoning: `基於關鍵字匹配: ${matches.join(', ')}`,
          summary: content.content.substring(0, 200) + '...',
          keyPoints: [content.title],
          tags: matches,
        };
      }

      // 使用 AI 進行相關性分析
      const prompt = `
請分析以下內容與用戶主題 "${userTopic}" 的相關性：

標題: ${content.title}
內容: ${content.content.substring(0, 1000)}...

請提供：
1. 相關性評分 (0-1)
2. 評分理由
3. 內容摘要 (100字以內)
4. 關鍵要點 (3-5個)
5. 相關標籤 (3-5個)

請以JSON格式回應。
`;

      const response = await aiService.analyzeContent(prompt);
      
      // 解析 AI 回應
      try {
        const analysis = JSON.parse(response);
        return {
          relevanceScore: analysis.relevanceScore || 0,
          reasoning: analysis.reasoning || '無法分析',
          summary: analysis.summary || content.content.substring(0, 200),
          keyPoints: analysis.keyPoints || [content.title],
          tags: analysis.tags || [],
        };
      } catch (parseError) {
        logger.error('AI 回應解析失敗:', parseError);
        throw new Error('AI 分析結果格式錯誤');
      }
      
    } catch (error) {
      logger.error('相關性分析失敗:', error);
      throw error;
    }
  }

  /**
   * 內容去重
   */
  async deduplicateContent(contents: CrawledContent[]): Promise<CrawledContent[]> {
    const seen = new Set<string>();
    const uniqueContents: CrawledContent[] = [];
    
    for (const content of contents) {
      // 基於標題和內容前100字創建指紋
      const fingerprint = this.createContentFingerprint(content.title, content.content);
      
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        uniqueContents.push(content);
      }
    }
    
    logger.info(`去重完成: ${contents.length} -> ${uniqueContents.length}`);
    return uniqueContents;
  }

  /**
   * 創建內容指紋
   */
  createContentFingerprint(title: string, content: string): string {
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedContent = content.substring(0, 100).toLowerCase().trim();
    return Buffer.from(normalizedTitle + normalizedContent).toString('base64');
  }

  /**
   * 解析日期字符串
   */
  parseDate(dateString: string): Date | undefined {
    try {
      // 嘗試多種日期格式
      const formats = [
        /(\d{4})-(\d{2})-(\d{2})/,
        /(\d{4})\/(\d{2})\/(\d{2})/,
        /(\d{2})\/(\d{2})\/(\d{4})/,
      ];
      
      for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
          const [, year, month, day] = match;
          return new Date(parseInt(year || '0'), parseInt(month || '0') - 1, parseInt(day || '0'));
        }
      }
      
      // 嘗試直接解析
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    } catch (error) {
      logger.warn(`日期解析失敗: ${dateString}`, error);
      return undefined;
    }
  }

  /**
   * 清理資源
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('瀏覽器已關閉');
    }
  }
}

export const crawlerService = new CrawlerService();

// 優雅關閉
process.on('SIGINT', async () => {
  await crawlerService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await crawlerService.cleanup();
  process.exit(0);
});
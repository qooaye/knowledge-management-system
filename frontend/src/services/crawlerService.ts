import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const API_PREFIX = process.env.REACT_APP_API_PREFIX || '/api';

// 爬蟲平台枚舉
export enum CrawlerPlatform {
  PTT = 'ptt',
  DCARD = 'dcard',
  MOBILE01 = 'mobile01',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  MEDIUM = 'medium',
  THREADS = 'threads',
}

// 爬蟲狀態枚舉
export enum CrawlerStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped',
}

// 爬蟲任務接口
export interface CrawlerTask {
  id: string;
  userId: string;
  name: string;
  platform: CrawlerPlatform;
  keywords: string[];
  config: {
    maxResults?: number;
    dateRange?: {
      start: string;
      end: string;
    };
    filterKeywords?: string[];
    minRelevanceScore?: number;
  };
  status: CrawlerStatus;
  progress: number;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
}

// 爬蟲結果接口
export interface CrawlerResult {
  id: string;
  taskId: string;
  url: string;
  title: string;
  content: string;
  author?: string;
  publishedAt?: string;
  platform: CrawlerPlatform;
  relevanceScore: number;
  relevanceReason: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  createdAt: string;
}

// 創建爬蟲任務請求
export interface CreateCrawlerTaskRequest {
  name: string;
  platform: CrawlerPlatform;
  keywords: string[];
  config?: {
    maxResults?: number;
    dateRange?: {
      start: string;
      end: string;
    };
    filterKeywords?: string[];
    minRelevanceScore?: number;
  };
  scheduledAt?: string;
}

class CrawlerService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * 獲取爬蟲統計數據
   */
  async getStats(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}${API_PREFIX}/crawler/stats`,
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('獲取爬蟲統計失敗:', error);
      throw error;
    }
  }

  /**
   * 創建爬蟲任務
   */
  async createTask(request: CreateCrawlerTaskRequest): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}${API_PREFIX}/crawler/tasks`,
        request,
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('創建爬蟲任務失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取爬蟲任務列表
   */
  async getTasks(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}${API_PREFIX}/crawler/tasks`,
        {
          params: { page, limit },
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('獲取爬蟲任務失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取單個爬蟲任務
   */
  async getTask(id: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}${API_PREFIX}/crawler/tasks/${id}`,
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('獲取爬蟲任務失敗:', error);
      throw error;
    }
  }

  /**
   * 執行爬蟲任務
   */
  async runTask(id: string): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}${API_PREFIX}/crawler/tasks/${id}/run`,
        {},
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('執行爬蟲任務失敗:', error);
      throw error;
    }
  }

  /**
   * 停止爬蟲任務
   */
  async stopTask(id: string): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}${API_PREFIX}/crawler/tasks/${id}/stop`,
        {},
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('停止爬蟲任務失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取爬蟲結果
   */
  async getResults(taskId: string, page: number = 1, limit: number = 10): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}${API_PREFIX}/crawler/tasks/${taskId}/results`,
        {
          params: { page, limit },
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('獲取爬蟲結果失敗:', error);
      throw error;
    }
  }

  /**
   * 格式化狀態文本
   */
  getStatusText(status: CrawlerStatus): string {
    const statusMap = {
      [CrawlerStatus.PENDING]: '等待中',
      [CrawlerStatus.RUNNING]: '執行中',
      [CrawlerStatus.COMPLETED]: '已完成',
      [CrawlerStatus.FAILED]: '失敗',
      [CrawlerStatus.STOPPED]: '已停止',
    };
    return statusMap[status] || status;
  }

  /**
   * 格式化平台名稱
   */
  getPlatformText(platform: CrawlerPlatform): string {
    const platformMap = {
      [CrawlerPlatform.PTT]: 'PTT',
      [CrawlerPlatform.DCARD]: 'Dcard',
      [CrawlerPlatform.MOBILE01]: 'Mobile01',
      [CrawlerPlatform.FACEBOOK]: 'Facebook',
      [CrawlerPlatform.INSTAGRAM]: 'Instagram',
      [CrawlerPlatform.TWITTER]: 'Twitter',
      [CrawlerPlatform.MEDIUM]: 'Medium',
      [CrawlerPlatform.THREADS]: 'Threads',
    };
    return platformMap[platform] || platform;
  }

  /**
   * 獲取狀態顏色
   */
  getStatusColor(status: CrawlerStatus): string {
    const colorMap = {
      [CrawlerStatus.PENDING]: '#faad14',
      [CrawlerStatus.RUNNING]: '#1890ff',
      [CrawlerStatus.COMPLETED]: '#52c41a',
      [CrawlerStatus.FAILED]: '#ff4d4f',
      [CrawlerStatus.STOPPED]: '#d9d9d9',
    };
    return colorMap[status] || '#d9d9d9';
  }
}

export const crawlerService = new CrawlerService();
export default crawlerService;
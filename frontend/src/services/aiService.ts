import apiClient from './apiClient';

// 定義 AI 分析結果介面
export interface AIAnalysisResult {
  summary: string;
  keywords: string[];
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  language: string;
  readingTime: number;
  complexity: 'low' | 'medium' | 'high';
  topics: string[];
  entities: Array<{
    text: string;
    type: 'person' | 'organization' | 'location' | 'misc';
    confidence: number;
  }>;
}

// 定義 AI 服務狀態介面
export interface AIServiceStatus {
  available: boolean;
  model: string;
  features: {
    documentAnalysis: boolean;
    summaryGeneration: boolean;
    keywordExtraction: boolean;
    tagGeneration: boolean;
    sentimentAnalysis: boolean;
  };
}

// 定義文檔分析請求介面
export interface DocumentAnalysisRequest {
  content: string;
  title?: string;
  documentType?: string;
  maxSummaryLength?: number;
  maxKeywords?: number;
  maxTags?: number;
}

// 定義 API 響應介面
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

class AIService {
  /**
   * 獲取 AI 服務狀態
   */
  async getStatus(): Promise<AIServiceStatus> {
    try {
      const response = await apiClient.get<APIResponse<AIServiceStatus>>('/ai/status');
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get AI service status');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to get AI service status:', error);
      throw new Error(error.response?.data?.error || 'AI 服務狀態檢查失敗');
    }
  }

  /**
   * 分析文檔內容
   */
  async analyzeDocument(request: DocumentAnalysisRequest): Promise<AIAnalysisResult> {
    try {
      const response = await apiClient.post<APIResponse<AIAnalysisResult>>('/ai/analyze', request);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Document analysis failed');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Document analysis failed:', error);
      throw new Error(error.response?.data?.error || '文檔分析失敗');
    }
  }

  /**
   * 根據文檔 ID 分析文檔
   */
  async analyzeDocumentById(
    documentId: string,
    options?: {
      maxSummaryLength?: number;
      maxKeywords?: number;
      maxTags?: number;
    }
  ): Promise<{
    document: {
      id: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    };
    analysis: AIAnalysisResult;
  }> {
    try {
      const response = await apiClient.post<APIResponse<any>>(
        `/ai/analyze/${documentId}`,
        options || {}
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Document analysis failed');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Document analysis by ID failed:', error);
      throw new Error(error.response?.data?.error || '文檔分析失敗');
    }
  }

  /**
   * 生成文檔摘要
   */
  async generateSummary(
    content: string,
    maxLength: number = 300,
    language: string = 'zh-TW'
  ): Promise<{
    summary: string;
    originalLength: number;
    summaryLength: number;
  }> {
    try {
      const response = await apiClient.post<APIResponse<any>>('/ai/summary', {
        content,
        maxLength,
        language,
      });
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Summary generation failed');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Summary generation failed:', error);
      throw new Error(error.response?.data?.error || '摘要生成失敗');
    }
  }

  /**
   * 提取關鍵詞
   */
  async extractKeywords(
    content: string,
    maxKeywords: number = 10
  ): Promise<{
    keywords: string[];
    count: number;
  }> {
    try {
      const response = await apiClient.post<APIResponse<any>>('/ai/keywords', {
        content,
        maxKeywords,
      });
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Keyword extraction failed');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Keyword extraction failed:', error);
      throw new Error(error.response?.data?.error || '關鍵詞提取失敗');
    }
  }

  /**
   * 生成標籤
   */
  async generateTags(
    content: string,
    maxTags: number = 8
  ): Promise<{
    tags: string[];
    count: number;
  }> {
    try {
      const response = await apiClient.post<APIResponse<any>>('/ai/tags', {
        content,
        maxTags,
      });
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Tag generation failed');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Tag generation failed:', error);
      throw new Error(error.response?.data?.error || '標籤生成失敗');
    }
  }

  /**
   * 分析情感
   */
  async analyzeSentiment(content: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }> {
    try {
      const response = await apiClient.post<APIResponse<any>>('/ai/sentiment', {
        content,
      });
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Sentiment analysis failed');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Sentiment analysis failed:', error);
      throw new Error(error.response?.data?.error || '情感分析失敗');
    }
  }

  /**
   * 批量分析文檔
   */
  async analyzeBatch(requests: DocumentAnalysisRequest[]): Promise<{
    results: AIAnalysisResult[];
    total: number;
    processed: number;
  }> {
    try {
      if (requests.length > 10) {
        throw new Error('批量處理最多支援 10 個文檔');
      }

      const response = await apiClient.post<APIResponse<any>>('/ai/batch', {
        requests,
      });
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Batch analysis failed');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Batch analysis failed:', error);
      throw new Error(error.response?.data?.error || '批量分析失敗');
    }
  }

  /**
   * 檢查 AI 服務是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.available;
    } catch (error) {
      return false;
    }
  }

  /**
   * 獲取情感分析的本地化文本
   */
  getSentimentText(sentiment: 'positive' | 'negative' | 'neutral'): string {
    const sentimentMap = {
      positive: '正面',
      negative: '負面',
      neutral: '中性',
    };
    return sentimentMap[sentiment] || '未知';
  }

  /**
   * 獲取複雜度的本地化文本
   */
  getComplexityText(complexity: 'low' | 'medium' | 'high'): string {
    const complexityMap = {
      low: '簡單',
      medium: '中等',
      high: '複雜',
    };
    return complexityMap[complexity] || '未知';
  }

  /**
   * 獲取實體類型的本地化文本
   */
  getEntityTypeText(type: 'person' | 'organization' | 'location' | 'misc'): string {
    const typeMap = {
      person: '人物',
      organization: '組織',
      location: '地點',
      misc: '其他',
    };
    return typeMap[type] || '未知';
  }

  /**
   * 格式化閱讀時間
   */
  formatReadingTime(minutes: number): string {
    if (minutes < 1) {
      return '少於 1 分鐘';
    } else if (minutes === 1) {
      return '1 分鐘';
    } else {
      return `${minutes} 分鐘`;
    }
  }

  /**
   * 格式化信心度百分比
   */
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }
}

// 創建並導出服務實例
export const aiService = new AIService();
export default aiService;
import { apiRequest } from './api';
import {
  KnowledgeCard,
  CardConnection,
  KnowledgeGraph,
  SearchResult,
  ConnectionType,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const knowledgeService = {
  // 獲取知識卡片列表
  getCards: async (params: {
    page?: number;
    limit?: number;
    category?: string;
    tags?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    return apiRequest.get<ApiResponse<PaginatedResponse<KnowledgeCard>>>(
      '/knowledge-cards',
      params
    );
  },

  // 獲取單個知識卡片
  getCard: async (id: string) => {
    return apiRequest.get<ApiResponse<KnowledgeCard>>(`/knowledge-cards/${id}`);
  },

  // 創建知識卡片
  createCard: async (cardData: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    sourceDocumentId?: string;
    sourceCrawlerResultId?: string;
  }) => {
    return apiRequest.post<ApiResponse<KnowledgeCard>>('/knowledge-cards', cardData);
  },

  // 更新知識卡片
  updateCard: async (id: string, data: Partial<KnowledgeCard>) => {
    return apiRequest.put<ApiResponse<KnowledgeCard>>(`/knowledge-cards/${id}`, data);
  },

  // 刪除知識卡片
  deleteCard: async (id: string) => {
    return apiRequest.delete<ApiResponse<void>>(`/knowledge-cards/${id}`);
  },

  // 批量刪除知識卡片
  deleteMultipleCards: async (ids: string[]) => {
    return apiRequest.post<ApiResponse<void>>('/knowledge-cards/delete-multiple', { ids });
  },

  // 搜索知識卡片
  searchCards: async (params: {
    query: string;
    filters?: {
      category?: string;
      tags?: string[];
      dateRange?: {
        start: string;
        end: string;
      };
    };
    page?: number;
    limit?: number;
  }) => {
    return apiRequest.post<ApiResponse<SearchResult[]>>('/knowledge-cards/search', params);
  },

  // 獲取卡片連接
  getConnections: async (cardId?: string) => {
    const url = cardId ? `/knowledge-cards/connections?cardId=${cardId}` : '/knowledge-cards/connections';
    return apiRequest.get<ApiResponse<CardConnection[]>>(url);
  },

  // 創建卡片連接
  createConnection: async (connectionData: {
    fromCardId: string;
    toCardId: string;
    connectionType: ConnectionType;
    strength: number;
    description?: string;
  }) => {
    return apiRequest.post<ApiResponse<CardConnection>>('/knowledge-cards/connections', connectionData);
  },

  // 更新卡片連接
  updateConnection: async (id: string, data: Partial<CardConnection>) => {
    return apiRequest.put<ApiResponse<CardConnection>>(`/knowledge-cards/connections/${id}`, data);
  },

  // 刪除卡片連接
  deleteConnection: async (id: string) => {
    return apiRequest.delete<ApiResponse<void>>(`/knowledge-cards/connections/${id}`);
  },

  // 獲取知識圖譜
  getKnowledgeGraph: async (params?: {
    category?: string;
    tags?: string[];
    depth?: number;
    centerNodeId?: string;
  }) => {
    return apiRequest.get<ApiResponse<KnowledgeGraph>>('/knowledge-cards/graph', params);
  },

  // 尋找相似卡片
  findSimilarCards: async (cardId: string, limit?: number) => {
    return apiRequest.get<ApiResponse<{
      similar: KnowledgeCard[];
      scores: number[];
    }>>(`/knowledge-cards/${cardId}/similar`, { limit });
  },

  // 自動生成卡片連接
  generateConnections: async (cardId: string) => {
    return apiRequest.post<ApiResponse<CardConnection[]>>(`/knowledge-cards/${cardId}/generate-connections`);
  },

  // 獲取學習路徑
  getLearningPath: async (params: {
    startCardId: string;
    endCardId: string;
    maxDepth?: number;
  }) => {
    return apiRequest.post<ApiResponse<{
      path: KnowledgeCard[];
      connections: CardConnection[];
      totalSteps: number;
      estimatedTime: number;
    }>>('/knowledge-cards/learning-path', params);
  },

  // 獲取推薦卡片
  getRecommendations: async (cardId: string, limit?: number) => {
    return apiRequest.get<ApiResponse<{
      recommendations: KnowledgeCard[];
      reasons: string[];
    }>>(`/knowledge-cards/${cardId}/recommendations`, { limit });
  },

  // 批量創建卡片
  createMultipleCards: async (cardsData: Array<{
    title: string;
    content: string;
    category: string;
    tags: string[];
    sourceDocumentId?: string;
    sourceCrawlerResultId?: string;
  }>) => {
    return apiRequest.post<ApiResponse<KnowledgeCard[]>>('/knowledge-cards/batch', cardsData);
  },

  // 匯出知識卡片
  exportCards: async (params: {
    format: 'json' | 'csv' | 'markdown';
    cardIds?: string[];
    category?: string;
    tags?: string[];
  }) => {
    return apiRequest.post<Blob>('/knowledge-cards/export', params, {
      responseType: 'blob',
    });
  },

  // 匯入知識卡片
  importCards: async (file: File, format: 'json' | 'csv' | 'markdown') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    
    return apiRequest.post<ApiResponse<{
      imported: number;
      failed: number;
      errors: string[];
    }>>('/knowledge-cards/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 獲取知識統計
  getKnowledgeStats: async () => {
    return apiRequest.get<ApiResponse<{
      totalCards: number;
      totalConnections: number;
      byCategory: Record<string, number>;
      topTags: Array<{ tag: string; count: number }>;
      connectionTypes: Record<ConnectionType, number>;
      recentActivity: Array<{
        type: 'card_created' | 'card_updated' | 'connection_created';
        cardId: string;
        title: string;
        timestamp: Date;
      }>;
    }>>('/knowledge-cards/stats');
  },

  // 驗證卡片內容
  validateCard: async (cardData: {
    title: string;
    content: string;
    category: string;
    tags: string[];
  }) => {
    return apiRequest.post<ApiResponse<{
      valid: boolean;
      errors: string[];
      suggestions: string[];
    }>>('/knowledge-cards/validate', cardData);
  },

  // 獲取卡片歷史版本
  getCardHistory: async (cardId: string) => {
    return apiRequest.get<ApiResponse<Array<{
      version: number;
      content: string;
      changes: string[];
      timestamp: Date;
      userId: string;
    }>>>(`/knowledge-cards/${cardId}/history`);
  },

  // 恢復卡片版本
  restoreCardVersion: async (cardId: string, version: number) => {
    return apiRequest.post<ApiResponse<KnowledgeCard>>(`/knowledge-cards/${cardId}/restore`, { version });
  },
};
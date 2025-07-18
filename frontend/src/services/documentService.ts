import { apiRequest } from './api';
import { Document, DocumentAnalysis, ApiResponse, PaginatedResponse } from '../types';

export const documentService = {
  // 獲取文件列表
  getDocuments: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    return apiRequest.get<ApiResponse<PaginatedResponse<Document>>>(
      '/documents',
      params
    );
  },

  // 獲取單個文件
  getDocument: async (id: string) => {
    return apiRequest.get<ApiResponse<Document>>(`/documents/${id}`);
  },

  // 上傳文件
  uploadDocument: async (file: File, onProgress?: (progress: number) => void) => {
    return apiRequest.upload<ApiResponse<Document>>(
      '/documents/upload',
      file,
      onProgress
    );
  },

  // 批量上傳文件
  uploadMultipleDocuments: async (
    files: File[],
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return apiRequest.post<ApiResponse<Document[]>>('/documents/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  // 刪除文件
  deleteDocument: async (id: string) => {
    return apiRequest.delete<ApiResponse<void>>(`/documents/${id}`);
  },

  // 批量刪除文件
  deleteMultipleDocuments: async (ids: string[]) => {
    return apiRequest.post<ApiResponse<void>>('/documents/delete-multiple', { ids });
  },

  // 分析文件
  analyzeDocument: async (id: string) => {
    return apiRequest.post<ApiResponse<DocumentAnalysis>>(`/documents/${id}/analyze`);
  },

  // 重新分析文件
  reanalyzeDocument: async (id: string) => {
    return apiRequest.post<ApiResponse<DocumentAnalysis>>(`/documents/${id}/reanalyze`);
  },

  // 獲取文件分析結果
  getDocumentAnalysis: async (id: string) => {
    return apiRequest.get<ApiResponse<DocumentAnalysis>>(`/documents/${id}/analysis`);
  },

  // 更新文件元數據
  updateDocument: async (id: string, data: Partial<Document>) => {
    return apiRequest.put<ApiResponse<Document>>(`/documents/${id}`, data);
  },

  // 下載文件
  downloadDocument: async (id: string) => {
    return apiRequest.get<Blob>(`/documents/${id}/download`, {
      responseType: 'blob',
    });
  },

  // 獲取文件預覽
  getDocumentPreview: async (id: string) => {
    return apiRequest.get<ApiResponse<{ previewUrl: string; contentType: string }>>(
      `/documents/${id}/preview`
    );
  },

  // 搜索文件
  searchDocuments: async (params: {
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
    return apiRequest.post<ApiResponse<PaginatedResponse<Document>>>(
      '/documents/search',
      params
    );
  },

  // 獲取文件統計
  getDocumentStats: async () => {
    return apiRequest.get<ApiResponse<{
      total: number;
      byCategory: Record<string, number>;
      byStatus: Record<string, number>;
      storageUsed: number;
      recentUploads: number;
    }>>('/documents/stats');
  },

  // 獲取支援的文件類型
  getSupportedFileTypes: async () => {
    return apiRequest.get<ApiResponse<{
      mimeTypes: string[];
      extensions: string[];
      maxSize: number;
    }>>('/documents/supported-types');
  },
};
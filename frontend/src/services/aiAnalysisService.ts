import { apiRequest } from './api';

export interface AIAnalysisResult {
  id: string;
  title: string;
  summary: string;
  keywords: string;
  categories: string;
  analysisType: 'single' | 'batch';
  indexKey: string;
  createdAt: string;
  updatedAt: string;
  originalFiles: Array<{
    fileName: string;
    originalName: string;
    fileType: string;
    size: number;
  }>;
}

export interface AIAnalysisDetail extends AIAnalysisResult {
  keyPoints: string;
  insights: string;
  markdownContent: string;
  metadata: any;
}

export interface PaginatedResults {
  results: AIAnalysisResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UploadResponse {
  analysisId: string;
  fileCount: number;
  analysisType: 'single' | 'batch';
}

class AIAnalysisService {
  /**
   * 上傳文件並進行AI分析
   */
  async uploadAndAnalyze(files: FileList): Promise<UploadResponse> {
    const formData = new FormData();
    
    // 添加所有文件到FormData
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    const response = await apiRequest.post<UploadResponse>('/ai-analysis/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60秒超時
    });

    return response.data;
  }

  /**
   * 獲取AI分析結果列表
   */
  async getAnalysisResults(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResults> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiRequest.get<PaginatedResults>(
      `/ai-analysis?${queryParams.toString()}`
    );

    return response.data;
  }

  /**
   * 獲取單個AI分析結果詳情
   */
  async getAnalysisResult(id: string): Promise<AIAnalysisDetail> {
    const response = await apiRequest.get<AIAnalysisDetail>(`/ai-analysis/${id}`);
    return response.data;
  }

  /**
   * 下載Markdown格式的分析結果
   */
  async downloadMarkdown(id: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/ai-analysis/${id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('下載失敗');
      }

      // 獲取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'AI分析報告.md';
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/);
        if (matches && matches[1]) {
          filename = decodeURIComponent(matches[1]);
        }
      }

      // 創建下載
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('下載Markdown失敗:', error);
      throw error;
    }
  }

  /**
   * 刪除AI分析結果
   */
  async deleteAnalysisResult(id: string): Promise<void> {
    await apiRequest.delete(`/ai-analysis/${id}`);
  }

  /**
   * 搜索AI分析結果
   */
  async searchAnalysisResults(query: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResults> {
    return this.getAnalysisResults({
      ...params,
      search: query
    });
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化文件類型
   */
  formatFileType(mimeType: string): string {
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'application/msword': 'Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/vnd.ms-excel': 'Excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'text/plain': 'TXT',
      'text/markdown': 'Markdown',
      'text/html': 'HTML',
      'image/jpeg': '圖片',
      'image/png': '圖片',
      'image/gif': '圖片',
      'image/bmp': '圖片',
      'image/tiff': '圖片'
    };

    return typeMap[mimeType] || '未知';
  }

  /**
   * 獲取文件圖標
   */
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('text')) return '📄';
    return '📁';
  }
}

export const aiAnalysisService = new AIAnalysisService();
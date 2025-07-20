import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { getAuthTokens } from '../../utils/auth';

// 文件狀態枚舉
export enum DocumentStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// 文件接口
export interface Document {
  id: string;
  title: string;
  description: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  category: string;
  tags: string[];
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  metadata: any;
  processingError?: string;
  storageUrl?: string;
  content?: string;
}

// 文件列表響應
interface DocumentListResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// 上傳響應
interface UploadResponse {
  success: boolean;
  message: string;
  data: any;
}

// 批量上傳響應
interface BatchUploadResponse {
  success: boolean;
  message: string;
  data: {
    results: Array<{
      originalName: string;
      success: boolean;
      documentId?: string;
      error?: string;
    }>;
    summary: {
      total: number;
      success: number;
      failed: number;
    };
  };
}

// 文件狀態
interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search?: string;
    category?: string;
    status?: DocumentStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  };
}

// 初始狀態
const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  loading: false,
  uploading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  filters: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  },
};

// API 基礎 URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// 異步 thunk：獲取文件列表
export const fetchDocuments = createAsyncThunk<
  DocumentListResponse,
  {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: DocumentStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
>('documents/fetchDocuments', async (params, { rejectWithValue }) => {
  try {
    const tokens = getAuthTokens();
    const token = tokens?.accessToken;
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    if (params.status) queryParams.append('status', params.status);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`${API_BASE_URL}/api/documents?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('獲取文件列表失敗');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '獲取文件列表失敗');
  }
});

// 異步 thunk：獲取文件詳情
export const fetchDocument = createAsyncThunk<Document, string>(
  'documents/fetchDocument',
  async (documentId, { rejectWithValue }) => {
    try {
      const tokens = getAuthTokens();
    const token = tokens?.accessToken;
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('獲取文件詳情失敗');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '獲取文件詳情失敗');
    }
  }
);

// 異步 thunk：上傳文件
export const uploadDocument = createAsyncThunk<UploadResponse, FormData>(
  'documents/uploadDocument',
  async (formData, { rejectWithValue }) => {
    try {
      const tokens = getAuthTokens();
    const token = tokens?.accessToken;
      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('文件上傳失敗');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '文件上傳失敗');
    }
  }
);

// 異步 thunk：批量上傳文件
export const uploadDocuments = createAsyncThunk<BatchUploadResponse, FormData>(
  'documents/uploadDocuments',
  async (formData, { rejectWithValue }) => {
    try {
      const tokens = getAuthTokens();
    const token = tokens?.accessToken;
      const response = await fetch(`${API_BASE_URL}/api/documents/upload/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('批量上傳失敗');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '批量上傳失敗');
    }
  }
);

// 異步 thunk：更新文件
export const updateDocument = createAsyncThunk<
  Document,
  { id: string; data: Partial<Document> }
>('documents/updateDocument', async ({ id, data }, { rejectWithValue }) => {
  try {
    const tokens = getAuthTokens();
    const token = tokens?.accessToken;
    const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('更新文件失敗');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '更新文件失敗');
  }
});

// 異步 thunk：刪除文件
export const deleteDocument = createAsyncThunk<string, string>(
  'documents/deleteDocument',
  async (documentId, { rejectWithValue }) => {
    try {
      const tokens = getAuthTokens();
    const token = tokens?.accessToken;
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('刪除文件失敗');
      }

      return documentId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : '刪除文件失敗');
    }
  }
);

// 異步 thunk：獲取文件下載 URL
export const getDocumentDownloadUrl = createAsyncThunk<
  { downloadUrl: string; fileName: string; expiresIn: number },
  string
>('documents/getDocumentDownloadUrl', async (documentId, { rejectWithValue }) => {
  try {
    const tokens = getAuthTokens();
    const token = tokens?.accessToken;
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('獲取下載連結失敗');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : '獲取下載連結失敗');
  }
});

// 文件 slice
const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<DocumentState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDocument: (state) => {
      state.currentDocument = null;
    },
    resetState: (state) => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      // 獲取文件列表
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.documents;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 獲取文件詳情
      .addCase(fetchDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDocument = action.payload;
      })
      .addCase(fetchDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 上傳文件
      .addCase(uploadDocument.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.uploading = false;
        // 上傳成功後可以重新獲取文件列表或添加到當前列表
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })
      // 批量上傳文件
      .addCase(uploadDocuments.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadDocuments.fulfilled, (state, action) => {
        state.uploading = false;
        // 批量上傳成功後可以重新獲取文件列表
      })
      .addCase(uploadDocuments.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })
      // 更新文件
      .addCase(updateDocument.fulfilled, (state, action) => {
        const index = state.documents.findIndex(doc => doc.id === action.payload.id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
        if (state.currentDocument?.id === action.payload.id) {
          state.currentDocument = action.payload;
        }
      })
      // 刪除文件
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter(doc => doc.id !== action.payload);
        if (state.currentDocument?.id === action.payload) {
          state.currentDocument = null;
        }
      });
  },
});

export const { setFilters, clearError, clearCurrentDocument, resetState } = documentSlice.actions;

// 選擇器
export const selectDocuments = (state: RootState) => state.documents.documents;
export const selectCurrentDocument = (state: RootState) => state.documents.currentDocument;
export const selectDocumentLoading = (state: RootState) => state.documents.loading;
export const selectDocumentUploading = (state: RootState) => state.documents.uploading;
export const selectDocumentError = (state: RootState) => state.documents.error;
export const selectDocumentPagination = (state: RootState) => state.documents.pagination;
export const selectDocumentFilters = (state: RootState) => state.documents.filters;

export default documentSlice.reducer;
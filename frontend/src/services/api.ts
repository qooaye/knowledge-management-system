import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { store } from '../store';
import { setTokens } from '../store/slices/authSlice';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// 創建 axios 實例
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 響應攔截器
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          store.dispatch(setTokens({
            accessToken,
            refreshToken: newRefreshToken,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小時後過期
          }));

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token 也過期了，重定向到登入頁面
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // 沒有 refresh token，重定向到登入頁面
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// 通用 API 方法
export const apiRequest = {
  get: <T = any>(url: string, params?: any): Promise<AxiosResponse<T>> =>
    api.get(url, { params }),
  
  post: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> =>
    api.post(url, data),
  
  put: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> =>
    api.put(url, data),
  
  delete: <T = any>(url: string): Promise<AxiosResponse<T>> =>
    api.delete(url),
  
  upload: <T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse<T>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post(url, formData, {
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
};

export default api;
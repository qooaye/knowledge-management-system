import { apiRequest } from './api';
import { User, AuthTokens, ApiResponse } from '../types';

export const authService = {
  // 用戶登入
  login: async (credentials: { email: string; password: string }) => {
    return apiRequest.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      '/auth/login',
      credentials
    );
  },

  // 用戶註冊
  register: async (userData: { email: string; password: string; username: string }) => {
    return apiRequest.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      '/auth/register',
      userData
    );
  },

  // 刷新 Token
  refreshToken: async (refreshToken: string) => {
    return apiRequest.post<ApiResponse<AuthTokens>>('/auth/refresh', {
      refreshToken,
    });
  },

  // 獲取當前用戶信息
  getCurrentUser: async () => {
    return apiRequest.get<ApiResponse<User>>('/auth/me');
  },

  // 用戶登出
  logout: async () => {
    return apiRequest.post<ApiResponse<void>>('/auth/logout');
  },

  // 更新用戶資料
  updateProfile: async (userData: Partial<User>) => {
    return apiRequest.put<ApiResponse<User>>('/auth/profile', userData);
  },

  // 修改密碼
  changePassword: async (passwords: { currentPassword: string; newPassword: string }) => {
    return apiRequest.post<ApiResponse<void>>('/auth/change-password', passwords);
  },

  // 忘記密碼
  forgotPassword: async (email: string) => {
    return apiRequest.post<ApiResponse<void>>('/auth/forgot-password', { email });
  },

  // 重設密碼
  resetPassword: async (token: string, password: string) => {
    return apiRequest.post<ApiResponse<void>>('/auth/reset-password', {
      token,
      password,
    });
  },
};
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { authService } from '../services/authService';
import { createLogger } from '../utils/logger';
import { sendSuccess, sendError, asyncHandler } from '../middleware/error';

const logger = createLogger('Auth Controller');

export class AuthController {
  // 用戶註冊
  register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, username, password } = req.body;

    const result = await authService.register({
      email,
      username,
      password,
    });

    logger.info('User registered successfully', {
      userId: result.user.id,
      email: result.user.email,
      ip: req.ip,
    });

    sendSuccess(res, result, 'User registered successfully', 201);
  });

  // 用戶登入
  login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login({
      email,
      password,
    });

    logger.info('User logged in successfully', {
      userId: result.user.id,
      email: result.user.email,
      ip: req.ip,
    });

    sendSuccess(res, result, 'Login successful');
  });

  // 刷新 Token
  refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = req.body;

    const result = await authService.refreshToken(refreshToken);

    logger.info('Token refreshed successfully', {
      ip: req.ip,
    });

    sendSuccess(res, result, 'Token refreshed successfully');
  });

  // 用戶登出
  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    logger.info('User logged out successfully', {
      userId: req.user?.id,
      ip: req.ip,
    });

    sendSuccess(res, null, 'Logout successful');
  });

  // 獲取當前用戶信息
  getCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const user = await authService.getCurrentUser(userId);

    sendSuccess(res, user, 'User information retrieved successfully');
  });

  // 更新用戶資料
  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { username, avatar } = req.body;

    const user = await authService.updateProfile(userId, {
      username,
      avatar,
    });

    logger.info('User profile updated successfully', {
      userId,
      changes: { username, avatar },
    });

    sendSuccess(res, user, 'Profile updated successfully');
  });

  // 修改密碼
  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(userId, currentPassword, newPassword);

    logger.info('Password changed successfully', {
      userId,
      ip: req.ip,
    });

    sendSuccess(res, null, 'Password changed successfully');
  });

  // 忘記密碼
  forgotPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email } = req.body;

    await authService.forgotPassword(email);

    logger.info('Password reset requested', {
      email,
      ip: req.ip,
    });

    sendSuccess(res, null, 'Password reset email sent');
  });

  // 重設密碼
  resetPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token, password } = req.body;

    await authService.resetPassword(token, password);

    logger.info('Password reset completed', {
      ip: req.ip,
    });

    sendSuccess(res, null, 'Password reset successfully');
  });

  // 停用帳號
  deactivateAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    await authService.deactivateAccount(userId);

    logger.info('User account deactivated', {
      userId,
      ip: req.ip,
    });

    sendSuccess(res, null, 'Account deactivated successfully');
  });

  // 重新啟用帳號
  reactivateAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    await authService.reactivateAccount(userId);

    logger.info('User account reactivated', {
      userId,
      adminId: req.user?.id,
      ip: req.ip,
    });

    return sendSuccess(res, null, 'Account reactivated successfully');
  });

  // 健康檢查
  healthCheck = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    }, 'Auth service is healthy');
  });
}

export const authController = new AuthController();
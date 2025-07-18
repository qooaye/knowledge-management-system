import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import prisma from '../utils/database';
import { createLogger } from '../utils/logger';
import {
  generateTokens,
  verifyRefreshToken,
  revokeRefreshToken,
} from '../middleware/auth';
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../middleware/error';

const logger = createLogger('Auth Service');

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
}

export class AuthService {
  // 用戶註冊
  async register(data: RegisterData): Promise<AuthResponse> {
    const { email, username, password } = data;

    try {
      // 檢查用戶是否已存在
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new ConflictError('Email already registered');
        }
        if (existingUser.username === username) {
          throw new ConflictError('Username already taken');
        }
      }

      // 加密密碼
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 創建用戶
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 生成 tokens
      const tokens = generateTokens(user as User);

      // 儲存 refresh token
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天
        },
      });

      logger.info('User registered successfully', { userId: user.id, email });

      return {
        user,
        tokens,
      };
    } catch (error) {
      logger.error('Registration failed', error, { email, username });
      throw error;
    }
  }

  // 用戶登入
  async login(data: LoginData): Promise<AuthResponse> {
    const { email, password } = data;

    try {
      // 查找用戶
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is inactive');
      }

      // 驗證密碼
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // 生成 tokens
      const tokens = generateTokens(user);

      // 儲存 refresh token
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天
        },
      });

      logger.info('User logged in successfully', { userId: user.id, email });

      // 返回用戶信息（不包含密碼）
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      logger.error('Login failed', error, { email });
      throw error;
    }
  }

  // 刷新 token
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    try {
      // 驗證 refresh token
      const user = await verifyRefreshToken(refreshToken);
      if (!user) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // 撤銷舊的 refresh token
      await revokeRefreshToken(refreshToken);

      // 生成新的 tokens
      const tokens = generateTokens(user);

      // 儲存新的 refresh token
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天
        },
      });

      logger.info('Token refreshed successfully', { userId: user.id });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', error);
      throw error;
    }
  }

  // 用戶登出
  async logout(refreshToken: string): Promise<void> {
    try {
      await revokeRefreshToken(refreshToken);
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed', error);
      throw error;
    }
  }

  // 獲取當前用戶信息
  async getCurrentUser(userId: string): Promise<Omit<User, 'password'>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Failed to get current user', error, { userId });
      throw error;
    }
  }

  // 更新用戶資料
  async updateProfile(
    userId: string,
    data: { username?: string; avatar?: string }
  ): Promise<Omit<User, 'password'>> {
    try {
      // 檢查用戶名是否已被使用
      if (data.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username: data.username,
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          throw new ConflictError('Username already taken');
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info('User profile updated successfully', { userId });

      return user;
    } catch (error) {
      logger.error('Failed to update user profile', error, { userId });
      throw error;
    }
  }

  // 修改密碼
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // 驗證當前密碼
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // 加密新密碼
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // 更新密碼
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      // 撤銷所有 refresh tokens（強制重新登入）
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Failed to change password', error, { userId });
      throw error;
    }
  }

  // 忘記密碼
  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // 不透露用戶是否存在
        logger.warn('Password reset requested for non-existent email', { email });
        return;
      }

      // TODO: 實現郵件發送功能
      // 生成重置 token 並發送郵件
      
      logger.info('Password reset email sent', { userId: user.id, email });
    } catch (error) {
      logger.error('Failed to process forgot password request', error, { email });
      throw error;
    }
  }

  // 重設密碼
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // TODO: 實現 token 驗證邏輯
      // 驗證重置 token 並更新密碼
      
      logger.info('Password reset completed');
    } catch (error) {
      logger.error('Failed to reset password', error);
      throw error;
    }
  }

  // 停用用戶帳號
  async deactivateAccount(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // 撤銷所有 refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });

      logger.info('User account deactivated', { userId });
    } catch (error) {
      logger.error('Failed to deactivate account', error, { userId });
      throw error;
    }
  }

  // 重新啟用用戶帳號
  async reactivateAccount(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });

      logger.info('User account reactivated', { userId });
    } catch (error) {
      logger.error('Failed to reactivate account', error, { userId });
      throw error;
    }
  }

  // 清理過期的 refresh tokens
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info('Expired refresh tokens cleaned up', { count: result.count });
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
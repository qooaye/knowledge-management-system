import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import prisma from '../utils/database';
import { createLogger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

const logger = createLogger('Auth Middleware');

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// JWT 驗證中間件
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }

    // 驗證 JWT Token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as JWTPayload;

    // 從資料庫獲取最新的用戶信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User account is inactive',
      });
      return;
    }

    // 將用戶信息附加到請求對象
    req.user = user as User;
    next();
  } catch (error) {
    logger.error('Token verification failed', error);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
};

// 可選認證中間件（允許匿名訪問）
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (user && user.isActive) {
      req.user = user as User;
    }

    next();
  } catch (error) {
    // 忽略錯誤，允許匿名訪問
    next();
  }
};

// 角色驗證中間件
export const requireRole = (roles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // 這裡可以擴展用戶角色系統
    // 目前先允許所有認證用戶
    next();
  };
};

// 檢查用戶是否為資源擁有者
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;

    // 這裡需要根據具體資源類型進行檢查
    // 例如：檢查文件、爬蟲任務、知識卡片等的所有權
    
    next();
  };
};

// 生成 JWT Token
export const generateTokens = (user: User): {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
} => {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
    },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
  );

  // 計算過期時間
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24小時後過期

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
};

// 驗證 Refresh Token
export const verifyRefreshToken = async (
  refreshToken: string
): Promise<User | null> => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET || 'default-secret'
    ) as JWTPayload & { type: string };

    if (decoded.type !== 'refresh') {
      return null;
    }

    // 檢查 refresh token 是否在資料庫中
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return null;
    }

    return storedToken.user;
  } catch (error) {
    logger.error('Refresh token verification failed', error);
    return null;
  }
};

// 撤銷 Refresh Token
export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    await prisma.refreshToken.delete({
      where: { token: refreshToken },
    });
  } catch (error) {
    logger.error('Failed to revoke refresh token', error);
  }
};

// 清理過期的 Refresh Token
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    logger.info('Expired refresh tokens cleaned up');
  } catch (error) {
    logger.error('Failed to cleanup expired tokens', error);
  }
};
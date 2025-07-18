import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/authController';
import { validate, schemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import {
  authLimiter,
  loginAttemptLimiter,
  registerLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimiter';

const router = Router();

// 公開路由（無需認證）
router.post(
  '/register',
  registerLimiter,
  validate(schemas.register),
  authController.register
);

router.post(
  '/login',
  loginAttemptLimiter,
  validate(schemas.login),
  authController.login
);

router.post(
  '/refresh',
  authLimiter,
  validate(schemas.refreshToken),
  authController.refreshToken
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
    }),
  })),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(z.object({
    body: z.object({
      token: z.string().min(1, 'Token is required'),
      password: z.string().min(8, 'Password must be at least 8 characters').regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    }),
  })),
  authController.resetPassword
);

router.get('/health', authController.healthCheck);

// 受保護路由（需要認證）
router.use(authenticateToken);

router.post(
  '/logout',
  validate(schemas.refreshToken),
  authController.logout
);

router.get('/me', authController.getCurrentUser);

router.put(
  '/profile',
  validate(schemas.updateProfile),
  authController.updateProfile
);

router.post(
  '/change-password',
  validate(schemas.changePassword),
  authController.changePassword
);

router.post(
  '/deactivate',
  authController.deactivateAccount
);

// 管理員路由
router.post(
  '/reactivate/:userId',
  validate(schemas.idParam),
  authController.reactivateAccount
);

export default router;
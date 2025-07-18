// 重新導出共用類型
export * from '../../../shared/types';

// 後端特定類型
import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, any>;
}

export interface FileUploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export interface ProcessingJob {
  id: string;
  type: 'document_analysis' | 'crawler_task' | 'knowledge_generation';
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawlerJobPayload {
  taskId: string;
  platform: string;
  keywords: string[];
  config: any;
}

export interface DocumentAnalysisPayload {
  documentId: string;
  content: string;
  mimeType: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

export interface CacheOptions {
  ttl: number;
  key: string;
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}
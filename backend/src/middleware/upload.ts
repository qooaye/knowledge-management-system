import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { logger } from '../utils/logger';

// 支援的文件格式
const SUPPORTED_FILE_TYPES = {
  'text/plain': '.txt',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/markdown': '.md',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'text/html': '.html',
  'application/epub+zip': '.epub',
  'application/json': '.json',
  'text/csv': '.csv',
  'application/rtf': '.rtf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-powerpoint': '.ppt',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/x-7z-compressed': '.7z'
};

// 文件大小限制 (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// 文件過濾器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  logger.info(`檢查文件類型: ${file.mimetype}, 原始名稱: ${file.originalname}`);
  
  // 檢查文件類型
  if (!SUPPORTED_FILE_TYPES[file.mimetype as keyof typeof SUPPORTED_FILE_TYPES]) {
    const error = new Error(`不支援的文件類型: ${file.mimetype}`);
    (error as any).code = 'UNSUPPORTED_FILE_TYPE';
    return cb(error);
  }
  
  // 檢查文件擴展名
  const fileExt = path.extname(file.originalname).toLowerCase();
  const expectedExt = SUPPORTED_FILE_TYPES[file.mimetype as keyof typeof SUPPORTED_FILE_TYPES];
  
  if (fileExt !== expectedExt) {
    const error = new Error(`文件擴展名不匹配: 期望 ${expectedExt}, 得到 ${fileExt}`);
    (error as any).code = 'EXTENSION_MISMATCH';
    return cb(error);
  }
  
  cb(null, true);
};

// 內存存儲配置
const storage = multer.memoryStorage();

// 創建 multer 實例
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // 最多同時上傳 10 個文件
    fields: 20, // 最多 20 個字段
    fieldNameSize: 100, // 字段名最大長度
    fieldSize: 1024 * 1024, // 字段值最大大小 1MB
  },
});

// 錯誤處理中間件
export const uploadErrorHandler = (error: any, req: Request, res: any, next: any) => {
  logger.error('文件上傳錯誤:', error);
  
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `文件大小超出限制 (最大 ${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
          error: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: '文件數量超出限制 (最多 10 個)',
          error: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: '未預期的文件字段',
          error: 'UNEXPECTED_FILE'
        });
      default:
        return res.status(400).json({
          success: false,
          message: '文件上傳錯誤',
          error: error.code
        });
    }
  }
  
  if (error.code === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'UNSUPPORTED_FILE_TYPE',
      supportedTypes: Object.keys(SUPPORTED_FILE_TYPES)
    });
  }
  
  if (error.code === 'EXTENSION_MISMATCH') {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'EXTENSION_MISMATCH'
    });
  }
  
  next(error);
};

// 文件驗證工具
export const validateFile = (file: Express.Multer.File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: '缺少文件' };
  }
  
  if (!file.buffer || file.buffer.length === 0) {
    return { isValid: false, error: '文件內容為空' };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: '文件大小超出限制' };
  }
  
  const mimetype = file.mimetype;
  if (!SUPPORTED_FILE_TYPES[mimetype as keyof typeof SUPPORTED_FILE_TYPES]) {
    return { isValid: false, error: `不支援的文件類型: ${mimetype}` };
  }
  
  return { isValid: true };
};

// 生成唯一文件名
export const generateFileName = (originalName: string, userId: string): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  
  // 清理文件名中的特殊字符
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fff._-]/g, '_');
  
  return `${userId}/${timestamp}_${randomId}_${cleanBaseName}${extension}`;
};

// 獲取文件類型分類
export const getFileCategory = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('text/')) return 'text';
  if (mimetype.includes('pdf')) return 'pdf';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'document';
  if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'spreadsheet';
  if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'presentation';
  if (mimetype.includes('epub')) return 'ebook';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) return 'archive';
  return 'other';
};

export { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE };
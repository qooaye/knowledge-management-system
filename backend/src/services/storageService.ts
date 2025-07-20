import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';

interface StorageConfig {
  endpoint?: string;
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  bucket: string;
}

interface UploadResult {
  success: boolean;
  key: string;
  url?: string;
  error?: string;
}

interface FileMetadata {
  contentType: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private isMinIO: boolean;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.isMinIO = !!config.endpoint;

    // 配置 S3 客戶端
    const clientConfig: any = {
      region: config.region || 'us-east-1',
      credentials: config.credentials,
    };

    // 如果是 MinIO，添加自定義端點
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle = true; // MinIO 需要路徑樣式
    }

    this.s3Client = new S3Client(clientConfig);
  }

  /**
   * 上傳文件到存儲
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
        // 設置合適的 ACL
        ACL: 'private',
      });

      await this.s3Client.send(command);

      logger.info(`文件上傳成功: ${key}`);

      return {
        success: true,
        key,
        url: await this.getFileUrl(key),
      };
    } catch (error) {
      logger.error('文件上傳失敗:', error);
      return {
        success: false,
        key,
        error: error instanceof Error ? error.message : '上傳失敗',
      };
    }
  }

  /**
   * 獲取文件下載 URL
   */
  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      logger.error('獲取文件 URL 失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取文件內容
   */
  async getFileContent(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        const stream = response.Body as any;
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('獲取文件內容失敗:', error);
      throw error;
    }
  }

  /**
   * 刪除文件
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      logger.info(`文件刪除成功: ${key}`);
      return true;
    } catch (error) {
      logger.error('文件刪除失敗:', error);
      return false;
    }
  }

  /**
   * 檢查文件是否存在
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 獲取文件元數據
   */
  async getFileMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || '',
      };
    } catch (error) {
      logger.error('獲取文件元數據失敗:', error);
      return null;
    }
  }

  /**
   * 批量上傳文件
   */
  async uploadFiles(
    files: Array<{
      key: string;
      buffer: Buffer;
      contentType: string;
      metadata?: Record<string, string>;
    }>
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(
        file.key,
        file.buffer,
        file.contentType,
        file.metadata
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 複製文件
   */
  async copyFile(sourceKey: string, destKey: string): Promise<boolean> {
    try {
      // 先獲取源文件
      const content = await this.getFileContent(sourceKey);
      const metadata = await this.getFileMetadata(sourceKey);

      if (!metadata) {
        return false;
      }

      // 上傳到新位置
      const result = await this.uploadFile(destKey, content, metadata.contentType);
      return result.success;
    } catch (error) {
      logger.error('文件複製失敗:', error);
      return false;
    }
  }

  /**
   * 清理過期文件 (需要自行實現清理邏輯)
   */
  async cleanupExpiredFiles(expirationHours: number = 24): Promise<void> {
    // 這個方法需要根據具體需求實現
    // 可以通過文件的 metadata 或者數據庫記錄來判斷過期時間
    logger.info(`清理 ${expirationHours} 小時前的過期文件`);
  }
}

// 創建存儲服務實例
export const createStorageService = (): StorageService => {
  const storageType = process.env.UPLOAD_STORAGE_TYPE || 'minio';
  
  if (storageType === 'local') {
    // 本地存儲模式，使用基本配置
    return new StorageService({
      region: 'local',
      credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local',
      },
      bucket: 'local-storage',
    });
  } else if (storageType === 'minio') {
    return new StorageService({
      endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'admin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'admin123',
      },
      bucket: process.env.MINIO_BUCKET || 'knowledge-management',
    });
  } else if (storageType === 's3') {
    return new StorageService({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      bucket: process.env.AWS_S3_BUCKET || 'knowledge-management',
    });
  } else {
    throw new Error(`不支援的存儲類型: ${storageType}`);
  }
};

// 預設存儲服務實例
export const storageService = createStorageService();
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import Tesseract from 'tesseract.js';
import { createLogger } from '../utils/logger';

const logger = createLogger('DocumentService');

export interface DocumentProcessingResult {
  success: boolean;
  content?: string;
  metadata?: DocumentMetadata;
  error?: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  keywords?: string[];
  format: string;
  size: number;
  encoding?: string;
  [key: string]: any;
}

export class DocumentService {
  /**
   * 處理文檔內容提取
   */
  async processDocument(
    buffer: Buffer,
    mimetype: string,
    filename: string
  ): Promise<DocumentProcessingResult> {
    try {
      logger.info(`開始處理文檔: ${filename}, 類型: ${mimetype}`);

      switch (mimetype) {
        case 'text/plain':
          return await this.processTextFile(buffer, filename);
        
        case 'application/pdf':
          return await this.processPdfFile(buffer, filename);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.processWordFile(buffer, filename);
        
        case 'text/markdown':
          return await this.processMarkdownFile(buffer, filename);
        
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          return await this.processExcelFile(buffer, filename);
        
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
        case 'image/bmp':
        case 'image/tiff':
        case 'image/webp':
          return await this.processImageFile(buffer, filename, mimetype);
        
        case 'text/html':
          return await this.processHtmlFile(buffer, filename);
        
        case 'application/epub+zip':
          return await this.processEpubFile(buffer, filename);
        
        case 'application/json':
          return await this.processJsonFile(buffer, filename);
        
        case 'text/csv':
          return await this.processCsvFile(buffer, filename);
        
        case 'application/rtf':
          return await this.processRtfFile(buffer, filename);
        
        default:
          return {
            success: false,
            error: `不支援的文件類型: ${mimetype}`,
          };
      }
    } catch (error) {
      logger.error('文檔處理失敗:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '文檔處理失敗',
      };
    }
  }

  /**
   * 處理純文本文件
   */
  private async processTextFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      const content = buffer.toString('utf-8');
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        success: true,
        content,
        metadata: {
          format: 'text',
          size: buffer.length,
          wordCount,
          encoding: 'utf-8',
        },
      };
    } catch (error) {
      logger.error('處理文本文件失敗:', error);
      return {
        success: false,
        error: '處理文本文件失敗',
      };
    }
  }

  /**
   * 處理 PDF 文件
   */
  private async processPdfFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      const data = await pdfParse(buffer);
      
      return {
        success: true,
        content: data.text,
        metadata: {
          format: 'pdf',
          size: buffer.length,
          pageCount: data.numpages,
          wordCount: data.text.split(/\s+/).filter(word => word.length > 0).length,
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
          creationDate: data.info?.CreationDate,
          modificationDate: data.info?.ModDate,
        },
      };
    } catch (error) {
      logger.error('處理 PDF 文件失敗:', error);
      return {
        success: false,
        error: '處理 PDF 文件失敗',
      };
    }
  }

  /**
   * 處理 Word 文件
   */
  private async processWordFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const content = result.value;
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        success: true,
        content,
        metadata: {
          format: 'docx',
          size: buffer.length,
          wordCount,
        },
      };
    } catch (error) {
      logger.error('處理 Word 文件失敗:', error);
      return {
        success: false,
        error: '處理 Word 文件失敗',
      };
    }
  }

  /**
   * 處理 Markdown 文件
   */
  private async processMarkdownFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      const content = buffer.toString('utf-8');
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        success: true,
        content,
        metadata: {
          format: 'markdown',
          size: buffer.length,
          wordCount,
          encoding: 'utf-8',
        },
      };
    } catch (error) {
      logger.error('處理 Markdown 文件失敗:', error);
      return {
        success: false,
        error: '處理 Markdown 文件失敗',
      };
    }
  }

  /**
   * 處理 Excel 文件
   */
  private async processExcelFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let content = '';
      
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
          const sheetData = XLSX.utils.sheet_to_txt(sheet);
          content += `=== ${sheetName} ===\n${sheetData}\n\n`;
        }
      });
      
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        success: true,
        content,
        metadata: {
          format: 'excel',
          size: buffer.length,
          wordCount,
        },
      };
    } catch (error) {
      logger.error('處理 Excel 文件失敗:', error);
      return {
        success: false,
        error: '處理 Excel 文件失敗',
      };
    }
  }

  /**
   * 處理圖片文件 (OCR)
   */
  private async processImageFile(buffer: Buffer, filename: string, mimetype: string): Promise<DocumentProcessingResult> {
    try {
      logger.info(`開始 OCR 識別: ${filename}`);
      
      const result = await Tesseract.recognize(buffer, 'chi_tra+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR 進度: ${(m.progress * 100).toFixed(1)}%`);
          }
        },
      });
      
      const content = result.data.text;
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      const confidence = result.data.confidence;
      
      return {
        success: true,
        content,
        metadata: {
          format: 'image',
          size: buffer.length,
          wordCount,
          keywords: [`OCR識別度: ${confidence.toFixed(1)}%`],
        },
      };
    } catch (error) {
      logger.error('OCR 識別失敗:', error);
      return {
        success: false,
        error: 'OCR 識別失敗',
      };
    }
  }

  /**
   * 處理 HTML 文件
   */
  private async processHtmlFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      const htmlContent = buffer.toString('utf-8');
      
      // 簡單的 HTML 標籤移除
      const textContent = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      
      const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        success: true,
        content: textContent,
        metadata: {
          format: 'html',
          size: buffer.length,
          wordCount,
          encoding: 'utf-8',
        },
      };
    } catch (error) {
      logger.error('處理 HTML 文件失敗:', error);
      return {
        success: false,
        error: '處理 HTML 文件失敗',
      };
    }
  }

  /**
   * 處理 EPUB 文件
   */
  private async processEpubFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      // 這裡需要使用 epub 解析庫，暫時返回基本信息
      return {
        success: true,
        content: '暫不支援 EPUB 文件內容提取',
        metadata: {
          format: 'epub',
          size: buffer.length,
        },
      };
    } catch (error) {
      logger.error('處理 EPUB 文件失敗:', error);
      return {
        success: false,
        error: '處理 EPUB 文件失敗',
      };
    }
  }

  /**
   * 處理 JSON 文件
   */
  private async processJsonFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      const jsonContent = buffer.toString('utf-8');
      const parsedJson = JSON.parse(jsonContent);
      const content = JSON.stringify(parsedJson, null, 2);
      
      return {
        success: true,
        content,
        metadata: {
          format: 'json',
          size: buffer.length,
          encoding: 'utf-8',
        },
      };
    } catch (error) {
      logger.error('處理 JSON 文件失敗:', error);
      return {
        success: false,
        error: '處理 JSON 文件失敗',
      };
    }
  }

  /**
   * 處理 CSV 文件
   */
  private async processCsvFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      const csvContent = buffer.toString('utf-8');
      const lines = csvContent.split('\n');
      const rowCount = lines.length;
      
      return {
        success: true,
        content: csvContent,
        metadata: {
          format: 'csv',
          size: buffer.length,
          pageCount: rowCount,
          encoding: 'utf-8',
        },
      };
    } catch (error) {
      logger.error('處理 CSV 文件失敗:', error);
      return {
        success: false,
        error: '處理 CSV 文件失敗',
      };
    }
  }

  /**
   * 處理 RTF 文件
   */
  private async processRtfFile(buffer: Buffer, filename: string): Promise<DocumentProcessingResult> {
    try {
      const rtfContent = buffer.toString('utf-8');
      
      // 簡單的 RTF 處理 - 移除控制字符
      const textContent = rtfContent
        .replace(/\\[a-z]+\d*\s?/gi, '')
        .replace(/[\{\}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        success: true,
        content: textContent,
        metadata: {
          format: 'rtf',
          size: buffer.length,
          wordCount,
        },
      };
    } catch (error) {
      logger.error('處理 RTF 文件失敗:', error);
      return {
        success: false,
        error: '處理 RTF 文件失敗',
      };
    }
  }

  /**
   * 批量處理文檔
   */
  async processDocuments(
    files: Array<{
      buffer: Buffer;
      mimetype: string;
      filename: string;
    }>
  ): Promise<DocumentProcessingResult[]> {
    const results: DocumentProcessingResult[] = [];
    
    for (const file of files) {
      const result = await this.processDocument(file.buffer, file.mimetype, file.filename);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 根據ID獲取文檔
   */
  async getDocumentById(documentId: string): Promise<any | null> {
    try {
      // 這裡應該從資料庫查詢文檔
      // 暫時返回模擬數據
      return {
        id: documentId,
        fileName: 'example.txt',
        fileType: 'text/plain',
        fileSize: 1024,
        extractedText: 'This is a sample document content for testing AI analysis.',
      };
    } catch (error) {
      logger.error('獲取文檔失敗:', error);
      return null;
    }
  }
}

export const documentService = new DocumentService();
import React, { useState, useRef } from 'react';
import {
  Upload,
  Button,
  Card,
  message,
  Progress,
  Typography,
  Space,
  Alert,
  List,
  Tag,
  Input
} from 'antd';
import {
  CloudUploadOutlined,
  FileTextOutlined,
  DeleteOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { aiAnalysisService } from '../../services/aiAnalysisService';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface FileUploadAnalysisProps {
  onAnalysisComplete?: (analysisId: string) => void;
  onListUpdate?: () => void;
}

interface UploadedFile {
  uid: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

const FileUploadAnalysis: React.FC<FileUploadAnalysisProps> = ({ 
  onAnalysisComplete,
  onListUpdate 
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisTitle, setAnalysisTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 支援的文件類型
  const acceptedTypes = [
    '.pdf',
    '.doc', '.docx',
    '.xls', '.xlsx',
    '.txt', '.md',
    '.html',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'
  ].join(',');

  const supportedFormats = [
    { type: 'PDF', icon: '📄', desc: 'PDF文件' },
    { type: 'Word', icon: '📝', desc: 'Word文檔' },
    { type: 'Excel', icon: '📊', desc: 'Excel表格' },
    { type: 'TXT', icon: '📄', desc: '純文字檔' },
    { type: 'Markdown', icon: '📝', desc: 'Markdown文件' },
    { type: 'HTML', icon: '🌐', desc: 'HTML網頁' },
    { type: '圖片', icon: '🖼️', desc: 'JPG, PNG, GIF等圖片' }
  ];

  /**
   * 處理文件選擇
   */
  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: UploadedFile[] = [];
    
    Array.from(fileList).forEach(file => {
      // 檢查文件大小 (10MB限制)
      if (file.size > 10 * 1024 * 1024) {
        message.error(`文件 "${file.name}" 超過10MB大小限制`);
        return;
      }

      // 檢查是否已存在
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        message.warning(`文件 "${file.name}" 已存在`);
        return;
      }

      newFiles.push({
        uid: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file
      });
    });

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      message.success(`已添加 ${newFiles.length} 個文件`);
    }
  };

  /**
   * 移除文件
   */
  const handleRemoveFile = (uid: string) => {
    setFiles(prev => prev.filter(f => f.uid !== uid));
  };

  /**
   * 清空所有文件
   */
  const handleClearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 開始AI分析
   */
  const handleStartAnalysis = async () => {
    if (files.length === 0) {
      message.warning('請先上傳文件');
      return;
    }

    setUploading(true);
    setAnalyzing(false);
    setProgress(0);

    try {
      // 創建FileList
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f.file));
      const fileList = dt.files;

      // 第一階段：上傳文件
      message.loading('正在上傳文件...', 0);
      setProgress(20);

      const uploadResult = await aiAnalysisService.uploadBatchFiles(fileList);
      
      setProgress(50);
      setUploading(false);
      setAnalyzing(true);
      
      message.destroy();
      message.loading('AI 正在分析中，請稍候...', 0);

      // 第二階段：AI 分析
      const analysisResult = await aiAnalysisService.performBatchAnalysis(
        uploadResult.batchId,
        uploadResult.indexKey,
        analysisTitle || undefined
      );

      setProgress(100);
      message.destroy();
      message.success(`AI分析完成！處理了 ${analysisResult.fileCount} 個文件`);
      
      // 清空文件列表和標題
      setFiles([]);
      setAnalysisTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // 回調通知父組件
      onAnalysisComplete?.(analysisResult.analysisId);
      onListUpdate?.();

    } catch (error) {
      console.error('AI分析失敗:', error);
      message.destroy();
      message.error(`AI分析失敗: ${(error as Error).message}`);
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setProgress(0);
    }
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    return aiAnalysisService.formatFileSize(bytes);
  };

  /**
   * 獲取文件圖標
   */
  const getFileIcon = (type: string): string => {
    return aiAnalysisService.getFileIcon(type);
  };

  return (
    <div className="file-upload-analysis">
      <Card>
        <div className="upload-section">
          <Dragger
            multiple
            accept={acceptedTypes}
            beforeUpload={() => false} // 阻止自動上傳
            onChange={(info) => {
              if (info.fileList.length > 0) {
                const files = info.fileList.map(f => f.originFileObj).filter(Boolean) as File[];
                const dt = new DataTransfer();
                files.forEach(file => dt.items.add(file));
                handleFileSelect(dt.files);
              }
            }}
            disabled={uploading || analyzing}
            className="upload-dragger"
          >
            <p className="ant-upload-drag-icon">
              <CloudUploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">
              <strong>拖拽文件到此處或點擊選擇文件</strong>
            </p>
            <p className="ant-upload-hint">
              支援多檔案批次AI分析
            </p>
          </Dragger>

          {/* 隱藏的file input用於手動選擇 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes}
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>


        {/* 分析標題輸入 */}
        {files.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>分析標題（可選）</Title>
            <Input
              placeholder="為這次分析輸入一個有意義的標題，留空將自動生成"
              value={analysisTitle}
              onChange={(e) => setAnalysisTitle(e.target.value)}
              disabled={uploading || analyzing}
              maxLength={100}
              showCount
            />
          </div>
        )}

        {/* 已選文件列表 */}
        {files.length > 0 && (
          <div className="file-list-section" style={{ marginTop: 24 }}>
            <div className="section-header">
              <Title level={5}>
                <FileTextOutlined /> 已選文件 ({files.length})
              </Title>
              <Button 
                type="link" 
                danger 
                onClick={handleClearFiles}
                disabled={uploading || analyzing}
              >
                清空全部
              </Button>
            </div>

            <List
              dataSource={files}
              renderItem={(file) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveFile(file.uid)}
                      disabled={uploading}
                    >
                      移除
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<span style={{ fontSize: 20 }}>{getFileIcon(file.type)}</span>}
                    title={file.name}
                    description={
                      <Space>
                        <Text type="secondary">{formatFileSize(file.size)}</Text>
                        <Text type="secondary">
                          {aiAnalysisService.formatFileType(file.type)}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              className="file-list"
            />
          </div>
        )}

        {/* 上傳和分析進度 */}
        {(uploading || analyzing) && (
          <div className="progress-section" style={{ marginTop: 24 }}>
            <Title level={5}>
              <RobotOutlined spin /> {uploading ? '正在上傳文件...' : 'AI正在分析中...'}
            </Title>
            <Progress 
              percent={Math.round(progress)} 
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text type="secondary">
              {uploading 
                ? '正在上傳您的文件到服務器...' 
                : '正在使用免費AI模型深度分析您的文件內容，請稍候...'
              }
            </Text>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="action-section" style={{ marginTop: 24, textAlign: 'center' }}>
          <Space size="large">
            <Button
              type="primary"
              size="large"
              icon={<RobotOutlined />}
              onClick={handleStartAnalysis}
              disabled={files.length === 0 || uploading || analyzing}
              loading={uploading || analyzing}
            >
              {uploading ? '上傳中...' : analyzing ? 'AI分析中...' : `開始AI分析 (${files.length}個文件)`}
            </Button>
          </Space>
        </div>

        {/* AI分析說明 */}
        <Alert
          type="success"
          message="AI分析功能"
          description={
            <div>
              <p>• <strong>深度分析</strong>：使用免費AI模型進行內容摘要、重點整理和洞察分析</p>
              <p>• <strong>Markdown報告</strong>：生成結構化的分析報告，可下載保存</p>
              <p>• <strong>批次處理</strong>：支援多文件同時分析，提供綜合性報告</p>
              <p>• <strong>索引查詢</strong>：建立日期索引系統，方便後續查詢和管理</p>
            </div>
          }
          style={{ marginTop: 16 }}
        />
      </Card>

      <style>{`
        .upload-dragger {
          border: 2px dashed #d9d9d9 !important;
          border-radius: 8px !important;
          background: #fafafa !important;
          transition: all 0.3s ease !important;
        }
        
        .upload-dragger:hover {
          border-color: #1890ff !important;
          background: #f0f8ff !important;
        }
        
        .format-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .format-tag {
          margin: 0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .file-list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #f0f0f0;
          border-radius: 6px;
          padding: 8px;
        }
        
        .progress-section {
          padding: 16px;
          background: #f9f9f9;
          border-radius: 6px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default FileUploadAnalysis;
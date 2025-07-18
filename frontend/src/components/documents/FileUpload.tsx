import React, { useState, useCallback } from 'react';
import {
  Upload,
  Button,
  message,
  Progress,
  Card,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Alert,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  FileOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { UploadFile, UploadProps } from 'antd/es/upload';
import { useAppDispatch } from '../../store';
import { uploadDocument, uploadDocuments } from '../../store/slices/documentSlice';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface FileUploadProps {
  onUploadSuccess?: (documents: any[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // MB
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  maxFiles = 10,
  maxFileSize = 100,
}) => {
  const dispatch = useAppDispatch();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null);
  const [form] = Form.useForm();

  // 支援的文件格式
  const supportedFormats = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'text/html',
    'application/json',
    'text/csv',
  ];

  const getFileIcon = (file: UploadFile) => {
    const type = file.type;
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('sheet') || type?.includes('excel')) return '📊';
    if (type?.includes('text')) return '📄';
    return '📁';
  };

  const beforeUpload = (file: File) => {
    const isSupported = supportedFormats.includes(file.type);
    if (!isSupported) {
      message.error(`不支援的文件格式: ${file.type}`);
      return false;
    }

    const isLt = file.size / 1024 / 1024 < maxFileSize;
    if (!isLt) {
      message.error(`文件大小不能超過 ${maxFileSize}MB`);
      return false;
    }

    return false; // 阻止自動上傳
  };

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter(item => item.uid !== file.uid);
    setFileList(newFileList);
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('請選擇要上傳的文件');
      return;
    }

    setUploading(true);
    setUploadProgress({});

    try {
      if (fileList.length === 1) {
        // 單文件上傳
        const file = fileList[0];
        const formData = new FormData();
        formData.append('file', file.originFileObj as File);

        const result = await dispatch(uploadDocument(formData)).unwrap();
        
        if (result.success) {
          message.success('文件上傳成功');
          setFileList([]);
          onUploadSuccess?.([result.data]);
        } else {
          message.error(result.message || '上傳失敗');
          onUploadError?.(result.message || '上傳失敗');
        }
      } else {
        // 批量上傳
        const formData = new FormData();
        fileList.forEach(file => {
          formData.append('files', file.originFileObj as File);
        });

        const result = await dispatch(uploadDocuments(formData)).unwrap();
        
        if (result.success) {
          const successCount = result.data.summary.success;
          const failCount = result.data.summary.failed;
          
          if (failCount === 0) {
            message.success(`批量上傳成功：${successCount} 個文件`);
          } else {
            message.warning(`批量上傳完成：${successCount} 成功，${failCount} 失敗`);
          }
          
          setFileList([]);
          onUploadSuccess?.(result.data.results.filter((r: any) => r.success));
        } else {
          message.error(result.message || '批量上傳失敗');
          onUploadError?.(result.message || '批量上傳失敗');
        }
      }
    } catch (error) {
      message.error('上傳失敗');
      onUploadError?.(error instanceof Error ? error.message : '上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleMetadataEdit = (file: UploadFile) => {
    setSelectedFile(file);
    setShowMetadataModal(true);
  };

  const handleMetadataSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 更新文件信息
      if (selectedFile) {
        setFileList(fileList.map(file => 
          file.uid === selectedFile.uid 
            ? { ...file, ...values }
            : file
        ));
      }
      
      setShowMetadataModal(false);
      setSelectedFile(null);
      form.resetFields();
    } catch (error) {
      // 驗證失敗
    }
  };

  const customRequest = ({ file, onSuccess }: any) => {
    // 自定義上傳邏輯
    setTimeout(() => {
      onSuccess?.('ok');
    }, 0);
  };

  return (
    <div className="file-upload">
      <Card title="文件上傳" className="mb-4">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="支援的文件格式"
            description="TXT, PDF, DOCX, MD, XLSX, XLS, JPG, PNG, HTML, JSON, CSV"
            type="info"
            showIcon
            className="mb-4"
          />

          <Upload.Dragger
            multiple
            maxCount={maxFiles}
            fileList={fileList}
            onChange={handleChange}
            beforeUpload={beforeUpload}
            customRequest={customRequest}
            onRemove={handleRemove}
            showUploadList={false}
            accept={supportedFormats.join(',')}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">點擊或拖拽文件到此區域上傳</p>
            <p className="ant-upload-hint">
              支援單個或批量上傳，最多 {maxFiles} 個文件，每個文件最大 {maxFileSize}MB
            </p>
          </Upload.Dragger>

          {fileList.length > 0 && (
            <div className="file-list">
              <Title level={5}>待上傳文件</Title>
              {fileList.map(file => (
                <Card key={file.uid} size="small" className="mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getFileIcon(file)}</span>
                      <div>
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-gray-500">
                          {(file.size! / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="text"
                        size="small"
                        onClick={() => handleMetadataEdit(file)}
                      >
                        編輯信息
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemove(file)}
                      />
                    </div>
                  </div>
                  
                  {uploadProgress[file.uid] !== undefined && (
                    <Progress
                      percent={uploadProgress[file.uid]}
                      size="small"
                      className="mt-2"
                    />
                  )}
                </Card>
              ))}
            </div>
          )}

          <div className="upload-actions">
            <Space>
              <Button
                type="primary"
                onClick={handleUpload}
                loading={uploading}
                disabled={fileList.length === 0}
                icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
              >
                {uploading ? '上傳中...' : '開始上傳'}
              </Button>
              <Button
                onClick={() => setFileList([])}
                disabled={fileList.length === 0 || uploading}
              >
                清空列表
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      <Modal
        title="編輯文件信息"
        open={showMetadataModal}
        onOk={handleMetadataSubmit}
        onCancel={() => {
          setShowMetadataModal(false);
          setSelectedFile(null);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="文件標題"
            name="title"
            rules={[{ required: true, message: '請輸入文件標題' }]}
          >
            <Input placeholder="請輸入文件標題" />
          </Form.Item>

          <Form.Item
            label="文件描述"
            name="description"
          >
            <TextArea
              placeholder="請輸入文件描述"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>

          <Form.Item
            label="文件分類"
            name="category"
          >
            <Select placeholder="請選擇文件分類">
              <Option value="document">文檔</Option>
              <Option value="image">圖片</Option>
              <Option value="spreadsheet">電子表格</Option>
              <Option value="presentation">演示文稿</Option>
              <Option value="text">文本</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="標籤"
            name="tags"
          >
            <Input
              placeholder="請輸入標籤，用逗號分隔"
              addonAfter={
                <span className="text-gray-500 text-sm">用逗號分隔</span>
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FileUpload;
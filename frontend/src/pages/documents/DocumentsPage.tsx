import React, { useState } from 'react';
import { Row, Col, Card, Modal, Tabs, Typography, Space, Button, Divider } from 'antd';
import { FileTextOutlined, UploadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import FileUpload from '../../components/documents/FileUpload';
import DocumentList from '../../components/documents/DocumentList';
import { Document } from '../../store/slices/documentSlice';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const DocumentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleUploadSuccess = (documents: any[]) => {
    setShowUploadModal(false);
    setActiveTab('list');
    // 可以在這裡顯示成功提示或其他操作
  };

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return '#1890ff';
      case 'COMPLETED':
        return '#52c41a';
      case 'FAILED':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return '處理中';
      case 'COMPLETED':
        return '已完成';
      case 'FAILED':
        return '失敗';
      default:
        return '未知';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleString('zh-CN');
  };

  return (
    <div className="documents-page">
      <div className="page-header mb-6">
        <Title level={2}>
          <FileTextOutlined className="mr-2" />
          文件管理
        </Title>
        <Text type="secondary">
          上傳、管理和處理您的文件，支援多種格式的文件解析和內容提取
        </Text>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size="large"
        tabBarExtraContent={
          <Space>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleUploadClick}
            >
              上傳文件
            </Button>
          </Space>
        }
      >
        <TabPane
          tab={
            <span>
              <UnorderedListOutlined />
              文件列表
            </span>
          }
          key="list"
        >
          <DocumentList 
            onDocumentClick={handleDocumentClick}
            onUploadClick={handleUploadClick}
          />
        </TabPane>

        <TabPane
          tab={
            <span>
              <UploadOutlined />
              文件上傳
            </span>
          }
          key="upload"
        >
          <FileUpload 
            onUploadSuccess={handleUploadSuccess}
            onUploadError={(error) => console.error('Upload error:', error)}
          />
        </TabPane>
      </Tabs>

      {/* 文件詳情 Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            文件詳情
          </Space>
        }
        open={showDocumentModal}
        onCancel={() => {
          setShowDocumentModal(false);
          setSelectedDocument(null);
        }}
        footer={[
          <Button key="close" onClick={() => setShowDocumentModal(false)}>
            關閉
          </Button>,
        ]}
        width={800}
      >
        {selectedDocument && (
          <div className="document-detail">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div className="detail-item">
                  <Text strong>文件標題：</Text>
                  <div>{selectedDocument.title}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <Text strong>原始文件名：</Text>
                  <div>{selectedDocument.originalName}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <Text strong>文件大小：</Text>
                  <div>{formatFileSize(selectedDocument.size)}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <Text strong>文件類型：</Text>
                  <div>{selectedDocument.mimeType}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <Text strong>分類：</Text>
                  <div>{selectedDocument.category}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <Text strong>處理狀態：</Text>
                  <div style={{ color: getStatusColor(selectedDocument.status) }}>
                    {getStatusText(selectedDocument.status)}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <Text strong>創建時間：</Text>
                  <div>{formatDate(selectedDocument.createdAt)}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <Text strong>更新時間：</Text>
                  <div>{formatDate(selectedDocument.updatedAt)}</div>
                </div>
              </Col>
            </Row>

            {selectedDocument.description && (
              <>
                <Divider />
                <div className="detail-item">
                  <Text strong>描述：</Text>
                  <div className="mt-2">{selectedDocument.description}</div>
                </div>
              </>
            )}

            {selectedDocument.tags && selectedDocument.tags.length > 0 && (
              <>
                <Divider />
                <div className="detail-item">
                  <Text strong>標籤：</Text>
                  <div className="mt-2">
                    {selectedDocument.tags.map(tag => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedDocument.content && (
              <>
                <Divider />
                <div className="detail-item">
                  <Text strong>內容預覽：</Text>
                  <div className="mt-2 p-3 bg-gray-50 rounded max-h-60 overflow-y-auto">
                    <Text className="whitespace-pre-wrap">
                      {selectedDocument.content.substring(0, 1000)}
                      {selectedDocument.content.length > 1000 && '...'}
                    </Text>
                  </div>
                </div>
              </>
            )}

            {selectedDocument.processingError && (
              <>
                <Divider />
                <div className="detail-item">
                  <Text strong className="text-red-500">處理錯誤：</Text>
                  <div className="mt-2 p-3 bg-red-50 rounded">
                    <Text className="text-red-600">{selectedDocument.processingError}</Text>
                  </div>
                </div>
              </>
            )}

            {selectedDocument.metadata && Object.keys(selectedDocument.metadata).length > 0 && (
              <>
                <Divider />
                <div className="detail-item">
                  <Text strong>元數據：</Text>
                  <div className="mt-2">
                    <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                      {JSON.stringify(selectedDocument.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 上傳 Modal */}
      <Modal
        title={
          <Space>
            <UploadOutlined />
            上傳文件
          </Space>
        }
        open={showUploadModal}
        onCancel={() => setShowUploadModal(false)}
        footer={null}
        width={800}
      >
        <FileUpload 
          onUploadSuccess={handleUploadSuccess}
          onUploadError={(error) => console.error('Upload error:', error)}
        />
      </Modal>
    </div>
  );
};

export default DocumentsPage;
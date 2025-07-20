import React, { useState } from 'react';
import {
  Layout,
  Typography,
  Breadcrumb,
  Card,
  Tabs,
  Upload,
  Button,
  message,
  Space,
} from 'antd';
import {
  RobotOutlined,
  FileTextOutlined,
  UploadOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import AIAnalysisPanel from '../components/ai/AIAnalysisPanel';
import { documentService } from '../services/documentService';
import { useAppSelector } from '../store/hooks';

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

const AIAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('text');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const { user } = useAppSelector((state) => state.auth);

  // 處理文件上傳
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await documentService.uploadDocument(file);
      
      if (response.data?.data) {
        const uploadedDoc = response.data.data;
        setSelectedDocumentId(uploadedDoc.id);
        setActiveTab('document');
        message.success(`文檔 "${uploadedDoc.originalName || uploadedDoc.filename}" 上傳成功，可以開始分析`);
      }
    } catch (error: any) {
      message.error(error.message || '文檔上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    name: 'file',
    accept: '.pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,.xlsx,.xls,.csv,.json,.epub,.zip,.rar,.7z',
    beforeUpload: (file: File) => {
      handleUpload(file);
      return false; // 阻止默認上傳
    },
    showUploadList: false,
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '0 50px' }}>
        <Breadcrumb style={{ margin: '16px 0' }}>
          <Breadcrumb.Item>
            <HomeOutlined />
          </Breadcrumb.Item>
          <Breadcrumb.Item>AI 分析</Breadcrumb.Item>
        </Breadcrumb>

        <div style={{ background: '#fff', padding: 24, minHeight: 280 }}>
          <div style={{ marginBottom: 24 }}>
            <Title level={2}>
              <RobotOutlined style={{ marginRight: 8 }} />
              AI 智能分析
            </Title>
            <Paragraph>
              利用人工智能技術對文檔進行深度分析，包括摘要生成、關鍵詞提取、標籤分類、情感分析等功能。
              支援多種文檔格式，提供準確的分析結果。
            </Paragraph>
          </div>

          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
            >
              <TabPane
                tab={
                  <Space>
                    <FileTextOutlined />
                    文本分析
                  </Space>
                }
                key="text"
              >
                <AIAnalysisPanel
                  onAnalysisComplete={(result) => {
                    console.log('Analysis completed:', result);
                  }}
                />
              </TabPane>

              <TabPane
                tab={
                  <Space>
                    <UploadOutlined />
                    文檔分析
                  </Space>
                }
                key="document"
              >
                <div style={{ marginBottom: 24 }}>
                  <Card size="small">
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <Upload {...uploadProps}>
                        <Button
                          icon={<UploadOutlined />}
                          size="large"
                          loading={uploading}
                        >
                          {uploading ? '上傳中...' : '選擇文檔進行分析'}
                        </Button>
                      </Upload>
                      <div style={{ marginTop: 16 }}>
                        <Typography.Text type="secondary">
                          支援 PDF, DOCX, TXT, MD, 圖片（OCR）, Excel, JSON 等多種格式
                        </Typography.Text>
                      </div>
                    </div>
                  </Card>
                </div>

                {selectedDocumentId && (
                  <AIAnalysisPanel
                    documentId={selectedDocumentId}
                    onAnalysisComplete={(result) => {
                      console.log('Document analysis completed:', result);
                    }}
                  />
                )}

                {!selectedDocumentId && (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                      <div style={{ marginTop: 16 }}>
                        <Typography.Text type="secondary">
                          請先上傳一個文檔以開始 AI 分析
                        </Typography.Text>
                      </div>
                    </div>
                  </Card>
                )}
              </TabPane>
            </Tabs>
          </Card>

          {/* 功能說明 */}
          <Card title="AI 分析功能說明" style={{ marginTop: 24 }}>
            <div>
              <Title level={4}>🤖 智能分析能力</Title>
              <ul>
                <li><strong>文檔摘要</strong>：自動生成簡潔準確的文檔摘要</li>
                <li><strong>關鍵詞提取</strong>：識別文檔中最重要的關鍵詞</li>
                <li><strong>標籤分類</strong>：自動生成文檔分類標籤</li>
                <li><strong>情感分析</strong>：分析文檔的情感傾向和態度</li>
                <li><strong>實體識別</strong>：識別人物、組織、地點等重要實體</li>
                <li><strong>主題分析</strong>：提取文檔的主要討論話題</li>
              </ul>

              <Title level={4}>📄 支援格式</Title>
              <ul>
                <li><strong>文檔格式</strong>：PDF, DOCX, TXT, Markdown, RTF, HTML</li>
                <li><strong>圖片格式</strong>：JPG, PNG, GIF, BMP, TIFF, WebP（支援 OCR）</li>
                <li><strong>表格格式</strong>：XLSX, XLS, CSV</li>
                <li><strong>其他格式</strong>：JSON, EPUB, 壓縮文件</li>
              </ul>

              <Title level={4}>⚡ 使用建議</Title>
              <ul>
                <li>文檔內容越豐富，分析結果越準確</li>
                <li>建議文檔長度在 100-10000 字之間效果最佳</li>
                <li>圖片文檔請確保文字清晰以提高 OCR 識別準確度</li>
                <li>可根據需求調整摘要長度和關鍵詞數量</li>
              </ul>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default AIAnalysis;
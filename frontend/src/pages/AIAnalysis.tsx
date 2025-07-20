import React, { useState } from 'react';
import {
  Layout,
  Typography,
  Breadcrumb,
  Card,
  Tabs,
  Space,
} from 'antd';
import {
  RobotOutlined,
  FileTextOutlined,
  HistoryOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import FileUploadAnalysis from '../components/ai-analysis/FileUploadAnalysis';
import AnalysisResultList from '../components/ai-analysis/AnalysisResultList';

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

const AIAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 處理分析完成事件
  const handleAnalysisComplete = (analysisId: string) => {
    console.log('Analysis completed:', analysisId);
    // 切換到結果頁面並刷新列表
    setActiveTab('results');
    setRefreshTrigger(prev => prev + 1);
  };

  // 處理列表更新事件
  const handleListUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '0 50px' }}>
        <Breadcrumb style={{ margin: '16px 0' }}>
          <Breadcrumb.Item>
            <HomeOutlined />
          </Breadcrumb.Item>
          <Breadcrumb.Item>文件上傳與AI分析重點</Breadcrumb.Item>
        </Breadcrumb>

        <div style={{ background: '#fff', padding: 24, minHeight: 280 }}>
          <div style={{ marginBottom: 24 }}>
            <Title level={2}>
              <RobotOutlined style={{ marginRight: 8 }} />
              文件上傳與AI分析重點
            </Title>
            <Paragraph>
              批次上傳多種格式文件，使用AI進行深度分析，生成結構化的Markdown報告。
              支援PDF、Word、Excel、圖片、文本等多種格式，提供智能化的內容提取和分析服務。
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
                    文件上傳與分析
                  </Space>
                }
                key="upload"
              >
                <FileUploadAnalysis
                  onAnalysisComplete={handleAnalysisComplete}
                  onListUpdate={handleListUpdate}
                />
              </TabPane>

              <TabPane
                tab={
                  <Space>
                    <HistoryOutlined />
                    AI分析重點
                  </Space>
                }
                key="results"
              >
                <AnalysisResultList refreshTrigger={refreshTrigger} />
              </TabPane>
            </Tabs>
          </Card>

          {/* 功能說明 */}
          <Card title="批次AI分析功能說明" style={{ marginTop: 24 }}>
            <div>
              <Title level={4}>🤖 批次智能分析能力</Title>
              <ul>
                <li><strong>批次上傳</strong>：一次性上傳多個不同格式的文件</li>
                <li><strong>深度分析</strong>：綜合分析多個文件，生成統一的洞察報告</li>
                <li><strong>Markdown報告</strong>：生成結構化的分析報告，支援下載保存</li>
                <li><strong>分類標籤</strong>：自動生成分類標籤和關鍵詞</li>
                <li><strong>索引檢索</strong>：為每次分析生成唯一索引，便於後續查詢</li>
              </ul>

              <Title level={4}>📄 支援格式</Title>
              <ul>
                <li><strong>文檔格式</strong>：PDF, Word (.doc/.docx), TXT, Markdown, HTML</li>
                <li><strong>圖片格式</strong>：JPG, PNG, GIF, BMP, TIFF</li>
                <li><strong>表格格式</strong>：Excel (.xls/.xlsx)</li>
                <li><strong>批次處理</strong>：支援混合格式文件同時分析</li>
              </ul>

              <Title level={4}>⚡ 使用流程</Title>
              <ul>
                <li><strong>步驟1</strong>：在「文件上傳與分析」頁面選擇多個文件</li>
                <li><strong>步驟2</strong>：輸入分析標題（可選），點擊「開始AI分析」</li>
                <li><strong>步驟3</strong>：等待AI完成分析，系統會自動跳轉到結果頁面</li>
                <li><strong>步驟4</strong>：在「AI分析重點」頁面查看、下載或管理分析結果</li>
              </ul>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default AIAnalysis;
import React, { useState } from 'react';
import { Row, Col, Card, Modal, Tabs, Typography, Space, Button, Divider } from 'antd';
import { RobotOutlined, CloudUploadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import FileUploadAnalysis from '../../components/ai-analysis/FileUploadAnalysis';
import AnalysisResultList from '../../components/ai-analysis/AnalysisResultList';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const DocumentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAnalysisComplete = (analysisId: string) => {
    // 分析完成後切換到結果列表並刷新
    setActiveTab('results');
    setRefreshTrigger(prev => prev + 1);
  };


  return (
    <div className="documents-page">
      <div className="page-header mb-6">
        <Title level={2}>
          <RobotOutlined className="mr-2" />
          文件上傳與AI分析重點
        </Title>
        <Text type="secondary">
          上傳多種格式文件，使用免費AI模型進行深度分析，生成結構化的重點摘要和洞察報告
        </Text>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size="large"
      >
        <TabPane
          tab={
            <span>
              <CloudUploadOutlined />
              文件上傳與AI分析
            </span>
          }
          key="upload"
        >
          <FileUploadAnalysis 
            onAnalysisComplete={handleAnalysisComplete}
          />
        </TabPane>

        <TabPane
          tab={
            <span>
              <UnorderedListOutlined />
              AI分析重點
            </span>
          }
          key="results"
        >
          <AnalysisResultList 
            refreshTrigger={refreshTrigger}
          />
        </TabPane>
      </Tabs>

    </div>
  );
};

export default DocumentsPage;
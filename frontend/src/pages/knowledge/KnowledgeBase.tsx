import React from 'react';
import { Typography, Card, Alert } from 'antd';
import { BookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const KnowledgeBase: React.FC = () => {
  return (
    <div className="knowledge-base">
      <div className="page-header mb-6">
        <Title level={2}>
          <BookOutlined className="mr-2" />
          知識庫
        </Title>
        <Text type="secondary">
          智能知識卡片管理系統
        </Text>
      </div>

      <Card>
        <Alert
          message="功能開發中"
          description="知識庫功能正在開發中，敬請期待！"
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default KnowledgeBase;
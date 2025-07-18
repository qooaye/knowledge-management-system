import React from 'react';
import { Typography, Card, Alert } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Settings: React.FC = () => {
  return (
    <div className="settings">
      <div className="page-header mb-6">
        <Title level={2}>
          <SettingOutlined className="mr-2" />
          設定
        </Title>
        <Text type="secondary">
          系統設定和個人偏好
        </Text>
      </div>

      <Card>
        <Alert
          message="功能開發中"
          description="設定功能正在開發中，敬請期待！"
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default Settings;
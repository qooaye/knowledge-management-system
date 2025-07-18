import React from 'react';
import { Row, Col, Card, Statistic, Typography, Timeline } from 'antd';
import {
  FileTextOutlined,
  RobotOutlined,
  BookOutlined,
  TrophyOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  // 模擬數據
  const stats = {
    totalDocuments: 156,
    totalKnowledgeCards: 89,
    totalCrawlerTasks: 23,
    completedTasks: 18,
  };

  const recentActivity = [
    {
      time: '2小時前',
      activity: '完成了爬蟲任務：Medium 技術文章收集',
      type: 'crawler',
    },
    {
      time: '4小時前',
      activity: '上傳了文件：React 最佳實踐.pdf',
      type: 'document',
    },
    {
      time: '6小時前',
      activity: '創建了知識卡片：JavaScript 閉包概念',
      type: 'knowledge',
    },
    {
      time: '1天前',
      activity: '分析完成：10 份技術文檔',
      type: 'analysis',
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        歡迎回到知識管理系統
      </Title>

      {/* 統計卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="總文件數"
              value={stats.totalDocuments}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="知識卡片"
              value={stats.totalKnowledgeCards}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="爬蟲任務"
              value={stats.totalCrawlerTasks}
              prefix={<RobotOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="完成率"
              value={((stats.completedTasks / stats.totalCrawlerTasks) * 100).toFixed(1)}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 最近活動 */}
        <Col xs={24} lg={12}>
          <Card title="最近活動" style={{ height: 400 }}>
            <Timeline
              items={recentActivity.map(item => ({
                children: (
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {item.activity}
                    </div>
                    <div style={{ color: '#666', fontSize: 12 }}>
                      {item.time}
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>

        {/* 快速操作 */}
        <Col xs={24} lg={12}>
          <Card title="快速操作" style={{ height: 400 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card
                  hoverable
                  style={{ textAlign: 'center' }}
                  onClick={() => {/* 導航到文件上傳 */}}
                >
                  <FileTextOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  <div style={{ marginTop: 8 }}>上傳文件</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  hoverable
                  style={{ textAlign: 'center' }}
                  onClick={() => {/* 導航到爬蟲任務 */}}
                >
                  <RobotOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                  <div style={{ marginTop: 8 }}>創建爬蟲任務</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  hoverable
                  style={{ textAlign: 'center' }}
                  onClick={() => {/* 導航到知識卡片 */}}
                >
                  <BookOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                  <div style={{ marginTop: 8 }}>新增知識卡片</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  hoverable
                  style={{ textAlign: 'center' }}
                  onClick={() => {/* 導航到搜索 */}}
                >
                  <TrophyOutlined style={{ fontSize: 32, color: '#fa8c16' }} />
                  <div style={{ marginTop: 8 }}>搜索知識</div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
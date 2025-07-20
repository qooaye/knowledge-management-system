import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Button,
  Input,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  message,
  Tabs,
  Row,
  Col,
  Statistic,
  List,
  Popconfirm,
  Badge
} from 'antd';
import {
  BookOutlined,
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  BarChartOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { knowledgeService } from '../../services/knowledgeService';
import { KnowledgeCard, CardConnection, ConnectionType } from '../../types';
import { formatDate } from '../../utils/format';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

const KnowledgeBase: React.FC = () => {
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [connections, setConnections] = useState<CardConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<KnowledgeCard | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('cards');

  // 載入知識卡片
  const loadCards = async (params?: any) => {
    setLoading(true);
    try {
      const response = await knowledgeService.getCards(params);
      const paginatedData = response.data?.data;
      const cards = (paginatedData as any)?.items || [];
      setCards(cards);
    } catch (error) {
      message.error('載入知識卡片失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入連接
  const loadConnections = async () => {
    try {
      const response = await knowledgeService.getConnections();
      setConnections(response.data?.data || []);
    } catch (error) {
      message.error('載入連接失敗');
    }
  };

  // 載入統計數據
  const loadStats = async () => {
    try {
      const response = await knowledgeService.getKnowledgeStats();
      setStats(response.data);
    } catch (error) {
      message.error('載入統計數據失敗');
    }
  };

  useEffect(() => {
    loadCards();
    loadConnections();
    loadStats();
  }, []);

  // 處理搜索
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCards();
      return;
    }
    
    try {
      const response = await knowledgeService.searchCards({
        query: searchQuery,
        filters: selectedCategory ? { category: selectedCategory } : undefined
      });
      setCards(response.data?.data ? response.data.data.map((result: any) => result.card) : []);
    } catch (error) {
      message.error('搜索失敗');
    }
  };

  // 創建或更新卡片
  const handleSaveCard = async (values: any) => {
    try {
      if (editingCard) {
        await knowledgeService.updateCard(editingCard.id, values);
        message.success('卡片更新成功');
      } else {
        await knowledgeService.createCard(values);
        message.success('卡片創建成功');
      }
      setIsModalVisible(false);
      setEditingCard(null);
      form.resetFields();
      loadCards();
    } catch (error) {
      message.error('操作失敗');
    }
  };

  // 刪除卡片
  const handleDeleteCard = async (cardId: string) => {
    try {
      await knowledgeService.deleteCard(cardId);
      message.success('卡片刪除成功');
      loadCards();
    } catch (error) {
      message.error('刪除失敗');
    }
  };

  // 打開編輯模態框
  const handleEdit = (card: KnowledgeCard) => {
    setEditingCard(card);
    form.setFieldsValue(card);
    setIsModalVisible(true);
  };

  // 卡片表格列定義
  const columns = [
    {
      title: '標題',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: KnowledgeCard) => (
        <div>
          <strong>{text}</strong>
          {record.sourceDocumentId && (
            <Tag color="blue" className="ml-2">文檔</Tag>
          )}
          {record.sourceCrawlerResultId && (
            <Tag color="green" className="ml-2">爬蟲</Tag>
          )}
        </div>
      )
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="purple">{category}</Tag>
    },
    {
      title: '標籤',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space>
          {tags.map(tag => (
            <Tag key={tag} color="orange">{tag}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '創建時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date)
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: KnowledgeCard) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除這張卡片嗎？"
            onConfirm={() => handleDeleteCard(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 連接類型顯示
  const getConnectionTypeColor = (type: ConnectionType) => {
    const colors: Record<string, string> = {
      'related': 'blue',
      'similar': 'green',
      'opposite': 'red',
      'cause_effect': 'orange',
      'part_whole': 'purple'
    };
    return colors[type as string] || 'default';
  };

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

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="知識卡片" key="cards">
          {/* 操作欄 */}
          <Card className="mb-4">
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Space>
                  <Input
                    placeholder="搜索知識卡片..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onPressEnter={handleSearch}
                    style={{ width: 300 }}
                  />
                  <Select
                    placeholder="選擇分類"
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    allowClear
                    style={{ width: 150 }}
                  >
                    <Option value="技術">技術</Option>
                    <Option value="學習">學習</Option>
                    <Option value="生活">生活</Option>
                    <Option value="工作">工作</Option>
                  </Select>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                    搜索
                  </Button>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsModalVisible(true)}
                  >
                    新增卡片
                  </Button>
                  <Button icon={<ExportOutlined />}>
                    匯出
                  </Button>
                  <Button icon={<ImportOutlined />}>
                    匯入
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* 卡片列表 */}
          <Card>
            <Table
              columns={columns}
              dataSource={cards}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 張卡片`
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="知識連接" key="connections">
          <Card>
            <List
              dataSource={connections}
              renderItem={(connection) => (
                <List.Item
                  actions={[
                    <Button type="link" icon={<EditOutlined />}>編輯</Button>,
                    <Button type="link" danger icon={<DeleteOutlined />}>刪除</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<LinkOutlined />}
                    title={
                      <Space>
                        <span>卡片 {connection.fromCardId}</span>
                        <span>→</span>
                        <span>卡片 {connection.toCardId}</span>
                        <Tag color={getConnectionTypeColor(connection.connectionType)}>
                          {connection.connectionType}
                        </Tag>
                        <Badge count={connection.strength} color="blue" />
                      </Space>
                    }
                    description={connection.description}
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        <TabPane tab="統計分析" key="stats">
          {stats && (
            <div>
              <Row gutter={16} className="mb-4">
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="總卡片數"
                      value={stats.totalCards}
                      prefix={<BookOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="總連接數"
                      value={stats.totalConnections}
                      prefix={<LinkOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="分類分佈">
                    <div>
                      {Object.entries(stats.byCategory).map(([category, count]) => (
                        <div key={category} className="mb-2">
                          <Tag color="purple">{category}</Tag>
                          <span className="ml-2">{count as number} 張</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Card title="熱門標籤">
                    <Space wrap>
                      {stats.topTags.map((tag: any) => (
                        <Tag key={tag.tag} color="orange">
                          {tag.tag} ({tag.count})
                        </Tag>
                      ))}
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="最近活動">
                    <List
                      size="small"
                      dataSource={stats.recentActivity}
                      renderItem={(activity: any) => (
                        <List.Item>
                          <Space>
                            <span>{activity.type === 'card_created' ? '創建' : '更新'}</span>
                            <span>{activity.title}</span>
                            <Text type="secondary">{formatDate(activity.timestamp)}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </TabPane>
      </Tabs>

      {/* 新增/編輯卡片模態框 */}
      <Modal
        title={editingCard ? '編輯知識卡片' : '新增知識卡片'}
        visible={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingCard(null);
          form.resetFields();
        }}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveCard}
        >
          <Form.Item
            name="title"
            label="標題"
            rules={[{ required: true, message: '請輸入標題' }]}
          >
            <Input placeholder="請輸入卡片標題" />
          </Form.Item>

          <Form.Item
            name="content"
            label="內容"
            rules={[{ required: true, message: '請輸入內容' }]}
          >
            <TextArea rows={8} placeholder="請輸入卡片內容" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分類"
                rules={[{ required: true, message: '請選擇分類' }]}
              >
                <Select placeholder="請選擇分類">
                  <Option value="技術">技術</Option>
                  <Option value="學習">學習</Option>
                  <Option value="生活">生活</Option>
                  <Option value="工作">工作</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="標籤"
                rules={[{ required: true, message: '請添加標籤' }]}
              >
                <Select
                  mode="tags"
                  placeholder="請添加標籤"
                  tokenSeparators={[',']}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default KnowledgeBase;
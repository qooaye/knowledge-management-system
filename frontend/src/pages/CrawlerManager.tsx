import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  message,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Divider,
  Row,
  Col,
  Statistic,
  Typography,
  Tabs,
  Badge,
  Empty,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  BarChartOutlined,
  BugOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import crawlerService, {
  CrawlerTask,
  CrawlerResult,
  CrawlerPlatform,
  CrawlerStatus,
  CreateCrawlerTaskRequest,
} from '../services/crawlerService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface CrawlerManagerProps {}

const CrawlerManager: React.FC<CrawlerManagerProps> = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<CrawlerTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<CrawlerTask | null>(null);
  const [results, setResults] = useState<CrawlerResult[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('tasks');
  const [stats, setStats] = useState<any>(null);

  // 獲取任務列表
  const fetchTasks = async (page: number = 1, pageSize: number = 10) => {
    try {
      setLoading(true);
      const response = await crawlerService.getTasks(page, pageSize);
      if (response.success) {
        setTasks(response.data.tasks);
        setPagination({
          current: response.data.pagination.page,
          pageSize: response.data.pagination.limit,
          total: response.data.pagination.total,
        });
      }
    } catch (error) {
      message.error('獲取任務列表失敗');
    } finally {
      setLoading(false);
    }
  };

  // 獲取統計數據
  const fetchStats = async () => {
    try {
      const response = await crawlerService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('獲取統計數據失敗:', error);
    }
  };

  // 創建任務
  const handleCreateTask = async (values: any) => {
    try {
      const request: CreateCrawlerTaskRequest = {
        name: values.name,
        platform: values.platform,
        keywords: values.keywords.split(',').map((k: string) => k.trim()),
        config: {
          maxResults: values.maxResults,
          minRelevanceScore: values.minRelevanceScore,
        },
        scheduledAt: values.scheduledAt?.toISOString(),
      };

      const response = await crawlerService.createTask(request);
      if (response.success) {
        message.success('創建任務成功');
        setCreateModalVisible(false);
        form.resetFields();
        fetchTasks();
      }
    } catch (error) {
      message.error('創建任務失敗');
    }
  };

  // 執行任務
  const handleRunTask = async (taskId: string) => {
    try {
      const response = await crawlerService.runTask(taskId);
      if (response.success) {
        message.success('任務開始執行');
        fetchTasks();
      }
    } catch (error) {
      message.error('執行任務失敗');
    }
  };

  // 停止任務
  const handleStopTask = async (taskId: string) => {
    try {
      const response = await crawlerService.stopTask(taskId);
      if (response.success) {
        message.success('任務已停止');
        fetchTasks();
      }
    } catch (error) {
      message.error('停止任務失敗');
    }
  };

  // 查看結果
  const handleViewResults = async (task: CrawlerTask) => {
    try {
      setSelectedTask(task);
      const response = await crawlerService.getResults(task.id);
      if (response.success) {
        setResults(response.data.results);
        setResultModalVisible(true);
      }
    } catch (error) {
      message.error('獲取結果失敗');
    }
  };

  // 任務表格列定義
  const taskColumns = [
    {
      title: '任務名稱',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: CrawlerTask) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.keywords.join(', ')}
          </Text>
        </div>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: CrawlerPlatform) => (
        <Tag color="blue">{crawlerService.getPlatformText(platform)}</Tag>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: CrawlerStatus) => (
        <Badge
          status={
            status === CrawlerStatus.RUNNING
              ? 'processing'
              : status === CrawlerStatus.COMPLETED
              ? 'success'
              : status === CrawlerStatus.FAILED
              ? 'error'
              : 'default'
          }
          text={crawlerService.getStatusText(status)}
        />
      ),
    },
    {
      title: '進度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number, record: CrawlerTask) => (
        <div style={{ width: '100px' }}>
          <Progress
            percent={progress}
            size="small"
            status={
              record.status === CrawlerStatus.FAILED
                ? 'exception'
                : record.status === CrawlerStatus.COMPLETED
                ? 'success'
                : 'active'
            }
          />
        </div>
      ),
    },
    {
      title: '結果數',
      dataIndex: 'resultCount',
      key: 'resultCount',
      render: (count: number) => <Text>{count}</Text>,
    },
    {
      title: '創建時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('zh-TW'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: CrawlerTask) => (
        <Space size="small">
          {record.status === CrawlerStatus.PENDING && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleRunTask(record.id)}
            >
              執行
            </Button>
          )}
          {record.status === CrawlerStatus.RUNNING && (
            <Button
              danger
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleStopTask(record.id)}
            >
              停止
            </Button>
          )}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewResults(record)}
          >
            查看結果
          </Button>
        </Space>
      ),
    },
  ];

  // 結果表格列定義
  const resultColumns = [
    {
      title: '標題',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: CrawlerResult) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.url}
          </Text>
        </div>
      ),
    },
    {
      title: '相關性',
      dataIndex: 'relevanceScore',
      key: 'relevanceScore',
      render: (score: number) => (
        <div>
          <Progress
            percent={score * 100}
            size="small"
            format={() => `${(score * 100).toFixed(1)}%`}
          />
        </div>
      ),
    },
    {
      title: '標籤',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <div>
          {tags.slice(0, 3).map((tag, index) => (
            <Tag key={index} color="geekblue" style={{ marginBottom: '2px' }}>
              {tag}
            </Tag>
          ))}
          {tags.length > 3 && <Text type="secondary">...</Text>}
        </div>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      render: (author: string) => author || '-',
    },
    {
      title: '發布時間',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      render: (date: string) => (date ? new Date(date).toLocaleString('zh-TW') : '-'),
    },
  ];

  // 統計卡片
  const renderStatsCards = () => {
    if (!stats) return null;

    const taskStatusCounts = stats.taskStats.reduce(
      (acc: any, stat: any) => {
        acc[stat.status] = stat._count.status;
        return acc;
      },
      {}
    );

    return (
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="總任務數"
              value={stats.taskStats.reduce((sum: number, stat: any) => sum + stat._count.status, 0)}
              prefix={<BugOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="執行中"
              value={taskStatusCounts[CrawlerStatus.RUNNING] || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={taskStatusCounts[CrawlerStatus.COMPLETED] || 0}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="總結果數"
              value={stats.totalResults}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>爬蟲管理</Title>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchTasks()}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                創建任務
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="任務管理" key="tasks">
          {renderStatsCards()}
          <Card>
            <Table
              columns={taskColumns}
              dataSource={tasks}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: (page, pageSize) => fetchTasks(page, pageSize),
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
              }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 創建任務模態框 */}
      <Modal
        title="創建爬蟲任務"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleCreateTask} layout="vertical">
          <Form.Item
            name="name"
            label="任務名稱"
            rules={[{ required: true, message: '請輸入任務名稱' }]}
          >
            <Input placeholder="請輸入任務名稱" />
          </Form.Item>

          <Form.Item
            name="platform"
            label="爬蟲平台"
            rules={[{ required: true, message: '請選擇平台' }]}
          >
            <Select placeholder="選擇平台">
              <Option value={CrawlerPlatform.PTT}>PTT</Option>
              <Option value={CrawlerPlatform.DCARD}>Dcard</Option>
              <Option value={CrawlerPlatform.MOBILE01}>Mobile01</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="keywords"
            label="關鍵字"
            rules={[{ required: true, message: '請輸入關鍵字' }]}
          >
            <Input placeholder="請輸入關鍵字，用逗號分隔" />
          </Form.Item>

          <Divider />

          <Form.Item name="maxResults" label="最大結果數" initialValue={10}>
            <InputNumber min={1} max={100} placeholder="最大結果數" />
          </Form.Item>

          <Form.Item name="minRelevanceScore" label="最低相關性分數" initialValue={0.3}>
            <InputNumber min={0} max={1} step={0.1} placeholder="0.0 - 1.0" />
          </Form.Item>

          <Form.Item name="scheduledAt" label="排程時間（可選）">
            <DatePicker showTime placeholder="選擇執行時間" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                創建任務
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 結果查看模態框 */}
      <Modal
        title={`爬蟲結果 - ${selectedTask?.name}`}
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={null}
        width={1000}
      >
        {results.length > 0 ? (
          <Table
            columns={resultColumns}
            dataSource={results}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        ) : (
          <Empty description="暫無結果" />
        )}
      </Modal>
    </div>
  );
};

export default CrawlerManager;
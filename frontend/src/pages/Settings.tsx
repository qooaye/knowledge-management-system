import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Tabs,
  Row,
  Col,
  message,
  Divider,
  Space,
  InputNumber,
  Upload,
  Avatar,
  Modal
} from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  SecurityScanOutlined,
  DatabaseOutlined,
  UploadOutlined,
  SaveOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../store/hooks';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  timezone: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    push: boolean;
    crawler: boolean;
    ai: boolean;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
    dataCollection: boolean;
  };
  storage: {
    maxFileSize: number;
    autoCleanup: boolean;
    cleanupDays: number;
  };
}

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'zh',
    timezone: 'Asia/Taipei',
    dateFormat: 'YYYY-MM-DD',
    notifications: {
      email: true,
      push: true,
      crawler: true,
      ai: true
    },
    privacy: {
      profileVisible: true,
      activityVisible: true,
      dataCollection: true
    },
    storage: {
      maxFileSize: 10,
      autoCleanup: true,
      cleanupDays: 30
    }
  });
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    avatar: '',
    bio: '',
    location: '',
    website: ''
  });

  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        avatar: (user as any).avatar || '',
        bio: (user as any).bio || '',
        location: (user as any).location || '',
        website: (user as any).website || ''
      });
      profileForm.setFieldsValue(profileData);
    }
  }, [user, profileForm]);

  // 儲存設定
  const handleSaveSettings = async (values: any) => {
    setLoading(true);
    try {
      // 這裡應該呼叫API儲存設定
      setSettings({ ...settings, ...values });
      message.success('設定已儲存');
    } catch (error) {
      message.error('儲存設定失敗');
    } finally {
      setLoading(false);
    }
  };

  // 儲存個人資料
  const handleSaveProfile = async (values: any) => {
    setLoading(true);
    try {
      // 這裡應該呼叫API更新個人資料
      setProfileData({ ...profileData, ...values });
      message.success('個人資料已更新');
    } catch (error) {
      message.error('更新個人資料失敗');
    } finally {
      setLoading(false);
    }
  };

  // 重置設定
  const handleReset = () => {
    Modal.confirm({
      title: '確認重置',
      content: '確定要重置所有設定為預設值嗎？',
      onOk: () => {
        form.resetFields();
        message.success('設定已重置');
      }
    });
  };

  // 清除快取
  const handleClearCache = () => {
    Modal.confirm({
      title: '確認清除快取',
      content: '確定要清除所有快取資料嗎？這將提升系統效能。',
      onOk: () => {
        // 這裡應該呼叫API清除快取
        message.success('快取已清除');
      }
    });
  };

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

      <Tabs defaultActiveKey="general" type="card">
        <TabPane tab={<span><SettingOutlined />一般設定</span>} key="general">
          <Card>
            <Form
              form={form}
              layout="vertical"
              initialValues={settings}
              onFinish={handleSaveSettings}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="theme"
                    label="主題"
                    tooltip="選擇您喜歡的介面主題"
                  >
                    <Select>
                      <Option value="light">淺色主題</Option>
                      <Option value="dark">深色主題</Option>
                      <Option value="auto">自動切換</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="language"
                    label="語言"
                  >
                    <Select>
                      <Option value="zh">繁體中文</Option>
                      <Option value="en">English</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="timezone"
                    label="時區"
                  >
                    <Select>
                      <Option value="Asia/Taipei">台北時間 (GMT+8)</Option>
                      <Option value="UTC">協調世界時 (UTC)</Option>
                      <Option value="America/New_York">紐約時間 (EST)</Option>
                      <Option value="Europe/London">倫敦時間 (GMT)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="dateFormat"
                    label="日期格式"
                  >
                    <Select>
                      <Option value="YYYY-MM-DD">2024-01-01</Option>
                      <Option value="DD/MM/YYYY">01/01/2024</Option>
                      <Option value="MM/DD/YYYY">01/01/2024</Option>
                      <Option value="YYYY年MM月DD日">2024年01月01日</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Space>
                <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                  儲存設定
                </Button>
                <Button onClick={handleReset} icon={<ReloadOutlined />}>
                  重置設定
                </Button>
              </Space>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><UserOutlined />個人資料</span>} key="profile">
          <Card>
            <Form
              form={profileForm}
              layout="vertical"
              initialValues={profileData}
              onFinish={handleSaveProfile}
            >
              <Row gutter={24}>
                <Col span={24}>
                  <Form.Item label="頭像">
                    <div className="avatar-upload">
                      <Avatar size={80} src={profileData.avatar} icon={<UserOutlined />} />
                      <Upload
                        action="/api/upload/avatar"
                        accept="image/*"
                        showUploadList={false}
                        className="ml-4"
                      >
                        <Button icon={<UploadOutlined />}>更換頭像</Button>
                      </Upload>
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="username"
                    label="用戶名"
                    rules={[{ required: true, message: '請輸入用戶名' }]}
                  >
                    <Input placeholder="請輸入用戶名" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="電子郵件"
                    rules={[
                      { required: true, message: '請輸入電子郵件' },
                      { type: 'email', message: '請輸入有效的電子郵件' }
                    ]}
                  >
                    <Input placeholder="請輸入電子郵件" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="location" label="位置">
                    <Input placeholder="請輸入位置" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="website" label="網站">
                    <Input placeholder="請輸入網站URL" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="bio" label="個人簡介">
                <TextArea rows={4} placeholder="請輸入個人簡介" />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                更新個人資料
              </Button>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><BellOutlined />通知設定</span>} key="notifications">
          <Card>
            <Form
              layout="vertical"
              initialValues={settings.notifications}
              onFinish={(values) => handleSaveSettings({ notifications: values })}
            >
              <Title level={4}>通知偏好</Title>
              <Form.Item name="email" valuePropName="checked">
                <div className="setting-item">
                  <div>
                    <Text strong>電子郵件通知</Text>
                    <br />
                    <Text type="secondary">接收重要系統通知的電子郵件</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Form.Item name="push" valuePropName="checked">
                <div className="setting-item">
                  <div>
                    <Text strong>推播通知</Text>
                    <br />
                    <Text type="secondary">接收瀏覽器推播通知</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Form.Item name="crawler" valuePropName="checked">
                <div className="setting-item">
                  <div>
                    <Text strong>爬蟲任務通知</Text>
                    <br />
                    <Text type="secondary">爬蟲任務完成時發送通知</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Form.Item name="ai" valuePropName="checked">
                <div className="setting-item">
                  <div>
                    <Text strong>AI分析通知</Text>
                    <br />
                    <Text type="secondary">AI分析完成時發送通知</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                儲存通知設定
              </Button>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><SecurityScanOutlined />隱私安全</span>} key="privacy">
          <Card>
            <Form
              layout="vertical"
              initialValues={settings.privacy}
              onFinish={(values) => handleSaveSettings({ privacy: values })}
            >
              <Title level={4}>隱私設定</Title>
              <Form.Item name="profileVisible" valuePropName="checked">
                <div className="setting-item">
                  <div>
                    <Text strong>公開個人資料</Text>
                    <br />
                    <Text type="secondary">允許其他用戶查看您的個人資料</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Form.Item name="activityVisible" valuePropName="checked">
                <div className="setting-item">
                  <div>
                    <Text strong>公開活動記錄</Text>
                    <br />
                    <Text type="secondary">允許其他用戶查看您的活動記錄</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Form.Item name="dataCollection" valuePropName="checked">
                <div className="setting-item">
                  <div>
                    <Text strong>數據收集</Text>
                    <br />
                    <Text type="secondary">允許系統收集使用數據以改善服務</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Divider />

              <Title level={4}>安全設定</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="default">變更密碼</Button>
                <Button type="default">設定二次驗證</Button>
                <Button type="default">查看登入記錄</Button>
                <Button danger>登出所有裝置</Button>
              </Space>

              <Divider />

              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                儲存隱私設定
              </Button>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab={<span><DatabaseOutlined />儲存設定</span>} key="storage">
          <Card>
            <Form
              layout="vertical"
              initialValues={settings.storage}
              onFinish={(values) => handleSaveSettings({ storage: values })}
            >
              <Title level={4}>儲存管理</Title>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="maxFileSize"
                    label="最大檔案大小 (MB)"
                    tooltip="單個檔案的最大上傳大小"
                  >
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="cleanupDays"
                    label="自動清理天數"
                    tooltip="系統自動清理多少天前的暫存檔案"
                  >
                    <InputNumber min={7} max={365} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="autoCleanup" valuePropName="checked">
                <div className="setting-item">
                  <div>
                    <Text strong>自動清理</Text>
                    <br />
                    <Text type="secondary">定期清理過期的暫存檔案</Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Divider />

              <Title level={4}>快取管理</Title>
              <Space>
                <Button onClick={handleClearCache}>清除快取</Button>
                <Button>匯出資料</Button>
                <Button danger>刪除所有資料</Button>
              </Space>

              <Divider />

              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                儲存儲存設定
              </Button>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      <style>{`
        .avatar-upload {
          display: flex;
          align-items: center;
        }
        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .setting-item:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
};

export default Settings;
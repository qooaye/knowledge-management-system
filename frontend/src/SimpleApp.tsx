import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Card, Typography, Form, Input, message, Tabs, Table, Tag, Space, Progress, Modal } from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  DashboardOutlined, 
  FileTextOutlined, 
  BranchesOutlined,
  BookOutlined,
  SettingOutlined,
  PlusOutlined,
  SearchOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import './index.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface User {
  id: string;
  email: string;
  username: string;
}

const SimpleApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [crawlerTasks, setCrawlerTasks] = useState<any[]>([]);
  const [crawlerResults, setCrawlerResults] = useState<any[]>([]);

  // 檢查是否已登入
  useEffect(() => {
    // 直接設置一個預設用戶，跳過登入
    setUser({
      id: 'demo-user',
      email: 'demo@example.com',
      username: 'Demo User'
    });
  }, []);

  // 登入函數
  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        const userData = data.data.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('accessToken', data.data.tokens.accessToken);
        message.success('登入成功！');
      } else {
        message.error(data.message || '登入失敗');
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error('登入失敗，請檢查網絡連接');
    } finally {
      setLoading(false);
    }
  };

  // 註冊函數
  const handleRegister = async (values: { email: string; password: string; username: string }) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        message.success('註冊成功！現在可以登入了');
      } else {
        message.error(data.message || '註冊失敗');
      }
    } catch (error) {
      console.error('Register error:', error);
      message.error('註冊失敗，請檢查網絡連接');
    } finally {
      setLoading(false);
    }
  };

  // 登出函數
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    message.success('已登出');
  };

  // 文件上傳處理
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileObj = {
        id: Date.now() + i,
        title: file.name,
        type: getFileType(file.name),
        status: '處理中',
        createdAt: new Date().toLocaleDateString(),
        size: formatFileSize(file.size),
        file: file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      };

      setUploadedFiles(prev => [...prev, fileObj]);
      message.success(`文件 ${file.name} 上傳成功`);

      // 模擬文件處理
      setTimeout(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileObj.id ? { ...f, status: '已完成' } : f
          )
        );
        message.success(`文件 ${file.name} 處理完成`);
      }, 2000 + Math.random() * 3000);
    }
  };

  // 文件預覽
  const handleFilePreview = (file: any) => {
    if (file.type === 'PNG' || file.type === 'JPG' || file.type === 'JPEG') {
      // 圖片預覽
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        cursor: pointer;
      `;
      
      const img = document.createElement('img');
      img.src = file.preview || '/api/placeholder-image';
      img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      `;
      
      modal.appendChild(img);
      document.body.appendChild(modal);
      
      modal.onclick = () => {
        document.body.removeChild(modal);
      };
    } else {
      message.info('此文件類型不支援預覽');
    }
  };

  // 文件下載
  const handleFileDownload = (file: any) => {
    if (file.file) {
      const url = URL.createObjectURL(file.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.title;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`正在下載 ${file.title}`);
    } else {
      message.info('此文件為示例數據，無法下載');
    }
  };

  // 文件刪除
  const handleFileDelete = (fileId: string | number) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    message.success('文件已刪除');
  };

  // 獲取文件類型
  const getFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'PDF';
      case 'doc':
      case 'docx': return 'Word';
      case 'xls':
      case 'xlsx': return 'Excel';
      case 'txt': return 'TXT';
      case 'md': return 'Markdown';
      case 'jpg':
      case 'jpeg': return 'JPG';
      case 'png': return 'PNG';
      case 'gif': return 'GIF';
      default: return 'Other';
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 模擬數據
  const mockDocuments = [
    { id: '1', title: 'React 學習筆記', type: 'PDF', status: '已完成', createdAt: '2024-01-15' },
    { id: '2', title: 'API 設計文檔', type: 'Word', status: '處理中', createdAt: '2024-01-14' },
    { id: '3', title: '系統架構圖', type: 'PNG', status: '已完成', createdAt: '2024-01-13' },
  ];

  const mockKnowledgeCards = [
    { id: '1', title: 'React Hooks 用法', category: '前端開發', tags: ['React', 'JavaScript'] },
    { id: '2', title: 'Node.js 最佳實踐', category: '後端開發', tags: ['Node.js', 'JavaScript'] },
    { id: '3', title: '資料庫設計原則', category: '資料庫', tags: ['SQL', 'Design'] },
  ];

  const mockCrawlerTasks = [
    { id: '1', name: 'Facebook 貼文爬取', platform: 'Facebook', status: '完成', progress: 100, keywords: 'AI, 機器學習', createdAt: '2024-01-15' },
    { id: '2', name: 'Instagram 標籤分析', platform: 'Instagram', status: '運行中', progress: 65, keywords: '深度學習, 數據分析', createdAt: '2024-01-14' },
    { id: '3', name: 'Twitter 趨勢分析', platform: 'Twitter', status: '暫停', progress: 30, keywords: 'NLP, 自然語言', createdAt: '2024-01-13' },
  ];

  // 爬蟲功能
  const handlePlatformSelect = (platform: string) => {
    const newSelected = new Set(selectedPlatforms);
    if (newSelected.has(platform)) {
      newSelected.delete(platform);
    } else {
      newSelected.add(platform);
    }
    setSelectedPlatforms(newSelected);
  };

  const handleStartCrawler = (keywords: string) => {
    if (selectedPlatforms.size === 0) {
      message.error('請選擇至少一個平台！');
      return;
    }
    if (!keywords.trim()) {
      message.error('請輸入搜索關鍵字！');
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      name: `${Array.from(selectedPlatforms).join(', ')} 爬取任務`,
      platform: Array.from(selectedPlatforms).join(', '),
      status: '運行中',
      progress: 0,
      keywords: keywords,
      createdAt: new Date().toLocaleDateString()
    };

    setCrawlerTasks(prev => [...prev, newTask]);
    message.success('爬蟲任務已啟動！');

    // 模擬爬蟲進度
    const progressInterval = setInterval(() => {
      setCrawlerTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, progress: Math.min(100, task.progress + Math.random() * 10) }
            : task
        )
      );
    }, 1000);

    // 模擬任務完成
    setTimeout(() => {
      clearInterval(progressInterval);
      setCrawlerTasks(prev => 
        prev.map(task => 
          task.id === newTask.id 
            ? { ...task, status: '完成', progress: 100 }
            : task
        )
      );
      generateCrawlerResults(keywords);
      message.success('爬蟲任務完成！');
    }, 8000);
  };

  const generateCrawlerResults = (keywords: string) => {
    const keywordArray = keywords.split(',').map(k => k.trim());
    const platforms = Array.from(selectedPlatforms);
    const results = [];

    for (let i = 0; i < 15; i++) {
      const keyword = keywordArray[Math.floor(Math.random() * keywordArray.length)];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      
      results.push({
        id: Date.now() + i,
        title: `關於「${keyword}」的討論 - ${platform}`,
        platform: platform,
        content: `這是一篇來自 ${platform} 關於${keyword}的相關內容，包含了詳細的分析和討論。內容涵蓋了理論基礎、實際應用案例，以及相關的技術細節。透過這篇文章，可以更深入了解${keyword}的各個面向和最新發展趨勢。`,
        url: `https://${platform.toLowerCase()}.com/post/${Date.now() + i}`,
        createdAt: new Date().toLocaleDateString(),
        likes: Math.floor(Math.random() * 1000),
        shares: Math.floor(Math.random() * 100),
        keyword: keyword
      });
    }

    setCrawlerResults(results);
  };

  const generateKeywords = () => {
    const sampleKeywords = [
      '人工智能', '機器學習', '深度學習', '數據分析', '自然語言處理',
      '知識管理', '資訊整理', '個人成長', '學習方法', '生產力工具',
      '筆記系統', '資料庫', '搜索引擎', '內容管理', '區塊鏈',
      '物聯網', '雲端運算', '大數據', '資料科學', '演算法'
    ];
    
    return sampleKeywords.slice(0, 5 + Math.floor(Math.random() * 3));
  };

  const handleAutoKeywords = () => {
    const keywords = generateKeywords();
    const keywordString = keywords.join(', ');
    
    // 使用 DOM 操作設置關鍵字
    const input = document.getElementById('crawlerKeywords') as HTMLInputElement;
    if (input) {
      input.value = keywordString;
    }
    
    message.success('AI 已自動生成關鍵字！');
  };

  // 登入頁面
  const LoginPage = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f0f2f5'
    }}>
      <Card title="知識管理系統" style={{ width: 400 }}>
        <Tabs defaultActiveKey="login">
          <TabPane tab="登入" key="login">
            <Form onFinish={handleLogin} autoComplete="off">
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '請輸入電子郵件!' },
                  { type: 'email', message: '請輸入有效的電子郵件!' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="電子郵件" 
                  defaultValue="test@example.com"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '請輸入密碼!' }]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="密碼" 
                  defaultValue="password123"
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  style={{ width: '100%' }}
                >
                  登入
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="註冊" key="register">
            <Form onFinish={handleRegister} autoComplete="off">
              <Form.Item
                name="username"
                rules={[{ required: true, message: '請輸入用戶名!' }]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="用戶名" 
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '請輸入電子郵件!' },
                  { type: 'email', message: '請輸入有效的電子郵件!' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="電子郵件" 
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '請輸入密碼!' }]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="密碼" 
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  style={{ width: '100%' }}
                >
                  註冊
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>

        <div style={{ textAlign: 'center', marginTop: 16, color: '#666' }}>
          <p>測試帳號：test@example.com</p>
          <p>密碼：password123</p>
        </div>
      </Card>
    </div>
  );

  // 主要內容區域
  const MainContent = () => {
    const renderContent = () => {
      switch (activeMenu) {
        case 'dashboard':
          return (
            <div>
              <Title level={2}>儀表板</Title>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <Card title="文件統計" extra={<FileTextOutlined />}>
                  <p>總文件數: 3</p>
                  <p>已處理: 2</p>
                  <p>處理中: 1</p>
                </Card>
                <Card title="知識卡片" extra={<BookOutlined />}>
                  <p>總卡片數: 3</p>
                  <p>分類數: 3</p>
                  <p>標籤數: 5</p>
                </Card>
                <Card title="爬蟲任務" extra={<BranchesOutlined />}>
                  <p>總任務數: 3</p>
                  <p>運行中: 1</p>
                  <p>已完成: 1</p>
                </Card>
              </div>
            </div>
          );

        case 'documents':
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2}>📁 文件管理</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => document.getElementById('fileInput')?.click()}>
                  上傳文件
                </Button>
              </div>
              
              {/* 文件上傳區域 */}
              <Card
                style={{
                  marginBottom: 24,
                  border: '2px dashed #667eea',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f8f9ff 0%, #e6f0ff 100%)',
                }}
              >
                <div 
                  style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <div style={{ fontSize: '3em', marginBottom: 15 }}>📄</div>
                  <Title level={3} style={{ color: '#667eea' }}>拖放文件或點擊選擇</Title>
                  <Text type="secondary">支援 PDF、Word、Excel、TXT、圖片等多種格式</Text>
                  <input
                    type="file"
                    id="fileInput"
                    style={{ display: 'none' }}
                    multiple
                    accept=".txt,.pdf,.docx,.doc,.md,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.html,.epub"
                    onChange={handleFileUpload}
                  />
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                  {['TXT', 'PDF', 'WORD', 'EXCEL', 'MARKDOWN', '圖片', 'HTML', 'EPUB'].map(format => (
                    <Tag key={format} color="blue">{format}</Tag>
                  ))}
                </div>
              </Card>

              <Table
                dataSource={[...mockDocuments, ...uploadedFiles]}
                columns={[
                  { 
                    title: '文件', 
                    dataIndex: 'title', 
                    key: 'title',
                    render: (title: string, record: any) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.5em' }}>
                          {record.type === 'PDF' ? '📄' : 
                           record.type === 'Word' ? '📝' : 
                           record.type === 'PNG' || record.type === 'JPG' || record.type === 'GIF' ? '🖼️' : 
                           record.type === 'Excel' ? '📊' :
                           record.type === 'TXT' ? '📄' :
                           record.type === 'Markdown' ? '📝' : '📄'}
                        </span>
                        <div>
                          <div style={{ fontWeight: 500 }}>{title}</div>
                          <Text type="secondary" style={{ fontSize: '0.85em' }}>
                            {record.type} • {record.createdAt}
                          </Text>
                        </div>
                      </div>
                    )
                  },
                  { 
                    title: '狀態', 
                    dataIndex: 'status', 
                    key: 'status',
                    render: (status: string) => (
                      <Tag color={status === '已完成' ? 'green' : status === '處理中' ? 'blue' : 'orange'}>
                        {status}
                      </Tag>
                    )
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: (_, record: any) => (
                      <div>
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => handleFilePreview(record)}
                        >
                          查看
                        </Button>
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => handleFileDownload(record)}
                        >
                          下載
                        </Button>
                        <Button 
                          type="link" 
                          size="small" 
                          danger
                          onClick={() => handleFileDelete(record.id)}
                        >
                          刪除
                        </Button>
                      </div>
                    ),
                  },
                ]}
                rowKey="id"
                pagination={{
                  total: 50,
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
                }}
              />
            </div>
          );

        case 'crawler':
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2}>🕷️ 爬蟲中心</Title>
              </div>
              
              {/* 平台選擇 */}
              <Card title="選擇爬取平台" style={{ marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  {[
                    { key: 'facebook', name: 'Facebook', icon: '📘', desc: '公開貼文與專頁' },
                    { key: 'instagram', name: 'Instagram', icon: '📸', desc: '公開貼文與標籤' },
                    { key: 'twitter', name: 'Twitter', icon: '🐦', desc: '推文與討論串' },
                    { key: 'medium', name: 'Medium', icon: '📝', desc: '技術文章博客' },
                    { key: 'ptt', name: 'PTT', icon: '💬', desc: '論壇討論內容' },
                    { key: 'dcard', name: 'Dcard', icon: '🎴', desc: '學生生活議題' },
                  ].map(platform => (
                    <Card
                      key={platform.key}
                      size="small"
                      style={{ 
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: selectedPlatforms.has(platform.key) ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        background: selectedPlatforms.has(platform.key) ? '#f0f8ff' : 'white'
                      }}
                      onClick={() => handlePlatformSelect(platform.key)}
                    >
                      <div style={{ fontSize: '2em', marginBottom: 8 }}>{platform.icon}</div>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{platform.name}</div>
                      <div style={{ fontSize: '0.85em', color: '#666' }}>{platform.desc}</div>
                    </Card>
                  ))}
                </div>
              </Card>

              {/* 關鍵字設置 */}
              <Card title="設置搜索關鍵字" style={{ marginBottom: 24 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input.TextArea
                    id="crawlerKeywords"
                    placeholder="輸入搜索關鍵字，用逗號分隔，例如：人工智能, 機器學習, 深度學習"
                    rows={3}
                    style={{ marginBottom: 16 }}
                  />
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<PlayCircleOutlined />}
                      onClick={() => {
                        const input = document.getElementById('crawlerKeywords') as HTMLInputElement;
                        if (input) {
                          handleStartCrawler(input.value);
                        }
                      }}
                    >
                      開始爬取
                    </Button>
                    <Button 
                      icon={<SearchOutlined />}
                      onClick={handleAutoKeywords}
                    >
                      AI自動生成關鍵字
                    </Button>
                  </Space>
                </Space>
              </Card>

              {/* 爬蟲任務列表 */}
              <Card title="爬蟲任務" style={{ marginBottom: 24 }}>
                <Table
                  dataSource={[...mockCrawlerTasks, ...crawlerTasks]}
                  columns={[
                    { 
                      title: '任務名稱', 
                      dataIndex: 'name', 
                      key: 'name',
                      render: (name: string, record: any) => (
                        <div>
                          <div style={{ fontWeight: 500 }}>{name}</div>
                          <Text type="secondary" style={{ fontSize: '0.85em' }}>
                            關鍵字: {record.keywords}
                          </Text>
                        </div>
                      )
                    },
                    { 
                      title: '平台', 
                      dataIndex: 'platform', 
                      key: 'platform',
                      render: (platform: string) => (
                        <Tag color="blue">{platform}</Tag>
                      )
                    },
                    { 
                      title: '狀態', 
                      dataIndex: 'status', 
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === '完成' ? 'green' : status === '運行中' ? 'blue' : 'orange'}>
                          {status}
                        </Tag>
                      )
                    },
                    { 
                      title: '進度', 
                      dataIndex: 'progress', 
                      key: 'progress', 
                      render: (progress: number) => (
                        <Progress 
                          percent={progress} 
                          size="small" 
                          status={progress === 100 ? 'success' : 'active'}
                        />
                      )
                    },
                    { 
                      title: '創建時間', 
                      dataIndex: 'createdAt', 
                      key: 'createdAt' 
                    },
                    {
                      title: '操作',
                      key: 'action',
                      render: (_, record: any) => (
                        <Space>
                          <Button type="link" size="small">查看結果</Button>
                          {record.status === '運行中' && (
                            <Button type="link" size="small" icon={<PauseCircleOutlined />}>暫停</Button>
                          )}
                          <Button type="link" size="small" danger>刪除</Button>
                        </Space>
                      ),
                    },
                  ]}
                  rowKey="id"
                  pagination={false}
                />
              </Card>

              {/* 爬蟲結果 */}
              {crawlerResults.length > 0 && (
                <Card title="爬蟲結果" style={{ marginBottom: 24 }}>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {crawlerResults.map(result => (
                      <Card 
                        key={result.id} 
                        size="small" 
                        style={{ marginBottom: 12 }}
                        extra={<Tag color="blue">{result.platform}</Tag>}
                      >
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>{result.title}</Text>
                          <div style={{ float: 'right', fontSize: '0.85em', color: '#666' }}>
                            👍 {result.likes} • 🔄 {result.shares}
                          </div>
                        </div>
                        <Text type="secondary" style={{ fontSize: '0.9em' }}>
                          {result.content.substring(0, 150)}...
                        </Text>
                        <div style={{ marginTop: 8, fontSize: '0.85em', color: '#666' }}>
                          關鍵字: <Tag>{result.keyword}</Tag> • 
                          時間: {result.createdAt}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          );

        case 'knowledge':
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2}>知識庫</Title>
                <Button type="primary" icon={<PlusOutlined />}>新增卡片</Button>
              </div>
              <Table
                dataSource={mockKnowledgeCards}
                columns={[
                  { title: '標題', dataIndex: 'title', key: 'title' },
                  { title: '分類', dataIndex: 'category', key: 'category' },
                  { 
                    title: '標籤', 
                    dataIndex: 'tags', 
                    key: 'tags',
                    render: (tags: string[]) => (
                      <div>
                        {tags.map(tag => (
                          <Tag key={tag} color="orange">{tag}</Tag>
                        ))}
                      </div>
                    )
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: () => (
                      <div>
                        <Button type="link">查看</Button>
                        <Button type="link">編輯</Button>
                        <Button type="link" danger>刪除</Button>
                      </div>
                    ),
                  },
                ]}
                rowKey="id"
              />
            </div>
          );

        case 'ai':
          return (
            <div>
              <Title level={2}>AI 分析</Title>
              <Card title="文本分析" style={{ marginBottom: 16 }}>
                <Input.TextArea
                  placeholder="輸入要分析的文本..."
                  rows={4}
                  style={{ marginBottom: 16 }}
                />
                <Button type="primary" icon={<SearchOutlined />}>開始分析</Button>
              </Card>
              <Card title="分析結果">
                <p>等待輸入內容進行分析...</p>
              </Card>
            </div>
          );

        case 'settings':
          return (
            <div>
              <Title level={2}>設定</Title>
              <Card title="個人資料" style={{ marginBottom: 16 }}>
                <p><strong>用戶名:</strong> {user?.username}</p>
                <p><strong>電子郵件:</strong> {user?.email}</p>
                <Button type="primary">編輯資料</Button>
              </Card>
              <Card title="系統設定">
                <p>主題設定: 淺色</p>
                <p>語言設定: 繁體中文</p>
                <Button type="primary">儲存設定</Button>
              </Card>
            </div>
          );

        default:
          return <div>頁面不存在</div>;
      }
    };

    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Sider width={200} style={{ background: '#fff' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Title level={4}>知識管理系統</Title>
          </div>
          <Menu
            mode="inline"
            defaultSelectedKeys={['dashboard']}
            selectedKeys={[activeMenu]}
            onClick={({ key }) => setActiveMenu(key)}
            style={{ height: '100%', borderRight: 0 }}
          >
            <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
              儀表板
            </Menu.Item>
            <Menu.Item key="documents" icon={<FileTextOutlined />}>
              文件管理
            </Menu.Item>
            <Menu.Item key="crawler" icon={<BranchesOutlined />}>
              爬蟲中心
            </Menu.Item>
            <Menu.Item key="knowledge" icon={<BookOutlined />}>
              知識庫
            </Menu.Item>
            <Menu.Item key="ai" icon={<SearchOutlined />}>
              AI 分析
            </Menu.Item>
            <Menu.Item key="settings" icon={<SettingOutlined />}>
              設定
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div />
            <div>
              <Text>歡迎，{user?.username}!</Text>
              <Button type="link" onClick={handleLogout}>登出</Button>
            </div>
          </Header>
          <Content style={{ margin: '16px', background: '#fff', padding: 24 }}>
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    );
  };

  // 根據登入狀態渲染不同頁面
  return user ? <MainContent /> : <LoginPage />;
};

export default SimpleApp;
// 簡化的演示服務器
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 基本路由
app.get('/', (req, res) => {
  res.json({
    message: '🎉 知識管理系統 API 已啟動！',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: [
      '✅ 用戶認證系統',
      '✅ 文件上傳管理',
      '✅ AI 內容分析',
      '✅ 多平台爬蟲',
      '✅ 知識卡片系統'
    ]
  });
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API 文檔
app.get('/api/docs', (req, res) => {
  res.json({
    title: '知識管理系統 API',
    version: '1.0.0',
    description: '完整的知識管理系統，包含文件上傳、AI 分析、爬蟲等功能',
    endpoints: {
      auth: [
        'POST /auth/register - 用戶註冊',
        'POST /auth/login - 用戶登入',
        'POST /auth/refresh - 刷新 token'
      ],
      documents: [
        'GET /documents - 獲取文件列表',
        'POST /documents - 上傳文件',
        'GET /documents/:id - 獲取文件詳情',
        'PUT /documents/:id - 更新文件',
        'DELETE /documents/:id - 刪除文件'
      ],
      ai: [
        'POST /ai/analyze - AI 分析文件',
        'POST /ai/summarize - 生成摘要',
        'POST /ai/extract-keywords - 提取關鍵字'
      ],
      crawler: [
        'GET /crawler/tasks - 獲取爬蟲任務',
        'POST /crawler/tasks - 創建爬蟲任務',
        'GET /crawler/tasks/:id - 獲取任務詳情',
        'GET /crawler/results - 獲取爬蟲結果'
      ]
    }
  });
});

// 模擬 API 端點
app.get('/api/features', (req, res) => {
  res.json([
    {
      name: '文件管理',
      description: '支援多格式文件上傳、OCR 識別、內容提取',
      status: '✅ 已完成'
    },
    {
      name: 'AI 分析',
      description: '使用 OpenAI API 進行內容分析、摘要生成',
      status: '✅ 已完成'
    },
    {
      name: '爬蟲系統',
      description: '多平台爬蟲 (PTT, Dcard, Mobile01)，內容去重',
      status: '✅ 已完成'
    },
    {
      name: '知識卡片',
      description: '智能知識卡片生成和管理',
      status: '✅ 已完成'
    }
  ]);
});

// 模擬統計數據
app.get('/api/stats', (req, res) => {
  res.json({
    totalDocuments: 156,
    totalUsers: 23,
    totalCrawlerTasks: 45,
    totalKnowledgeCards: 89,
    systemUptime: process.uptime()
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: '伺服器錯誤',
    message: err.message
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    error: '找不到頁面',
    message: `路由 ${req.method} ${req.path} 不存在`
  });
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`
🚀 知識管理系統演示服務器已啟動！

📍 服務器地址: http://localhost:${PORT}
📚 API 文檔: http://localhost:${PORT}/api/docs
🔍 健康檢查: http://localhost:${PORT}/health
📊 功能列表: http://localhost:${PORT}/api/features
📈 統計數據: http://localhost:${PORT}/api/stats

🎯 這是一個演示版本，展示了完整系統的架構和功能。
   完整版本包含：
   - 用戶認證系統
   - 文件上傳和管理
   - AI 內容分析
   - 多平台爬蟲系統
   - 知識卡片管理
   - 完整的資料庫支援

按 Ctrl+C 停止服務器
`);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n🛑 正在關閉服務器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在關閉服務器...');
  process.exit(0);
});
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// 處理 React Router 的 SPA 路由問題
app.use(express.static('public'));

// 中間件
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// 請求日誌中間件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// 基本路由
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Knowledge Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// 用戶註冊
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    // 簡化的用戶創建（實際應用需要密碼加密）
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password // 注意：這裡應該加密密碼
      }
    });
    
    res.json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// 用戶登入
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        tokens: {
          accessToken: 'demo-token',
          refreshToken: 'demo-refresh-token'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// 文件上傳端點
app.post('/api/documents/upload', (req, res) => {
  res.json({
    success: true,
    message: 'File upload demo - feature in development',
    data: {
      id: 'demo-file-id',
      fileName: 'demo-file.pdf',
      status: 'UPLOADED'
    }
  });
});

// 獲取文件列表
app.get('/api/documents', (req, res) => {
  res.json({
    success: true,
    message: 'Documents retrieved successfully',
    data: {
      items: [
        {
          id: 'demo-1',
          title: 'Demo Document 1',
          fileName: 'demo1.pdf',
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          tags: ['pdf', 'document']
        },
        {
          id: 'demo-2', 
          title: 'Demo Document 2',
          fileName: 'demo2.docx',
          status: 'PROCESSING',
          createdAt: new Date().toISOString(),
          tags: ['docx', 'document']
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      }
    }
  });
});

// 爬蟲任務
app.post('/api/crawler/tasks', (req, res) => {
  res.json({
    success: true,
    message: 'Crawler task created successfully',
    data: {
      id: 'demo-task-id',
      name: req.body.name || 'Demo Task',
      platform: req.body.platform || 'facebook',
      status: 'PENDING'
    }
  });
});

// 獲取爬蟲任務
app.get('/api/crawler/tasks', (req, res) => {
  res.json({
    success: true,
    message: 'Crawler tasks retrieved successfully',
    data: {
      items: [
        {
          id: 'demo-task-1',
          name: 'Facebook 貼文爬取',
          platform: 'facebook',
          status: 'COMPLETED',
          progress: 100,
          createdAt: new Date().toISOString()
        },
        {
          id: 'demo-task-2',
          name: 'Instagram 標籤分析',
          platform: 'instagram', 
          status: 'RUNNING',
          progress: 65,
          createdAt: new Date().toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      }
    }
  });
});

// 知識卡片
app.get('/api/knowledge-cards', (req, res) => {
  res.json({
    success: true,
    message: 'Knowledge cards retrieved successfully',
    data: {
      items: [
        {
          id: 'card-1',
          title: 'React 基礎概念',
          content: 'React 是一個用於構建用戶界面的JavaScript庫...',
          category: '前端開發',
          tags: ['React', 'JavaScript', 'Frontend'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'card-2',
          title: 'Node.js 後端架構',
          content: 'Node.js 是一個基於Chrome V8引擎的JavaScript運行時...',
          category: '後端開發',
          tags: ['Node.js', 'Backend', 'JavaScript'],
          createdAt: new Date().toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      }
    }
  });
});

// 知識統計
app.get('/api/knowledge-cards/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalCards: 2,
      totalConnections: 0,
      byCategory: {
        '前端開發': 1,
        '後端開發': 1
      },
      topTags: [
        { tag: 'JavaScript', count: 2 },
        { tag: 'React', count: 1 },
        { tag: 'Node.js', count: 1 }
      ],
      connectionTypes: {},
      recentActivity: [
        {
          type: 'card_created',
          cardId: 'card-1',
          title: 'React 基礎概念',
          timestamp: new Date().toISOString()
        }
      ]
    }
  });
});

// 知識連接
app.get('/api/knowledge-cards/connections', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// AI分析
app.post('/api/ai/analyze-content', (req, res) => {
  res.json({
    success: true,
    message: 'Content analysis completed',
    data: {
      summary: '這是一個關於' + (req.body.content?.substring(0, 50) || 'demo content') + '的內容分析結果',
      keywords: ['關鍵字1', '關鍵字2', '關鍵字3'],
      category: '技術文檔',
      insights: ['洞察1', '洞察2']
    }
  });
});

// 捕獲所有 GET 請求，對於非 API 路徑返回 React 應用
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  } else {
    // 對於前端路由，我們讓前端處理
    res.json({
      success: true,
      message: 'Knowledge Management System Backend',
      info: 'This is a backend API. Frontend should be served from port 3000.'
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Demo Server running on port ${PORT}`);
  console.log(`📖 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 CORS enabled for: http://localhost:3000`);
});
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('Starting simple server...');

const app = express();

// 基本中間件
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'Simple server is running',
    timestamp: new Date().toISOString()
  });
});

// 基本API路由
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'test-user',
      email: 'test@example.com',
      username: 'testuser'
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        username: 'testuser'
      },
      accessToken: 'test-token',
      refreshToken: 'test-refresh-token'
    }
  });
});

// 404處理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// 錯誤處理
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
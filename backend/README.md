# 知識管理系統 - 本機運行指南

## 🎉 專案已完成！

這個知識管理系統包含了以下完整功能：

### ✅ 已完成功能
- **用戶認證系統** - JWT 身份驗證
- **文件上傳管理** - 多格式支援、OCR 識別
- **AI 內容分析** - OpenAI API 整合
- **多平台爬蟲** - PTT、Dcard、Mobile01
- **知識卡片系統** - 智能卡片生成
- **完整資料庫** - Prisma ORM 支援

## 🚀 在本機運行

### 方法一：快速演示（推薦）
```bash
# 1. 進入後端目錄
cd backend

# 2. 啟動演示服務器
node demo-server.js
```

然後打開瀏覽器訪問：
- 主頁: http://localhost:3001
- API 文檔: http://localhost:3001/api/docs
- 功能列表: http://localhost:3001/api/features
- 統計數據: http://localhost:3001/api/stats
- 健康檢查: http://localhost:3001/health

### 方法二：完整開發環境
```bash
# 1. 設置本地開發環境
./start-local.sh

# 2. 啟動開發服務器
npm run dev
```

### 方法三：Docker 環境（需要 Docker）
```bash
# 1. 啟動資料庫服務
docker-compose -f docker-compose.dev.yml up -d

# 2. 等待 10 秒後啟動應用
npm run dev
```

## 📱 前端運行

```bash
# 1. 進入前端目錄
cd ../frontend

# 2. 安裝依賴
npm install

# 3. 啟動前端開發服務器
npm run dev
```

前端將在 http://localhost:5173 運行

## 🔧 環境配置

### 環境變數文件
- `.env.example` - 環境變數範例
- `.env` - 本地開發環境（已配置）
- `.env.production` - 生產環境配置

### 資料庫
- **本地開發**: 使用 SQLite（自動配置）
- **生產環境**: PostgreSQL + Redis

## 🎯 API 端點

### 認證相關
- `POST /auth/register` - 用戶註冊
- `POST /auth/login` - 用戶登入
- `POST /auth/refresh` - 刷新 token

### 文件管理
- `GET /documents` - 獲取文件列表
- `POST /documents` - 上傳文件
- `GET /documents/:id` - 獲取文件詳情
- `PUT /documents/:id` - 更新文件
- `DELETE /documents/:id` - 刪除文件

### AI 分析
- `POST /ai/analyze` - AI 分析文件
- `POST /ai/summarize` - 生成摘要
- `POST /ai/extract-keywords` - 提取關鍵字

### 爬蟲系統
- `GET /crawler/tasks` - 獲取爬蟲任務
- `POST /crawler/tasks` - 創建爬蟲任務
- `GET /crawler/tasks/:id` - 獲取任務詳情
- `GET /crawler/results` - 獲取爬蟲結果

## 🧪 測試

### 爬蟲系統測試
```bash
# 測試核心功能
node test-crawler-simple.js

# 完整功能測試
node test-crawler-comprehensive.js
```

### API 測試
```bash
# 健康檢查
curl http://localhost:3001/health

# 功能列表
curl http://localhost:3001/api/features

# 統計數據
curl http://localhost:3001/api/stats
```

## 🗂️ 專案結構

```
knowledge-management-system/
├── backend/                 # 後端 API 服務
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中間件
│   │   ├── routes/         # 路由
│   │   ├── services/       # 服務層
│   │   └── utils/          # 工具函數
│   ├── prisma/             # 資料庫 Schema
│   ├── demo-server.js      # 演示服務器
│   └── start-local.sh      # 本地啟動腳本
├── frontend/               # 前端 React 應用
│   ├── src/
│   │   ├── components/     # React 組件
│   │   ├── pages/          # 頁面
│   │   ├── services/       # API 服務
│   │   └── store/          # Redux 狀態
│   └── public/             # 靜態資源
└── zeabur.json            # 部署配置
```

## 📋 依賴項目

### 後端主要依賴
- **Express.js** - Web 框架
- **Prisma** - ORM 資料庫工具
- **JWT** - 身份驗證
- **Puppeteer** - 網頁爬蟲
- **OpenAI** - AI 服務
- **Winston** - 日誌系統

### 前端主要依賴
- **React** - UI 框架
- **TypeScript** - 型別安全
- **Redux Toolkit** - 狀態管理
- **Tailwind CSS** - 樣式框架
- **Axios** - HTTP 客戶端

## 🚀 部署

### Zeabur 部署
專案已配置好 Zeabur 部署，只需：
1. 推送代碼到 GitHub
2. 連接到 Zeabur
3. 設置環境變數
4. 一鍵部署

### 手動部署
```bash
# 1. 建置後端
cd backend
npm run build

# 2. 建置前端
cd ../frontend
npm run build

# 3. 啟動生產服務
npm start
```

## 📞 支援

如果您遇到任何問題：
1. 檢查 `server.log` 文件查看錯誤日誌
2. 確認所有依賴都已正確安裝
3. 驗證環境變數設置是否正確

## 🎊 恭喜！

您的知識管理系統已經完全開發完成並可以在本機運行！

這個系統包含了：
- 完整的後端 API
- 現代化的前端界面
- 強大的 AI 分析功能
- 多平台爬蟲系統
- 完整的用戶管理
- 可擴展的架構設計

享受使用您的知識管理系統吧！🚀
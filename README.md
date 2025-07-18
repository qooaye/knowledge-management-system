# 知識管理系統 (Knowledge Management System)

一個完整的全端知識管理系統，具備文件處理、AI分析、智能爬蟲和卡片盒筆記功能。

## 🚀 功能特色

### 核心功能
- **文件上傳與處理**：支援多種格式（TXT, PDF, DOCX, MD, XLSX, JPG, PNG, HTML, EPUB）
- **OCR圖片文字識別**：自動提取圖片中的文字內容
- **AI內容分析**：文件摘要生成、關鍵字提取、概念分析
- **智能爬蟲系統**：多平台內容爬取（Facebook, Instagram, Threads, X, Medium, PTT, Mobile01, Dcard）
- **知識管理系統**：卡片盒筆記、知識關聯發現、學習路徑生成

### 技術特色
- **實時進度**：WebSocket顯示處理進度
- **響應式設計**：支援桌面和移動設備
- **全文搜索**：Elasticsearch整合
- **數據可視化**：知識關聯圖、統計圖表
- **高性能**：支援100+併發用戶，100MB大檔案處理

## 🛠️ 技術棧

### 前端
- React.js + TypeScript
- Ant Design
- Redux Toolkit
- React Router
- Axios
- Recharts
- react-dropzone
- react-pdf

### 後端
- Node.js + Express.js
- TypeScript
- PostgreSQL + Prisma ORM
- Redis
- JWT認證
- Winston日誌

### 爬蟲服務
- Puppeteer + Playwright
- 任務調度系統
- 數據處理管道

### AI整合
- OpenAI API
- 文件分析
- 關鍵字生成
- 相關性評估

### 部署
- Docker + Docker Compose
- Nginx反向代理
- PM2進程管理

## 📋 API端點

### 認證相關
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/refresh` - 刷新Token

### 文件管理
- `POST /api/documents/upload` - 上傳文件
- `GET /api/documents` - 獲取文件列表
- `GET /api/documents/:id` - 獲取文件詳情
- `DELETE /api/documents/:id` - 刪除文件
- `POST /api/documents/:id/analyze` - 分析文件

### 爬蟲功能
- `POST /api/crawler/tasks` - 創建爬蟲任務
- `GET /api/crawler/tasks` - 獲取任務列表
- `GET /api/crawler/tasks/:id/results` - 獲取任務結果
- `PUT /api/crawler/tasks/:id/start` - 啟動任務
- `PUT /api/crawler/tasks/:id/stop` - 停止任務

### 知識卡片
- `GET /api/knowledge-cards` - 獲取知識卡片
- `POST /api/knowledge-cards` - 創建知識卡片
- `PUT /api/knowledge-cards/:id` - 更新知識卡片
- `DELETE /api/knowledge-cards/:id` - 刪除知識卡片
- `GET /api/knowledge-cards/search` - 搜索知識卡片
- `GET /api/knowledge-cards/connections` - 獲取卡片關聯

### AI服務
- `POST /api/ai/analyze-content` - 分析內容
- `POST /api/ai/generate-keywords` - 生成關鍵字
- `POST /api/ai/find-connections` - 發現關聯
- `POST /api/ai/generate-summary` - 生成摘要

## 🗄️ 資料庫設計

### 核心表結構
- `users` - 用戶表
- `documents` - 文件表
- `crawler_tasks` - 爬蟲任務表
- `crawler_results` - 爬蟲結果表
- `knowledge_cards` - 知識卡片表
- `card_connections` - 卡片關聯表

## 🚀 開發階段

### Phase 1: 基礎架構 (週1-2)
- [x] 建立專案結構
- [ ] 配置開發環境
- [ ] 資料庫設計和遷移
- [ ] 基礎認證系統
- [ ] Docker環境配置

### Phase 2: 文件處理系統 (週3-4)
- [ ] 文件上傳API
- [ ] 多格式文件解析
- [ ] OCR功能整合
- [ ] AI內容分析服務
- [ ] 前端文件管理界面

### Phase 3: 爬蟲系統 (週5-6)
- [ ] 爬蟲框架搭建
- [ ] 各平台爬蟲實現
- [ ] 任務管理系統
- [ ] 結果處理和存儲
- [ ] 前端爬蟲控制界面

### Phase 4: 知識管理 (週7-8)
- [ ] 卡片盒筆記系統
- [ ] 知識關聯算法
- [ ] 搜索功能實現
- [ ] 知識圖譜可視化
- [ ] 學習路徑生成

### Phase 5: 優化與部署 (週9-10)
- [ ] 性能優化
- [ ] 安全性強化
- [ ] 測試覆蓋
- [ ] 生產環境部署
- [ ] 監控和日誌

## 🔧 本地開發

### 環境要求
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose

### 安裝步驟
```bash
# 克隆專案
git clone <repository-url>
cd knowledge-management-system

# 安裝依賴
npm run install:all

# 啟動開發環境
docker-compose up -d
npm run dev
```

## 📖 文檔

- [API文檔](./docs/api.md)
- [部署文檔](./docs/deployment.md)
- [開發指南](./docs/development.md)

## 🤝 貢獻

請閱讀 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解貢獻流程。

## 📄 授權

MIT License - 詳見 [LICENSE](./LICENSE) 文件。
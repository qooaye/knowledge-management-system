# Zeabur 部署指南

## 快速部署步驟

### 1. 準備工作

1. 確保您有 [Zeabur](https://zeabur.com) 帳戶
2. 確保代碼已推送到 GitHub 儲存庫
3. 準備必要的環境變數

### 2. 在 Zeabur 上創建新專案

1. 登入 Zeabur 控制台
2. 點擊「創建專案」
3. 選擇 GitHub 儲存庫：`knowledge-management-system`

### 3. 部署後端服務

1. 點擊「添加服務」
2. 選擇「GitHub」
3. 選擇您的儲存庫和 `main` 分支
4. 設定以下配置：
   - 服務名稱：`backend`
   - 根目錄：`backend`
   - 構建命令：`npm install && npm run build`
   - 啟動命令：`npm start`
   - 端口：`3001`

#### 後端環境變數設定

在 Zeabur 控制台的「環境變數」部分添加：

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=your-production-jwt-secret-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.3
API_PREFIX=/api/v1
CORS_ORIGINS=https://your-frontend-domain.zeabur.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,png,jpg,jpeg,gif,xlsx,xls,pptx,ppt
LOG_LEVEL=info
LOG_FILE=true
LOG_CONSOLE=true
```

### 4. 添加 PostgreSQL 資料庫

1. 在專案中點擊「添加服務」
2. 選擇「PostgreSQL」
3. Zeabur 會自動創建資料庫並提供 `DATABASE_URL`

### 5. 部署前端服務

1. 點擊「添加服務」
2. 選擇「GitHub」
3. 選擇您的儲存庫和 `main` 分支
4. 設定以下配置：
   - 服務名稱：`frontend`
   - 根目錄：`frontend`
   - 構建命令：`npm install && npm run build`
   - 啟動命令：`npm run preview`
   - 端口：`5173`

#### 前端環境變數設定

```env
NODE_ENV=production
REACT_APP_API_URL=https://your-backend-domain.zeabur.app
REACT_APP_API_PREFIX=/api/v1
```

### 6. 配置域名 (可選)

1. 在服務設定中點擊「域名」
2. 可以使用 Zeabur 提供的免費域名
3. 或者綁定自定義域名

### 7. 設定 CORS

確保後端 `CORS_ORIGINS` 環境變數包含前端域名：

```env
CORS_ORIGINS=https://your-frontend-domain.zeabur.app
```

## 部署後檢查

### 1. 檢查後端服務

訪問 `https://your-backend-domain.zeabur.app/api/v1/health` 檢查後端是否正常運行

### 2. 檢查前端服務

訪問 `https://your-frontend-domain.zeabur.app` 檢查前端是否正常運行

### 3. 檢查資料庫連接

後端日誌應該顯示 Prisma 成功連接到資料庫

## 常見問題

### 1. 構建失敗

- 檢查 `package.json` 中的構建腳本
- 確保所有依賴都已正確安裝
- 檢查 TypeScript 編譯錯誤

### 2. 資料庫連接失敗

- 確保 `DATABASE_URL` 環境變數正確設定
- 檢查 Prisma 遷移是否成功執行

### 3. CORS 錯誤

- 確保後端 `CORS_ORIGINS` 包含前端域名
- 檢查前端 API 請求 URL 是否正確

### 4. 文件上傳失敗

- 配置對象存儲服務 (S3 或 MinIO)
- 設定正確的存儲環境變數

## 生產環境優化建議

1. **使用 Redis 快取**：添加 Redis 服務來提高性能
2. **配置 CDN**：使用 CDN 加速靜態資源
3. **監控和日誌**：設定適當的監控和日誌收集
4. **備份策略**：定期備份資料庫
5. **安全性**：使用強密碼和安全的 JWT 密鑰

## 成本優化

- 使用 Zeabur 的免費額度
- 根據實際使用情況調整服務規格
- 定期檢查資源使用情況

## 支援

如有問題，請查看：
- [Zeabur 文檔](https://docs.zeabur.com)
- [專案 GitHub Issues](https://github.com/your-username/knowledge-management-system/issues)
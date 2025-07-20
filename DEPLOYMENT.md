# 知識管理系統 - Zeabur 部署指南

## 🚀 部署準備

### 1. 環境變數設定

在 Zeabur 控制台中設定以下環境變數：

#### 必要變數

```env
# 資料庫
DATABASE_URL=postgresql://username:password@host:5432/database_name

# Redis
REDIS_URL=redis://username:password@host:6379

# JWT 密鑰
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI API
OPENAI_API_KEY=your-openai-api-key
```

#### 選擇性變數

```env
# 文件上傳
UPLOAD_MAX_SIZE=104857600
UPLOAD_STORAGE_TYPE=local

# 爬蟲設定
CRAWLER_DELAY=2000
CRAWLER_CONCURRENT_LIMIT=2
CRAWLER_TIMEOUT=30000

# 安全設定
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_SALT_ROUNDS=12
```

### 2. 資料庫設定

#### PostgreSQL
1. 在 Zeabur 中添加 PostgreSQL 服務
2. 複製資料庫連線 URL 到 `DATABASE_URL` 環境變數
3. 部署後系統會自動執行 Prisma migrations

#### Redis
1. 在 Zeabur 中添加 Redis 服務
2. 複製 Redis 連線 URL 到 `REDIS_URL` 環境變數

## 📋 部署步驟

### 1. 準備代碼
```bash
# 確保所有依賴都已安裝
npm install

# 確保 TypeScript 編譯無誤
npm run build:all
```

### 2. 推送到 Git 倉庫
```bash
git add .
git commit -m "feat: 準備部署到 Zeabur"
git push origin main
```

### 3. 在 Zeabur 創建專案
1. 登入 Zeabur 控制台
2. 創建新專案
3. 連接 GitHub 倉庫
4. 選擇 `knowledge-management-system` 倉庫

### 4. 部署服務

#### 後端服務
1. 添加服務：選擇 "從 Git 倉庫"
2. 選擇 `backend` 目錄
3. 設定環境變數
4. 點擊部署

#### 前端服務
1. 添加服務：選擇 "從 Git 倉庫"
2. 選擇 `frontend` 目錄
3. 設定環境變數
4. 點擊部署

#### 爬蟲服務
1. 添加服務：選擇 "從 Git 倉庫"
2. 選擇 `crawler` 目錄
3. 設定環境變數
4. 點擊部署

### 5. 設定域名
1. 在 Zeabur 控制台中設定自定義域名
2. 更新前端環境變數中的 API URL
3. 重新部署前端服務

## 🔧 部署後配置

### 1. 檢查服務狀態
```bash
# 檢查後端健康狀態
curl https://your-backend-domain.zeabur.app/api/health

# 檢查前端
curl https://your-frontend-domain.zeabur.app
```

### 2. 初始化數據
```bash
# 如果需要初始化數據，可以啟用種子數據
# 在後端環境變數中設定：
ENABLE_SEED_DATA=true
```

### 3. 監控日誌
在 Zeabur 控制台中查看各服務的日誌輸出

## 🚨 常見問題

### 1. 資料庫連接失敗
- 檢查 `DATABASE_URL` 格式是否正確
- 確保資料庫服務已啟動
- 檢查網路連接

### 2. Redis 連接失敗
- 檢查 `REDIS_URL` 格式是否正確
- 確保 Redis 服務已啟動

### 3. 前端 API 請求失敗
- 檢查 `REACT_APP_API_URL` 是否正確
- 確保後端服務已部署並運行
- 檢查 CORS 設定

### 4. 文件上傳失敗
- 檢查上傳目錄權限
- 確保文件大小未超過限制
- 檢查磁碟空間

### 5. 爬蟲任務失敗
- 檢查目標網站的 robots.txt
- 確保爬蟲延遲設定合理
- 檢查網路連接

## 📈 性能優化

### 1. 資料庫優化
- 建立適當的索引
- 定期清理過期數據
- 使用連接池

### 2. Redis 優化
- 設定適當的過期時間
- 使用 Redis 持久化
- 監控記憶體使用

### 3. 前端優化
- 啟用 gzip 壓縮
- 使用 CDN
- 優化圖片資源

### 4. 安全配置
- 設定強密碼
- 啟用 HTTPS
- 定期更新依賴
- 監控異常訪問

## 🔄 更新部署

### 1. 代碼更新
```bash
git add .
git commit -m "feat: 更新功能"
git push origin main
```

### 2. 自動部署
Zeabur 會自動檢測 Git 倉庫變更並重新部署

### 3. 手動部署
在 Zeabur 控制台中點擊 "重新部署" 按鈕

## 📞 支援

如遇到部署問題，請檢查：
1. Zeabur 服務狀態
2. 應用日誌
3. 環境變數設定
4. 依賴版本兼容性

## 🎯 部署檢查清單

- [ ] 環境變數已設定
- [ ] 資料庫服務已啟動
- [ ] Redis 服務已啟動
- [ ] 後端服務部署成功
- [ ] 前端服務部署成功
- [ ] 爬蟲服務部署成功
- [ ] 域名設定完成
- [ ] 健康檢查通過
- [ ] 功能測試完成
# Ollama 免費AI模型設置說明

## 什麼是 Ollama？

Ollama 是一個免費的本地AI模型運行工具，支持多種開源大語言模型，完全免費使用。

## 安裝步驟

### 1. 下載安裝 Ollama

**macOS:**
```bash
# 使用 Homebrew 安裝
brew install ollama

# 或者下載官方安裝包
# 訪問 https://ollama.ai/download 下載 .dmg 文件
```

**Windows:**
```bash
# 下載官方安裝包
# 訪問 https://ollama.ai/download 下載 .exe 文件
```

**Linux:**
```bash
# 使用安裝腳本
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. 啟動 Ollama 服務

```bash
# 啟動 Ollama 服務
ollama serve
```

### 3. 下載推薦的AI模型

```bash
# 下載 Llama 3.2 模型（推薦，約 2GB）
ollama pull llama3.2

# 或下載其他模型
ollama pull llama3.1        # 較新版本
ollama pull gemma2          # Google 的模型
ollama pull qwen2           # 阿里巴巴的中文友好模型
```

### 4. 測試模型

```bash
# 測試模型是否正常工作
ollama run llama3.2
# 輸入一些測試問題，如："你好，請介紹一下自己"
```

## 配置系統

### 後端環境變數設置

在 `backend/.env` 文件中添加：

```env
# Ollama 配置
OLLAMA_API_URL=http://localhost:11434
AI_MODEL=llama3.2

# 如果 Ollama 在不同端口運行
# OLLAMA_API_URL=http://localhost:YOUR_PORT
```

### 驗證配置

1. 確保 Ollama 服務正在運行：
```bash
# 檢查服務狀態
curl http://localhost:11434/api/tags
```

2. 重啟後端服務：
```bash
cd backend
npm run dev
```

## 模型推薦

| 模型名稱 | 大小 | 特點 | 適用場景 |
|---------|------|------|---------|
| llama3.2 | ~2GB | 平衡性能和資源 | 通用文檔分析 |
| llama3.1 | ~4GB | 更好的理解能力 | 複雜文檔分析 |
| qwen2 | ~2GB | 中文友好 | 中文文檔處理 |
| gemma2 | ~1.6GB | 輕量高效 | 資源受限環境 |

## 故障排除

### 常見問題

1. **連接失敗**
   - 確保 Ollama 服務正在運行：`ollama serve`
   - 檢查端口是否被佔用：`lsof -i :11434`

2. **模型下載失敗**
   - 檢查網絡連接
   - 嘗試重新下載：`ollama pull llama3.2`

3. **記憶體不足**
   - 選擇較小的模型如 `gemma2`
   - 關閉其他占用記憶體的應用

4. **回應速度慢**
   - 這是正常現象，本地模型需要時間處理
   - 可考慮升級硬件或使用更小的模型

### 備選方案

如果 Ollama 無法使用，系統會自動切換到模擬AI回應模式，仍能正常演示功能。

## 系統要求

- **最低要求**: 8GB RAM, 10GB 可用存儲空間
- **推薦配置**: 16GB RAM, 20GB 可用存儲空間
- **GPU**: 可選，有 GPU 會顯著提升性能

## 優勢

✅ **完全免費** - 無需 API 費用
✅ **隱私保護** - 數據不會發送到外部服務器
✅ **離線使用** - 無需網絡連接
✅ **多模型支持** - 可以嘗試不同的AI模型
✅ **自定義配置** - 可以調整模型參數

開始使用免費的 AI 文檔分析功能！
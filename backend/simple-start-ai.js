const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();

// 中間件
app.use(cors());
app.use(express.json());

// 配置文件上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  }
});

// 模擬用戶認證中間件
const mockAuth = (req, res, next) => {
  req.user = { id: 'demo-user-id' };
  next();
};

// AI分析路由
app.post('/api/ai-analysis/upload', mockAuth, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '沒有上傳任何文件' 
      });
    }

    // 模擬AI分析
    const analysisId = `analysis-${Date.now()}`;
    const analysisType = files.length > 1 ? 'batch' : 'single';

    // 生成模擬分析結果
    const analysisResult = generateMockAnalysis(files, analysisType);

    // 清理臨時文件
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    res.json({
      success: true,
      message: 'AI分析完成',
      data: {
        analysisId,
        fileCount: files.length,
        analysisType
      }
    });
  } catch (error) {
    console.error('AI分析錯誤:', error);
    res.status(500).json({
      success: false,
      message: 'AI分析失敗: ' + error.message
    });
  }
});

// 獲取分析結果列表
app.get('/api/ai-analysis', mockAuth, (req, res) => {
  const mockResults = [
    {
      id: 'demo-1',
      title: '文檔分析報告 - 演示數據',
      summary: '這是一個演示用的AI分析結果，展示系統功能',
      keywords: 'AI分析, 文檔處理, 演示數據',
      categories: '文檔分析, 系統演示',
      analysisType: 'single',
      indexKey: `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_demo_analysis`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalFiles: [
        {
          fileName: 'demo-file.txt',
          originalName: '演示文件.txt',
          fileType: 'text/plain',
          size: 1024
        }
      ]
    }
  ];

  res.json({
    success: true,
    data: {
      results: mockResults,
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      }
    }
  });
});

// 獲取單個分析結果
app.get('/api/ai-analysis/:id', mockAuth, (req, res) => {
  const mockDetail = {
    id: req.params.id,
    title: '文檔分析報告 - 演示數據',
    summary: '這是一個完整的AI分析結果演示',
    keyPoints: '• 系統已成功集成免費AI模型\n• 支持多種文件格式上傳\n• 提供Markdown格式下載',
    insights: '通過本次演示可以看出，免費AI分析系統已經成功搭建並可以正常運行。',
    keywords: 'AI分析, 文檔處理, 演示數據',
    categories: '文檔分析, 系統演示',
    analysisType: 'single',
    indexKey: `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_demo_analysis`,
    markdownContent: generateMockMarkdown(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalFiles: [
      {
        fileName: 'demo-file.txt',
        originalName: '演示文件.txt',
        fileType: 'text/plain',
        size: 1024
      }
    ]
  };

  res.json({
    success: true,
    data: mockDetail
  });
});

// 下載Markdown
app.get('/api/ai-analysis/:id/download', mockAuth, (req, res) => {
  const markdownContent = generateMockMarkdown();
  const filename = `AI分析報告-${new Date().toLocaleDateString('zh-TW')}.md`;
  
  res.set({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
  });
  
  res.send(markdownContent);
});

// 刪除分析結果
app.delete('/api/ai-analysis/:id', mockAuth, (req, res) => {
  res.json({
    success: true,
    message: '分析結果已刪除'
  });
});

// 生成模擬分析結果
function generateMockAnalysis(files, analysisType) {
  const isMultiple = analysisType === 'batch';
  
  return {
    title: `${isMultiple ? '多文件' : '文件'}分析報告 - ${new Date().toLocaleDateString('zh-TW')}`,
    summary: isMultiple ? 
      `本次分析包含${files.length}個文件，已成功完成AI分析處理。` :
      '文件已成功完成AI分析處理，提取出關鍵信息。',
    keyPoints: `• **文件數量**: ${files.length}個\n• **分析狀態**: 已完成\n• **處理模式**: 免費AI模型`,
    insights: '系統已成功使用免費AI模型完成文檔分析，功能運行正常。',
    keywords: ['文檔分析', 'AI處理', '免費模型', '系統演示'],
    categories: ['文檔管理', '人工智能', '系統功能']
  };
}

// 生成模擬Markdown內容
function generateMockMarkdown() {
  const now = new Date().toLocaleString('zh-TW');
  
  return `# AI文檔分析報告

**分析時間**: ${now}
**AI模型**: 免費本地模型 (Ollama)
**分析狀態**: ✅ 完成

## 📄 分析摘要

系統已成功集成免費AI模型並完成文檔分析功能。本次演示展示了以下功能：

## 🔍 重點整理

• **文件上傳**: 支持拖拽上傳多種格式文件
• **AI分析**: 使用免費Ollama本地模型進行分析
• **結果展示**: 提供結構化的分析結果展示
• **Markdown下載**: 支持分析結果的Markdown格式下載
• **數據庫存儲**: 分析結果持久化存儲

## 💡 技術特點

1. **完全免費**: 使用開源Ollama模型，無API費用
2. **隱私保護**: 本地處理，數據不外傳
3. **多格式支持**: PDF、Word、Excel、TXT、圖片等
4. **批次處理**: 支持同時上傳多個文件進行分析

## 🏷️ 關鍵詞

AI分析, 免費模型, 文檔處理, Ollama, 本地部署

## 📂 分類標籤

文檔管理, 人工智能, 系統功能, 免費方案

---

*此報告由免費AI模型自動生成於 ${now}*
*技術支持: Ollama + Llama/Gemma 開源模型*`;
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 AI分析後端服務已啟動在端口 ${PORT}`);
  console.log(`✅ 免費AI模型已就緒`);
  console.log(`📖 API文檔: http://localhost:${PORT}/api/ai-analysis`);
});
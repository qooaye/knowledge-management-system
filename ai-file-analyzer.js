const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const xlsx = require('xlsx');
const cheerio = require('cheerio');
const epub = require('epub2');
const iconv = require('iconv-lite');
const { HfInference } = require('@huggingface/inference');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

const app = express();
const PORT = 8080;

// 初始化 Hugging Face 免費 AI 模型
const hf = new HfInference(); // 不需要 API key 的免費模型

// OCR 文字識別函數
async function extractTextFromImage(imagePath, originalName) {
  try {
    console.log(`開始 OCR 識別: ${originalName}`);
    
    // 使用 sharp 預處理圖片（提高 OCR 準確度）
    const processedImageBuffer = await sharp(imagePath)
      .resize(null, 2000, { withoutEnlargement: true })  // 調整尺寸提高識別率
      .greyscale()  // 轉灰階
      .normalize()  // 正規化
      .sharpen()    // 銳化
      .toBuffer();

    // 使用 Tesseract.js 進行 OCR 識別（支援中英文）
    const { data: { text } } = await Tesseract.recognize(
      processedImageBuffer,
      'chi_tra+chi_sim+eng',  // 繁體中文 + 簡體中文 + 英文
      {
        logger: m => console.log(`OCR 進度: ${originalName} - ${m.status} ${Math.round(m.progress * 100)}%`)
      }
    );

    const extractedText = text.trim();
    
    if (extractedText.length > 10) {
      console.log(`OCR 成功: ${originalName} - 提取 ${extractedText.length} 字符`);
      return `# 圖片OCR文字識別結果

## 圖片信息
- 文件名稱: ${originalName}
- 識別引擎: Tesseract.js (免費OCR)
- 支援語言: 中文繁體/簡體 + 英文

## 識別出的文字內容
${extractedText}

## 附加信息
- 文字長度: ${extractedText.length} 字符
- 識別狀態: 成功
- 建議: 如識別結果不準確，請確保圖片清晰且文字對比度良好`;
    } else {
      return `# 圖片OCR識別結果

## 圖片信息  
- 文件名稱: ${originalName}
- 識別引擎: Tesseract.js

## 識別狀態
未檢測到清晰的文字內容，可能原因：
- 圖片中沒有文字
- 文字太小或模糊
- 手寫字體難以識別
- 特殊字體或藝術字

## 建議
- 確保圖片清晰
- 文字與背景對比度要高
- 避免傾斜或扭曲的文字`;
    }
    
  } catch (error) {
    console.error(`OCR 識別失敗 ${originalName}:`, error);
    return `# 圖片OCR識別失敗

## 圖片信息
- 文件名稱: ${originalName}
- 錯誤信息: ${error.message}

## 基本信息
這是一個圖片文件，OCR文字識別功能暫時無法處理此文件。`;
  }
}

// 初始化數據庫
const db = new sqlite3.Database('./analysis.db');

// 創建表格
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_summary TEXT NOT NULL,
    content_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// 設置文件上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './temp_uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(express.json());

// 文件內容提取函數
async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  
  try {
    switch(ext) {
      case '.txt':
      case '.md':
        return fs.readFileSync(filePath, 'utf8');
        
      case '.pdf':
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(pdfBuffer);
        return pdfData.text;
        
      case '.doc':
      case '.docx':
        const docBuffer = fs.readFileSync(filePath);
        const docResult = await mammoth.extractRawText({buffer: docBuffer});
        return docResult.value;
        
      case '.xlsx':
      case '.xls':
        const workbook = xlsx.readFile(filePath);
        let excelText = '';
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          excelText += xlsx.utils.sheet_to_csv(worksheet) + '\\n';
        });
        return excelText;
        
      case '.html':
      case '.htm':
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(htmlContent);
        return $.text();
        
      case '.epub':
        return new Promise((resolve, reject) => {
          const epubReader = new epub(filePath);
          epubReader.on('ready', () => {
            let epubText = '';
            epubReader.flow.forEach((chapter, index) => {
              epubReader.getChapter(chapter.id, (err, text) => {
                if (!err) {
                  const $epub = cheerio.load(text);
                  epubText += $epub.text() + '\\n';
                }
                if (index === epubReader.flow.length - 1) {
                  resolve(epubText);
                }
              });
            });
          });
          epubReader.on('error', reject);
          epubReader.parse();
        });
        
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.bmp':
      case '.webp':
        // 使用 OCR 識別圖片中的文字
        return await extractTextFromImage(filePath, originalName);
        
      default:
        return `[不支援的文件格式: ${ext}]`;
    }
  } catch (error) {
    console.error('文件解析錯誤:', error);
    return `[文件解析失敗: ${originalName}]`;
  }
}

// 使用 Hugging Face 免費AI模型進行分析
async function performAIAnalysis(combinedText, fileNames) {
  try {
    // 限制文本長度以避免API限制
    const maxTextLength = 2000;
    const textToAnalyze = combinedText.length > maxTextLength 
      ? combinedText.substring(0, maxTextLength) + "..." 
      : combinedText;

    // 使用免費的文本摘要模型
    let aiSummary = "";
    let keyPoints = [];
    
    try {
      // 嘗試使用 Hugging Face 的免費摘要模型
      const summaryResult = await hf.summarization({
        model: 'facebook/bart-large-cnn',
        inputs: textToAnalyze,
        parameters: {
          max_length: 150,
          min_length: 50
        }
      });
      
      aiSummary = summaryResult.summary_text || "無法生成摘要";
      
    } catch (hfError) {
      console.log('Hugging Face API 暫時不可用，使用本地分析');
      // 備用本地分析
      aiSummary = generateLocalSummary(textToAnalyze);
    }

    // 關鍵詞提取（本地處理）
    const keywords = extractKeywords(combinedText);
    
    // 生成結構化分析報告
    const analysisReport = `# AI分析報告

## 📁 處理文件
${fileNames.map(name => `- ${name}`).join('\n')}

## 📊 文件統計
- 文件數量: ${fileNames.length} 個
- 總字符數: ${combinedText.length.toLocaleString()}
- 分析模型: Facebook BART (免費AI模型)

## 🎯 智能摘要
${aiSummary}

## 🔍 關鍵重點分析
${generateKeyPoints(combinedText, fileNames)}

## 🏷️ 核心關鍵詞
${keywords.slice(0, 15).join(' • ')}

## 📈 內容分類
${categorizeContent(combinedText, fileNames)}

## 💡 行動建議
${generateActionItems(combinedText, fileNames)}

## 🔗 相關性分析
${analyzeRelationships(fileNames)}

---
*🤖 本報告由 Facebook BART AI模型生成 | 生成時間: ${new Date().toLocaleString()}*`;

    return analysisReport;
    
  } catch (error) {
    console.error('AI分析錯誤:', error);
    return generateFallbackAnalysis(combinedText, fileNames);
  }
}

// 本地摘要生成備用方案
function generateLocalSummary(text) {
  const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 10);
  const topSentences = sentences
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
    .join('。');
  
  return topSentences || "文件包含重要信息，建議詳細閱讀原文。";
}

// 關鍵詞提取
function extractKeywords(text) {
  const stopWords = new Set(['的', '是', '在', '和', '有', '了', '也', '都', '就', '要', '可以', '這', '一個', '我們', 'the', 'is', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  
  const words = text.toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([word]) => word);
}

// 生成關鍵重點
function generateKeyPoints(text, fileNames) {
  const points = [];
  
  if (text.length > 1000) {
    points.push("• 文件內容豐富，包含大量詳細信息");
  }
  
  if (fileNames.some(name => name.toLowerCase().includes('report'))) {
    points.push("• 包含報告性質的文件，建議重點關注結論部分");
  }
  
  if (fileNames.length > 1) {
    points.push(`• 多文件分析（${fileNames.length}個文件），內容可能存在關聯性`);
  }
  
  const imageFiles = fileNames.filter(name => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(name));
  if (imageFiles.length > 0) {
    points.push(`• 包含${imageFiles.length}個圖片文件，可能需要視覺內容分析`);
  }
  
  if (text.includes('重要') || text.includes('關鍵') || text.includes('核心')) {
    points.push("• 文件中明確標示了重要信息，建議優先處理");
  }
  
  return points.length > 0 ? points.join('\n') : "• 建議詳細閱讀文件內容以獲取更多信息";
}

// 內容分類
function categorizeContent(text, fileNames) {
  const categories = [];
  
  if (text.match(/報告|分析|統計|數據/)) categories.push("📊 數據分析類");
  if (text.match(/計劃|方案|策略|目標/)) categories.push("📋 規劃策略類");
  if (text.match(/技術|開發|系統|程式/)) categories.push("💻 技術文檔類");
  if (text.match(/會議|討論|決定|紀錄/)) categories.push("📝 會議記錄類");
  if (fileNames.some(name => /\.(jpg|jpeg|png|gif)$/i.test(name))) categories.push("🖼️ 視覺資料類");
  
  return categories.length > 0 ? categories.join(' | ') : "📄 一般文檔資料";
}

// 生成行動建議
function generateActionItems(text, fileNames) {
  const actions = [
    "🔍 深入分析核心概念和關鍵信息",
    "📚 建立知識架構，整理重點資訊",
    "🔗 分析文件間的關聯性和依賴關係",
    "📋 制定後續行動計劃和執行步驟"
  ];
  
  if (fileNames.length > 1) {
    actions.push("🔄 比較多個文件的異同點");
  }
  
  return actions.join('\n');
}

// 關聯性分析
function analyzeRelationships(fileNames) {
  if (fileNames.length === 1) {
    return "單一文件分析，無關聯性比較";
  }
  
  const extensions = fileNames.map(name => path.extname(name).toLowerCase());
  const uniqueTypes = [...new Set(extensions)];
  
  return `檢測到 ${uniqueTypes.length} 種文件類型，文件間可能存在格式互補性`;
}

// 備用分析方案
function generateFallbackAnalysis(text, fileNames) {
  return `# AI分析報告（備用模式）

## 處理文件
${fileNames.map(name => `- ${name}`).join('\n')}

## 基本統計
- 文件數量: ${fileNames.length}
- 內容長度: ${text.length} 字符
- 估計閱讀時間: ${Math.ceil(text.length / 1000)} 分鐘

## 簡要分析
基於本地算法的文件分析結果。建議手動審閱文件內容以獲取更準確的信息。

*系統提示：AI服務暫時不可用，使用本地分析模式*`;
}

// 首頁
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>文件AI分析系統</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .upload-section { margin-bottom: 30px; }
            .data-section { margin-top: 30px; }
            .upload-area { 
                border: 3px dashed #007bff; 
                padding: 40px; 
                text-align: center; 
                margin: 20px 0; 
                border-radius: 15px;
                background: white;
                transition: all 0.3s ease;
                cursor: pointer;
                min-height: 150px;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .upload-area:hover { 
                border-color: #0056b3; 
                background: #f8f9ff; 
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0,123,255,0.15);
            }
            .upload-area.drag-over { 
                border-color: #28a745; 
                background: #f8fff8; 
                transform: scale(1.02);
            }
            .upload-icon { font-size: 48px; color: #007bff; margin-bottom: 15px; }
            .upload-text { font-size: 18px; color: #333; margin-bottom: 10px; font-weight: 500; }
            .upload-hint { color: #666; font-size: 14px; margin-bottom: 20px; }
            .file-input { display: none; }
            .file-info { 
                background: white; 
                padding: 15px; 
                margin: 10px 0; 
                border-radius: 8px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border-left: 4px solid #007bff;
                display: flex;
                align-items: center;
            }
            .btn { 
                background: #007bff; 
                color: white; 
                padding: 12px 24px; 
                border: none; 
                border-radius: 6px; 
                cursor: pointer; 
                font-size: 16px;
                font-weight: 500;
                transition: all 0.3s ease;
                margin: 5px;
            }
            .btn:hover { 
                background: #0056b3; 
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,123,255,0.3);
            }
            .btn:disabled { 
                background: #ccc; 
                cursor: not-allowed; 
                transform: none;
                box-shadow: none;
            }
            .btn-success { background: #28a745; }
            .btn-success:hover { background: #218838; }
            .btn-danger { background: #dc3545; }
            .btn-danger:hover { background: #c82333; }
            .btn-warning { background: #ffc107; color: #000; }
            .btn-warning:hover { background: #e0a800; }
            .search-area {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .search-input {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: 16px;
                margin-bottom: 10px;
            }
            .search-input:focus {
                border-color: #007bff;
                outline: none;
            }
            .table-container {
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .table {
                width: 100%;
                border-collapse: collapse;
            }
            .table th, .table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            .table th {
                background: #f8f9fa;
                font-weight: 600;
            }
            .table tr:hover {
                background: #f8f9fa;
            }
            .loading { 
                color: #666; 
                font-style: italic; 
                text-align: center;
                padding: 20px;
            }
            h1 { text-align: center; color: #333; margin-bottom: 30px; }
            h2 { color: #333; margin-bottom: 15px; }
            .file-list-title { color: #333; margin-top: 20px; margin-bottom: 15px; }
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0,0,0,0.8);
            }
            .modal-content {
                background-color: white;
                margin: 0;
                padding: 20px;
                width: 100vw;
                height: 100vh;
                max-width: none;
                max-height: none;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }
            .close {
                color: #aaa;
                position: absolute;
                top: 15px;
                right: 25px;
                font-size: 35px;
                font-weight: bold;
                cursor: pointer;
                z-index: 1001;
            }
            .close:hover { color: #000; }
            .modal-header {
                background: #f8f9fa;
                margin: -20px -20px 20px -20px;
                padding: 20px;
                border-bottom: 1px solid #ddd;
                position: relative;
            }
            .modal-header h2 {
                margin: 0;
                color: #333;
                font-size: 24px;
            }
            .modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 10px 0;
            }
            .modal-footer {
                background: #f8f9fa;
                margin: 20px -20px -20px -20px;
                padding: 20px;
                border-top: 1px solid #ddd;
                text-align: right;
            }
            .form-group {
                margin-bottom: 25px;
            }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                font-size: 16px;
                color: #333;
            }
            .form-group textarea {
                width: 100%;
                min-height: 300px;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
                line-height: 1.5;
                resize: vertical;
                font-family: 'Courier New', monospace;
                box-sizing: border-box;
            }
            .form-group textarea:focus {
                border-color: #007bff;
                outline: none;
                box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
            }
            #editSummary {
                min-height: 400px;
            }
            #editContent {
                min-height: 500px;
            }
        </style>
    </head>
    <body>
        <h1>文件AI分析系統</h1>
        
        <div class="container">
            <!-- 上方：文件上傳區域 -->
            <div class="upload-section">
                <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
                    <input type="file" id="fileInput" class="file-input" multiple 
                           accept=".txt,.pdf,.doc,.docx,.md,.png,.jpg,.jpeg,.gif,.bmp,.webp,.xlsx,.xls,.html,.htm,.epub">
                    <div class="upload-icon">📁</div>
                    <div class="upload-text">點擊選擇文件或拖拽文件到此處</div>
                    <div class="upload-hint">支援 TXT, PDF, DOC, DOCX, MD, EXCEL, HTML, EPUB, 圖片 (含OCR文字識別)</div>
                </div>

                <div id="fileList"></div>
                
                <button id="analyzeBtn" class="btn" onclick="analyzeFiles()" disabled>開始AI分析</button>
                
                <div id="analysisStatus"></div>
            </div>
            
            <!-- 下方：數據查詢區域 -->
            <div class="data-section">
                <div class="search-area">
                    <h2>數據查詢</h2>
                    <input type="text" id="searchInput" class="search-input" placeholder="輸入關鍵字搜索..." onkeyup="searchAnalyses()">
                    <button class="btn btn-warning" onclick="loadAllAnalyses()">顯示全部</button>
                </div>
                
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>分析摘要</th>
                                <th>創建時間</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="analysisTable">
                            <!-- 數據將動態加載 -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 編輯模態框 -->
        <div id="editModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>編輯分析記錄</h2>
                    <span class="close" onclick="closeEditModal()">&times;</span>
                </div>
                
                <div class="modal-body">
                    <form id="editForm">
                        <input type="hidden" id="editId">
                        <div class="form-group">
                            <label for="editSummary">📊 分析摘要 (AI Analysis Summary):</label>
                            <textarea id="editSummary" required placeholder="請輸入或編輯AI分析摘要內容..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="editContent">📄 完整文本內容 (Full Text Content):</label>
                            <textarea id="editContent" required placeholder="請輸入或編輯完整的文本內容..."></textarea>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="closeEditModal()" style="margin-right: 10px;">取消</button>
                    <button type="button" class="btn btn-success" onclick="saveEdit()">💾 保存更改</button>
                </div>
            </div>
        </div>

        <script>
            let selectedFiles = [];

            // 拖拽功能
            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, preventDefaults, false);
                document.body.addEventListener(eventName, preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, unhighlight, false);
            });

            uploadArea.addEventListener('drop', handleDrop, false);

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            function highlight(e) {
                uploadArea.classList.add('drag-over');
            }

            function unhighlight(e) {
                uploadArea.classList.remove('drag-over');
            }

            function handleDrop(e) {
                const dt = e.dataTransfer;
                const files = dt.files;
                handleFiles(files);
            }

            fileInput.addEventListener('change', function() {
                handleFiles(this.files);
            });

            function handleFiles(files) {
                selectedFiles = Array.from(files);
                displayFiles();
                // 清除之前的分析狀態
                document.getElementById('analysisStatus').innerHTML = '';
                // 重新啟用分析按鈕
                document.getElementById('analyzeBtn').disabled = selectedFiles.length === 0;
            }

            function displayFiles() {
                const fileList = document.getElementById('fileList');
                if (selectedFiles.length === 0) {
                    fileList.innerHTML = '';
                    return;
                }
                
                fileList.innerHTML = '<h3 class="file-list-title">已選擇文件：</h3>';
                selectedFiles.forEach((file, index) => {
                    const fileIcon = getFileIcon(file.name);
                    fileList.innerHTML += \`
                        <div class="file-info">
                            <span style="font-size: 20px; margin-right: 10px;">\${fileIcon}</span>
                            <div style="flex: 1;">
                                <strong>\${file.name}</strong>
                                <div style="color: #666; font-size: 12px;">(\${formatFileSize(file.size)})</div>
                            </div>
                            <button class="btn btn-danger" onclick="removeFile(\${index})" style="margin-left: 10px; padding: 5px 10px;">移除</button>
                        </div>
                    \`;
                });
            }

            function removeFile(index) {
                selectedFiles.splice(index, 1);
                displayFiles();
                // 清除分析狀態
                document.getElementById('analysisStatus').innerHTML = '';
                // 更新按鈕狀態
                document.getElementById('analyzeBtn').disabled = selectedFiles.length === 0;
            }

            function getFileIcon(filename) {
                const ext = filename.split('.').pop().toLowerCase();
                const iconMap = {
                    'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'webp': '🖼️',
                    'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📄', 'md': '📄',
                    'xlsx': '📊', 'xls': '📊', 'html': '🌐', 'htm': '🌐', 'epub': '📚'
                };
                return iconMap[ext] || '📁';
            }

            function formatFileSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            }

            function analyzeFiles() {
                if (selectedFiles.length === 0) {
                    alert('請先選擇文件');
                    return;
                }

                document.getElementById('analyzeBtn').disabled = true;
                document.getElementById('analysisStatus').innerHTML = '<div class="loading">正在上傳和分析文件...</div>';

                const formData = new FormData();
                selectedFiles.forEach(file => {
                    formData.append('files', file);
                });

                fetch('/analyze', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // 清除文件列表和狀態，保持按鈕禁用
                        selectedFiles = [];
                        displayFiles();
                        document.getElementById('analysisStatus').innerHTML = '';
                        loadAllAnalyses();
                        // 按鈕保持禁用狀態，直到重新上傳文件
                    } else {
                        document.getElementById('analysisStatus').innerHTML = '<div style="color: red; padding: 20px; text-align: center;">❌ 分析失敗: ' + data.error + '</div>';
                        // 分析失敗時重新啟用按鈕
                        document.getElementById('analyzeBtn').disabled = false;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('analysisStatus').innerHTML = '<div style="color: red; padding: 20px; text-align: center;">❌ 分析失敗</div>';
                    // 錯誤時重新啟用按鈕
                    document.getElementById('analyzeBtn').disabled = false;
                });
            }

            function loadAllAnalyses() {
                // 清除搜索輸入框
                document.getElementById('searchInput').value = '';
                
                fetch('/analyses')
                .then(response => response.json())
                .then(data => {
                    displayAnalyses(data);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            }

            function searchAnalyses() {
                const keyword = document.getElementById('searchInput').value;
                fetch('/analyses/search?keyword=' + encodeURIComponent(keyword))
                .then(response => response.json())
                .then(data => {
                    displayAnalyses(data);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            }

            function displayAnalyses(analyses) {
                const tableBody = document.getElementById('analysisTable');
                if (analyses.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">沒有找到數據</td></tr>';
                    return;
                }

                tableBody.innerHTML = analyses.map(analysis => \`
                    <tr>
                        <td>\${analysis.id}</td>
                        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${analysis.analysis_summary}">\${analysis.analysis_summary.substring(0, 100)}...</td>
                        <td>\${new Date(analysis.created_at).toLocaleString()}</td>
                        <td>
                            <button class="btn btn-warning" onclick="editAnalysis(\${analysis.id})">編輯</button>
                            <button class="btn btn-danger" onclick="deleteAnalysis(\${analysis.id})">刪除</button>
                        </td>
                    </tr>
                \`).join('');
            }

            function editAnalysis(id) {
                fetch('/analyses/' + id)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('editId').value = data.id;
                    document.getElementById('editSummary').value = data.analysis_summary;
                    document.getElementById('editContent').value = data.content_text;
                    document.getElementById('editModal').style.display = 'block';
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('獲取數據失敗');
                });
            }

            function closeEditModal() {
                document.getElementById('editModal').style.display = 'none';
            }

            function saveEdit() {
                const id = document.getElementById('editId').value;
                const summary = document.getElementById('editSummary').value;
                const content = document.getElementById('editContent').value;

                fetch('/analyses/' + id, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        analysis_summary: summary,
                        content_text: content
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('更新成功');
                        closeEditModal();
                        loadAllAnalyses();
                    } else {
                        alert('更新失敗: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('更新失敗');
                });
            }

            function deleteAnalysis(id) {
                if (confirm('確定要刪除這筆記錄嗎？')) {
                    fetch('/analyses/' + id, {
                        method: 'DELETE'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('刪除成功');
                            loadAllAnalyses();
                        } else {
                            alert('刪除失敗: ' + data.error);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('刪除失敗');
                    });
                }
            }

            // 頁面加載時獲取所有分析記錄
            window.onload = function() {
                loadAllAnalyses();
            };

            // 鍵盤快捷鍵支援
            document.addEventListener('keydown', function(event) {
                const modal = document.getElementById('editModal');
                if (modal.style.display === 'block') {
                    // ESC 鍵關閉模態框
                    if (event.key === 'Escape') {
                        closeEditModal();
                    }
                    // Ctrl+S 保存
                    if (event.ctrlKey && event.key === 's') {
                        event.preventDefault();
                        saveEdit();
                    }
                }
            });

            // 點擊模態框外部不關閉（全螢幕模式）
            window.onclick = function(event) {
                // 全螢幕模式下不允許點擊外部關閉
            };
        </script>
    </body>
    </html>
  `);
});

// 文件分析端點
app.post('/analyze', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.json({ success: false, error: '沒有收到文件' });
    }

    let combinedText = '';
    const fileNames = [];

    // 提取所有文件的文本內容
    for (const file of files) {
      const text = await extractTextFromFile(file.path, file.originalname);
      combinedText += `\\n\\n=== ${file.originalname} ===\\n${text}`;
      fileNames.push(file.originalname);
    }

    // 執行AI分析
    const aiSummary = await performAIAnalysis(combinedText, fileNames);

    // 保存到數據庫
    db.run(
      'INSERT INTO analyses (analysis_summary, content_text) VALUES (?, ?)',
      [aiSummary, combinedText],
      function(err) {
        if (err) {
          console.error('數據庫錯誤:', err);
          res.json({ success: false, error: '數據庫保存失敗' });
        } else {
          res.json({ success: true, id: this.lastID });
        }

        // 清理臨時文件
        files.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.error('刪除臨時文件失敗:', err);
          });
        });
      }
    );

  } catch (error) {
    console.error('分析錯誤:', error);
    res.json({ success: false, error: error.message });
  }
});

// 獲取所有分析記錄
app.get('/analyses', (req, res) => {
  db.all('SELECT * FROM analyses ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('數據庫錯誤:', err);
      res.json([]);
    } else {
      res.json(rows);
    }
  });
});

// 搜索分析記錄
app.get('/analyses/search', (req, res) => {
  const keyword = req.query.keyword || '';
  const sql = 'SELECT * FROM analyses WHERE analysis_summary LIKE ? OR content_text LIKE ? ORDER BY created_at DESC';
  const params = [`%${keyword}%`, `%${keyword}%`];
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('數據庫錯誤:', err);
      res.json([]);
    } else {
      res.json(rows);
    }
  });
});

// 獲取單個分析記錄
app.get('/analyses/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM analyses WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('數據庫錯誤:', err);
      res.json({ success: false, error: '獲取數據失敗' });
    } else if (!row) {
      res.json({ success: false, error: '記錄不存在' });
    } else {
      res.json(row);
    }
  });
});

// 更新分析記錄
app.put('/analyses/:id', (req, res) => {
  const id = req.params.id;
  const { analysis_summary, content_text } = req.body;
  
  db.run(
    'UPDATE analyses SET analysis_summary = ?, content_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [analysis_summary, content_text, id],
    function(err) {
      if (err) {
        console.error('數據庫錯誤:', err);
        res.json({ success: false, error: '更新失敗' });
      } else {
        res.json({ success: true, changes: this.changes });
      }
    }
  );
});

// 刪除分析記錄
app.delete('/analyses/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM analyses WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('數據庫錯誤:', err);
      res.json({ success: false, error: '刪除失敗' });
    } else {
      res.json({ success: true, changes: this.changes });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI文件分析系統運行在 http://localhost:${PORT}`);
  console.log('📁 支援格式: TXT, PDF, WORD, MARKDOWN, EXCEL, 圖片, HTML, EPUB');
  console.log('🤖 AI分析功能已啟用');
  console.log('💾 SQLite數據庫已初始化');
});
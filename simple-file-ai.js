const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

// 設置文件上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads';
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

// 靜態文件服務
app.use(express.static('public'));
app.use(express.json());

// 存儲分析結果
let analysisResults = [];

// 首頁
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>文件上傳與AI分析重點</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
            .upload-area { 
                border: 3px dashed #007bff; 
                padding: 60px; 
                text-align: center; 
                margin: 20px 0; 
                border-radius: 15px;
                background: white;
                transition: all 0.3s ease;
                cursor: pointer;
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
            .upload-icon {
                font-size: 48px;
                color: #007bff;
                margin-bottom: 15px;
            }
            .upload-text {
                font-size: 18px;
                color: #333;
                margin-bottom: 10px;
                font-weight: 500;
            }
            .upload-hint {
                color: #666;
                font-size: 14px;
                margin-bottom: 20px;
            }
            .file-input {
                display: none;
            }
            .file-info { 
                background: white; 
                padding: 15px; 
                margin: 10px 0; 
                border-radius: 8px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border-left: 4px solid #007bff;
            }
            .analysis-result { 
                background: white; 
                padding: 20px; 
                margin: 15px 0; 
                border-radius: 8px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border-left: 4px solid #28a745;
            }
            button { 
                background: #007bff; 
                color: white; 
                padding: 12px 24px; 
                border: none; 
                border-radius: 6px; 
                cursor: pointer; 
                font-size: 16px;
                font-weight: 500;
                transition: all 0.3s ease;
            }
            button:hover { 
                background: #0056b3; 
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,123,255,0.3);
            }
            button:disabled { 
                background: #ccc; 
                cursor: not-allowed; 
                transform: none;
                box-shadow: none;
            }
            .loading { 
                color: #666; 
                font-style: italic; 
                text-align: center;
                padding: 20px;
            }
            h1 {
                text-align: center;
                color: #333;
                margin-bottom: 30px;
            }
            .file-list-title {
                color: #333;
                margin-top: 30px;
                margin-bottom: 15px;
            }
        </style>
    </head>
    <body>
        <h1>文件上傳與AI分析重點</h1>
        
        <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
            <input type="file" id="fileInput" class="file-input" multiple accept=".txt,.pdf,.doc,.docx,.md,.png,.jpg,.jpeg,.gif,.bmp,.webp">
            <div class="upload-icon">📁</div>
            <div class="upload-text">點擊選擇文件或拖拽文件到此處</div>
            <div class="upload-hint">支援 TXT, PDF, DOC, DOCX, MD, PNG, JPG, JPEG, GIF, BMP, WEBP</div>
            <button onclick="event.stopPropagation(); uploadFiles();" style="margin-top: 10px;">開始上傳</button>
        </div>

        <div id="fileList"></div>
        
        <button id="analyzeBtn" onclick="analyzeFiles()" disabled>開始AI分析</button>
        
        <div id="analysisResults"></div>

        <script>
            let uploadedFiles = [];

            // 拖拽功能
            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');

            // 防止默認拖拽行為
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, preventDefaults, false);
                document.body.addEventListener(eventName, preventDefaults, false);
            });

            // 高亮拖拽區域
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, unhighlight, false);
            });

            // 處理文件拖拽
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
                fileInput.files = files;
                uploadFiles();
            }

            // 文件選擇變化監聽
            fileInput.addEventListener('change', function() {
                if (this.files.length > 0) {
                    uploadFiles();
                }
            });

            function uploadFiles() {
                const fileInput = document.getElementById('fileInput');
                const files = fileInput.files;
                
                if (files.length === 0) {
                    alert('請選擇文件');
                    return;
                }

                const formData = new FormData();
                for (let file of files) {
                    formData.append('files', file);
                }

                fetch('/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    uploadedFiles = data.files;
                    displayFiles();
                    document.getElementById('analyzeBtn').disabled = false;
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('上傳失敗');
                });
            }

            function displayFiles() {
                const fileList = document.getElementById('fileList');
                fileList.innerHTML = '<h3 class="file-list-title">已上傳文件：</h3>';
                uploadedFiles.forEach(file => {
                    const fileIcon = getFileIcon(file.originalname);
                    fileList.innerHTML += \`
                        <div class="file-info">
                            <span style="font-size: 20px; margin-right: 10px;">\${fileIcon}</span>
                            <strong>\${file.originalname}</strong>
                            <span style="color: #666; margin-left: 10px;">(\${formatFileSize(file.size)})</span>
                        </div>
                    \`;
                });
            }

            function getFileIcon(filename) {
                const ext = filename.split('.').pop().toLowerCase();
                const iconMap = {
                    'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'webp': '🖼️',
                    'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📄', 'md': '📄'
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
                document.getElementById('analyzeBtn').disabled = true;
                document.getElementById('analysisResults').innerHTML = '<div class="loading">正在進行AI分析...</div>';

                fetch('/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: uploadedFiles })
                })
                .then(response => response.json())
                .then(data => {
                    displayAnalysis(data.analysis);
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('analysisResults').innerHTML = '<div style="color: red;">分析失敗</div>';
                })
                .finally(() => {
                    document.getElementById('analyzeBtn').disabled = false;
                });
            }

            function displayAnalysis(analysis) {
                const resultsDiv = document.getElementById('analysisResults');
                resultsDiv.innerHTML = '<h3>AI分析結果：</h3>';
                analysis.forEach((result, index) => {
                    resultsDiv.innerHTML += \`
                        <div class="analysis-result">
                            <h4>文件 \${index + 1}: \${result.filename}</h4>
                            <p><strong>重點摘要：</strong></p>
                            <pre>\${result.summary}</pre>
                            <button onclick="downloadMarkdown(\${index})">下載 Markdown</button>
                        </div>
                    \`;
                });
            }

            function downloadMarkdown(index) {
                fetch(\`/download/\${index}\`)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`analysis-\${index + 1}.md\`;
                    a.click();
                });
            }
        </script>
    </body>
    </html>
  `);
});

// 文件上傳端點
app.post('/upload', upload.array('files'), (req, res) => {
  const files = req.files.map(file => ({
    filename: file.filename,
    originalname: file.originalname,
    path: file.path,
    size: file.size
  }));
  
  res.json({ files });
});

// AI分析端點（模擬）
app.post('/analyze', (req, res) => {
  const { files } = req.body;
  
  // 模擬AI分析處理時間
  setTimeout(() => {
    const analysis = files.map(file => {
      // 判斷文件類型並處理
      let content = '';
      let fileType = '';
      const ext = path.extname(file.originalname).toLowerCase();
      
      // 圖片文件類型
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
      
      if (imageExtensions.includes(ext)) {
        fileType = '圖片文件';
        content = `圖片文件: ${file.originalname}\n文件大小: ${file.size} bytes\n圖片格式: ${ext.substring(1).toUpperCase()}`;
      } else {
        fileType = '文本文件';
        try {
          content = fs.readFileSync(file.path, 'utf8').substring(0, 500) + '...';
        } catch (error) {
          content = '無法讀取文件內容，可能是二進制文件';
        }
      }

      // 模擬AI分析結果
      const summary = `# ${file.originalname} 分析重點

## 文件概要
- 文件名稱: ${file.originalname}
- 文件類型: ${fileType}
- 文件大小: ${file.size} bytes
- 文件格式: ${ext.substring(1).toUpperCase()}

## 內容摘要
${content}

## AI分析重點
${imageExtensions.includes(ext) ? 
  `1. 這是一個${ext.substring(1).toUpperCase()}格式的圖片文件
2. 圖片可用於視覺內容分析
3. 建議進行圖像識別和標籤提取
4. 可以分析圖片中的物體、場景和文字` :
  `1. 這是一個關於 ${file.originalname} 的文件
2. 文件包含重要的業務信息
3. 建議進一步處理和分類
4. 可以提取關鍵詞和摘要`
}

## 關鍵字
${imageExtensions.includes(ext) ? 
  '- 圖像處理\n- 視覺分析\n- 內容識別\n- 格式轉換' :
  '- 文件處理\n- 內容分析\n- 重點提取\n- 文本挖掘'
}

## 建議操作
${imageExtensions.includes(ext) ? 
  '- 進行圖像OCR文字識別\n- 分析圖片主題和內容\n- 提取圖片元數據\n- 生成圖片描述' :
  '- 進行文本摘要\n- 提取關鍵信息\n- 分類和標籤\n- 語義分析'
}

*此為模擬分析結果，實際使用時需要集成真實的AI服務*`;

      return {
        filename: file.originalname,
        summary: summary
      };
    });

    // 存儲分析結果
    analysisResults = analysis;
    res.json({ analysis });
  }, 2000);
});

// Markdown下載端點
app.get('/download/:index', (req, res) => {
  const index = parseInt(req.params.index);
  if (index >= 0 && index < analysisResults.length) {
    const result = analysisResults[index];
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="analysis-${index + 1}.md"`);
    res.send(result.summary);
  } else {
    res.status(404).send('分析結果不存在');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 文件上傳與AI分析服務器運行在 http://localhost:${PORT}`);
  console.log('📁 上傳的文件將保存在 ./uploads 目錄');
  console.log('🤖 目前使用模擬AI分析，可替換為真實AI服務');
});
#!/bin/bash

# 知識管理系統本地啟動腳本

echo "🚀 啟動知識管理系統..."

# 檢查Node.js版本
echo "📋 檢查環境..."
node --version
npm --version

# 檢查並安裝依賴
echo "📦 安裝依賴..."
if [ ! -d "backend/node_modules" ]; then
    echo "安裝後端依賴..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "安裝前端依賴..."
    cd frontend && npm install && cd ..
fi

# 設置資料庫
echo "🗄️ 設置資料庫..."
cd backend
npx prisma generate
npx prisma db push

# 啟動後端服務
echo "🔧 啟動後端服務..."
cd backend
node simple-start.js &
BACKEND_PID=$!
cd ..

# 等待後端啟動
echo "⏳ 等待後端啟動..."
sleep 10

# 啟動前端服務
echo "🎨 啟動前端服務..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "✅ 系統啟動完成！"
echo "🌐 前端地址: http://localhost:3000"
echo "🔗 後端地址: http://localhost:3001"
echo "📚 API文檔: http://localhost:3001/api/docs"
echo ""
echo "按 Ctrl+C 停止服務"

# 等待中斷信號
wait $BACKEND_PID $FRONTEND_PID
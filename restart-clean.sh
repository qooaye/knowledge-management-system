#!/bin/bash

echo "🧹 清理現有服務..."

# 強制停止所有相關進程
pkill -f "react-scripts" 2>/dev/null
pkill -f "node.*3001" 2>/dev/null
pkill -f "node.*3000" 2>/dev/null
pkill -f "webpack" 2>/dev/null

# 等待進程完全停止
sleep 3

# 清理端口
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "🔍 檢查端口狀態..."
if lsof -i:3000 >/dev/null 2>&1; then
    echo "❌ 端口 3000 仍然被占用"
    lsof -i:3000
    exit 1
fi

if lsof -i:3001 >/dev/null 2>&1; then
    echo "❌ 端口 3001 仍然被占用"
    lsof -i:3001
    exit 1
fi

echo "✅ 端口清理完成"

echo "🚀 啟動後端服務..."
cd /Users/jhe-jhihjhang/Desktop/qooaye/vibeCoding_claude_project/knowledge-management-system/backend
node simple-start.js &
BACKEND_PID=$!

# 等待後端啟動
sleep 5

# 檢查後端是否正常啟動
if ! curl -s http://localhost:3001/api/health >/dev/null; then
    echo "❌ 後端啟動失敗"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ 後端服務已啟動 (PID: $BACKEND_PID)"

echo "🎨 啟動前端服務..."
cd /Users/jhe-jhihjhang/Desktop/qooaye/vibeCoding_claude_project/knowledge-management-system/frontend

# 清理前端緩存
rm -rf node_modules/.cache 2>/dev/null

# 啟動前端
PORT=3000 npm start &
FRONTEND_PID=$!

echo "✅ 服務啟動完成!"
echo "🌐 前端地址: http://localhost:3000"
echo "🔗 後端地址: http://localhost:3001"
echo ""
echo "進程ID:"
echo "- 後端: $BACKEND_PID"
echo "- 前端: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服務"

# 等待用戶中斷
trap 'echo ""; echo "🛑 停止服務..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT
wait
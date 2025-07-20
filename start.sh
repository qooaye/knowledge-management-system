#!/bin/bash

# 停止現有的伺服器
echo "🔄 停止現有伺服器..."
pkill -f "ai-file-analyzer.js"
sleep 2

# 檢查端口是否被佔用
if lsof -ti:8080 > /dev/null; then
    echo "⚠️  端口 8080 被佔用，正在釋放..."
    kill $(lsof -ti:8080)
    sleep 2
fi

# 啟動伺服器
echo "🚀 啟動 AI 文件分析系統..."
cd "$(dirname "$0")"
nohup node ai-file-analyzer.js > server.log 2>&1 &

# 等待啟動
sleep 3

# 檢查狀態
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ 伺服器成功啟動在 http://localhost:8080"
    echo "📋 日誌文件: server.log"
else
    echo "❌ 伺服器啟動失敗，請檢查 server.log"
fi
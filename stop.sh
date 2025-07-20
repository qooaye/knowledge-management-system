#!/bin/bash

echo "🛑 停止 AI 文件分析系統..."

# 停止伺服器
pkill -f "ai-file-analyzer.js"

# 釋放端口
if lsof -ti:8080 > /dev/null; then
    kill $(lsof -ti:8080)
fi

sleep 2
echo "✅ 伺服器已停止"
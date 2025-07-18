#!/bin/bash

echo "🚀 啟動知識管理系統開發環境"

echo "📦 啟動資料庫和 Redis..."
docker-compose -f docker-compose.dev.yml up -d

echo "⏳ 等待資料庫啟動..."
sleep 10

echo "🔄 生成 Prisma 客戶端..."
npx prisma generate

echo "🗄️ 創建資料庫表格..."
npx prisma db push

echo "🌱 插入種子資料..."
if [ -f "prisma/seed.ts" ]; then
    npx prisma db seed
fi

echo "✅ 環境準備完成！"
echo ""
echo "🎯 現在您可以運行："
echo "   npm run dev     # 啟動後端開發服務器"
echo "   npm run build   # 建置專案"
echo "   npm test        # 運行測試"
echo ""
echo "📱 API 文檔將在 http://localhost:3001/api/docs 提供"
echo "🗄️ 要停止資料庫服務，請運行："
echo "   docker-compose -f docker-compose.dev.yml down"
#!/bin/bash

echo "🚀 啟動知識管理系統本地開發環境"

echo "📝 備份原始 schema..."
cp prisma/schema.prisma prisma/schema.original.prisma

echo "📝 切換到簡化的 SQLite schema..."
cp prisma/schema.simple.prisma prisma/schema.prisma

echo "🔄 更新環境變數..."
sed -i.bak 's/DATABASE_URL="postgresql:\/\/postgres:postgres@localhost:5432\/knowledge_test?schema=public"/DATABASE_URL="file:\.\/dev.db"/g' .env

echo "🔄 生成 Prisma 客戶端..."
npx prisma generate

echo "🗄️ 創建資料庫表格..."
npx prisma db push

echo "✅ 環境準備完成！"
echo ""
echo "🎯 現在您可以運行："
echo "   npm run dev     # 啟動後端開發服務器"
echo "   npm run build   # 建置專案"
echo ""
echo "📱 API 文檔將在 http://localhost:3001/api/docs 提供"
echo "🗄️ 要恢復原始設定，請運行："
echo "   ./restore-original.sh"
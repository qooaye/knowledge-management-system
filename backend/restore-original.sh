#!/bin/bash

echo "🔄 恢復原始設定..."

echo "📝 恢復原始 schema..."
if [ -f "prisma/schema.original.prisma" ]; then
    cp prisma/schema.original.prisma prisma/schema.prisma
    echo "✅ Schema 已恢復"
else
    echo "❌ 找不到原始 schema 備份"
fi

echo "🔄 恢復環境變數..."
if [ -f ".env.bak" ]; then
    cp .env.bak .env
    echo "✅ 環境變數已恢復"
else
    echo "❌ 找不到環境變數備份"
fi

echo "🔄 重新生成 Prisma 客戶端..."
npx prisma generate

echo "✅ 原始設定已恢復！"
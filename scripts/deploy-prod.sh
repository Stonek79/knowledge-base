#!/bin/bash
set -e

MIGRATE=false
SEED=false

# Простая обработка флагов
for arg in "$@"
do
    case $arg in
        --migrate)
        MIGRATE=true
        shift
        ;;
        --seed)
        SEED=true
        shift
        ;;
    esac
done

echo "🚀 Deploying Knowledge Base (Hybrid Mode)..."

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Обновление кода
echo -e "${BLUE}📦 Pulling latest code...${NC}"
git pull origin main

# 2. Установка зависимостей
echo -e "${BLUE}📚 Installing dependencies...${NC}"
pnpm install --frozen-lockfile

# 3. Генерация Prisma клиента
echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
npx prisma generate

# 4. Сборка Next.js (standalone)
echo -e "${BLUE}🏗️  Building Next.js...${NC}"
pnpm build

# 5. Сборка Worker
echo -e "${BLUE}⚙️  Building Worker...${NC}"
pnpm build:worker

# 6. Запуск Docker сервисов (только инфраструктура + worker)
echo -e "${BLUE}🐳 Starting Docker services...${NC}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build worker

# 7.1. Миграции (если нужно)
if [ "$MIGRATE" = true ]; then
    echo "🗄️  Running migrations..."
    npx prisma migrate deploy
fi

# 7.2. Seed (если нужно)
if [ "$SEED" = true ]; then
    echo "🌱 Running seed..."
    npx prisma db seed
fi

# 8. Перезапуск Next.js через PM2
echo -e "${BLUE}🔄 Restarting Next.js...${NC}"
pm2 restart knowledge-base || pm2 start .next/standalone/server.js --name knowledge-base --env production

# 9. Проверка статуса
echo -e "${BLUE}📊 Service status:${NC}"
pm2 status
docker compose ps

echo -e "${GREEN}✅ Deployment complete!${NC}"

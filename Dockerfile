FROM node:18-alpine AS base

# Установка зависимостей
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копирование package файлов
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --ignore-scripts

# Сборка приложения
FROM base AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генерация Prisma клиента
RUN npx prisma generate

# Сборка Next.js и Воркера
RUN npm run build
RUN pnpm build:worker

# Production образ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Копирование собранного приложения
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# Копирование собранного воркера
COPY --from=builder /app/dist ./dist
COPY package.json pnpm-lock.yaml* ./

RUN npm i -g pnpm && pnpm install --prod --frozen-lockfile --ignore-scripts
# Установка прав
USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Команда по умолчанию: запуск веб-сервера
CMD ["pnpm", "start:prod:server"]

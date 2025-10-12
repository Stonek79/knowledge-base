FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm
WORKDIR /app

# Копируем только необходимые файлы для worker
COPY package.json pnpm-lock.yaml ./
COPY scripts ./scripts
COPY dist ./dist
COPY prisma ./prisma

# Установка prod зависимостей
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod

# Генерация Prisma
RUN npx prisma generate

RUN chown -R node:node /app
USER node

CMD ["node", "dist/worker.cjs"]

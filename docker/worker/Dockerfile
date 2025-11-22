FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Ставим только прод зависимости
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod

COPY . .

RUN chown -R node:node /app
USER node

CMD ["pnpm", "worker"]

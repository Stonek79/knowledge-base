# Knowledge Base

Современная система управления документами с поддержкой поиска, конвертации и управления доступом.

## 🚀 Быстрый запуск

### Предварительные требования
- Docker и Docker Compose
- Node.js 18+ (для локальной разработки)
- pnpm (для управления зависимостями)

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd knowledge-base
```

### 2. Настройка переменных окружения
```bash
# Создать .env.local из примера
cp .env.example .env.local

# Отредактировать .env.local под ваши нужды
nano .env.local
```

### 3. Запуск в Docker
```bash
# Запуск всех сервисов
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

### 4. Доступ к сервисам
- **Приложение:** http://localhost:3000
- **PostgreSQL:** localhost:5432
- **MinIO API:** localhost:9000
- **MinIO Web UI:** http://localhost:9001
- **Redis:** localhost:6379
- **Gotenberg:** http://localhost:3001

## 🏗️ Архитектура

### Контейнеры
- **App** - Next.js приложение (порт 3000)
- **PostgreSQL** - База данных (порт 5432)
- **MinIO** - Файловое хранилище (порты 9000, 9001)
- **Redis** - Кэширование (порт 6379)
- **Gotenberg** - Конвертация документов (порт 3001)

### Основные функции
- 📄 Управление документами с приложениями
- 🔍 Полнотекстовый поиск (FlexSearch)
- 🔄 Автоматическая конвертация Office → PDF
- 👥 Ролевая система доступа
- 📊 Аудит всех действий
- 🎨 Современный UI на MUI

## 🛠️ Разработка

### Локальная разработка
```bash
# Установка зависимостей
pnpm install

# Генерация Prisma клиента
pnpm prisma generate

# Запуск в режиме разработки
pnpm dev
```

### Работа с базой данных
```bash
# Создание миграции
pnpm prisma migrate dev

# Сброс базы данных
pnpm prisma migrate reset

# Просмотр данных
pnpm prisma studio
```

### Тестирование
```bash
# Запуск тестов
pnpm test

# Проверка типов
pnpm typecheck

# Линтинг
pnpm lint
```

## 📚 Документация

Раздел находится в работе, ещё не реализовано

- [API Documentation](./docs/api/)
- [Architecture Overview](./docs/architecture/)
- [Development Guide](./docs/development/)
- [Deployment Guide](./docs/deployment/)

## 🔧 Конфигурация

### Настройки системы
- Лимит размера файла: 2MB (настраивается)
- Максимум файлов за загрузку: 10
- Поддерживаемые форматы: PDF, DOCX, XLSX, PPTX
- Автоматическая конвертация Office → PDF

### Переменные окружения
```bash
# База данных
DATABASE_URL=postgresql://kb_user:password@localhost:5432/knowledge_base

# MinIO
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=kb_admin
MINIO_SECRET_KEY=your_secret_key

# Redis
REDIS_URL=redis://localhost:6379

# Gotenberg
GOTENBERG_URL=http://localhost:3001
GOTENBERG_TIMEOUT=30000
```

## 🚀 Production

### Развертывание
```bash
# Production окружение
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# SSL/TLS (настроить отдельно)
# Let's Encrypt сертификаты
# HTTPS redirect
# HSTS headers
```

### Мониторинг
- Health checks для всех сервисов
- Логирование в структурированном формате
- Мониторинг использования памяти FlexSearch
- Алерты при критических значениях

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте feature branch
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл для деталей.

## 🆘 Поддержка

- Создайте Issue для багов
- Обсудите новые функции в Discussions
- Обратитесь к документации для решения проблем
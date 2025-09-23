# Knowledge Base

Современная система управления документами с поддержкой поиска, конвертации и управления доступом.

## 🚀 Быстрый запуск (Dev-окружение)

### Предварительные требования
- Docker и Docker Compose
- `make`
- `pnpm`

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd knowledge-base
```

### 2. Настройка переменных окружения
```bash
# Создать .env.local из примера
cp .env.example .env.local
```
Убедитесь, что `.env.local` содержит правильные переменные. Для старта dev-среды в Docker критически важны `REDIS_URL` и `DATABASE_URL`, указывающие на имена сервисов.

**Пример `.env.local`:**
```env
# База данных (для подключения из приложения)
DATABASE_URL="postgresql://postgres:dev_password@postgres:5432/knowledge_base"

# Redis (для подключения из приложения и воркера)
REDIS_URL="redis://:dev_redis_password@redis:6379"

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=kb_admin
MINIO_ROOT_PASSWORD=dev_minio_password
```

### 3. Запуск в Docker
Эта команда поднимет все необходимые сервисы (Postgres, Redis, MinIO и т.д.) и запустит приложение с воркером в режиме разработки с автоматической пересборкой.
```bash
make dev-up
```

### 4. Доступ к сервисам
- **Приложение:** http://localhost:3000
- **PostgreSQL (с хост-машины):** localhost:5435
- **MinIO Web UI:** http://localhost:9001
- **Redis (с хост-машины):** localhost:6379

---

## 🛠️ Разработка

Основной способ разработки — через `make dev-up`, как описано выше. Это гарантирует, что у вас запущено полное окружение.

Команды `pnpm dev`, `pnpm build:worker` и т.д. можно использовать для специфических задач, но они требуют, чтобы все зависимые сервисы (БД, Redis) уже были запущены.

### Работа с базой данных
Для выполнения команд миграции и сидинга в dev-окружении используйте `Makefile`:
```bash
# Применить миграции
make migrate-dev

# Заполнить базу начальными данными
make seed-dev

# Выполнить оба шага
make init-dev
```

---

## 🔧 Конфигурация

### Настройки системы
- Лимит размера файла: 2MB (настраивается)
- Максимум файлов за загрузку: 10
- Поддерживаемые форматы: PDF, DOCX, XLSX, PPTX
- Автоматическая конвертация Office → PDF

### Переменные окружения
Ключевые переменные окружения для работы приложения (задаются в `.env.local` для разработки и в `.env.prod` для production):
```bash
# База данных
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=user
MINIO_ROOT_PASSWORD=password

# Redis
REDIS_URL="redis://:PASSWORD@HOST:PORT"

# Gotenberg
GOTENBERG_URL=http://gotenberg:3000
```

---

## 📚 Документация

- [Руководство по развертыванию](./DEPLOYMENT_GUIDE.md) - Пошаговая инструкция по установке на production-сервер.
- `GEMINI.md` - Технический обзор проекта, архитектуры и принятых соглашений.

---

## 🚀 Production

Подробное пошаговое руководство по развертыванию на production-сервере находится в файле **`DEPLOYMENT_GUIDE.md`**.

---

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте feature branch
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл для деталей.
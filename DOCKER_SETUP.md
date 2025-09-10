# 🐳 Настройка Docker окружения

## 📋 Предварительные требования

- Docker Engine 20.10+
- Docker Compose 2.0+
- Минимум 4GB RAM
- 10GB свободного места на диске

## 🚀 Быстрый запуск

### 1. Клонирование и настройка
```bash
# Клонирование репозитория
git clone <repository-url>
cd knowledge-base

# Создание переменных окружения
cp .env.example .env.local
```

### 2. Запуск всех сервисов
```bash
# Запуск в фоновом режиме
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Проверка статуса
docker-compose ps
```

### 3. Проверка готовности
```bash
# PostgreSQL
docker exec kb-postgres pg_isready -U kb_user -d knowledge_base

# MinIO
curl -f http://localhost:9000/minio/health/live

# Redis
docker exec kb-redis redis-cli -a dev_redis_password ping

# Gotenberg
curl -f http://localhost:3001/health
```

## 🔧 Детальная настройка

### Переменные окружения (.env.local)
```bash
# База данных
POSTGRES_PASSWORD=dev_password

# MinIO
MINIO_ROOT_USER=kb_admin
MINIO_ROOT_PASSWORD=dev_minio_password
MINIO_BUCKET=knowledge-base

# Redis
REDIS_PASSWORD=dev_redis_password

# Gotenberg
GOTENBERG_URL=http://localhost:3001
GOTENBERG_TIMEOUT=30000

# Поисковая система
SEARCH_ENGINE=flexsearch
FLEXSEARCH_RESOLUTION=7
FLEXSEARCH_TOKENIZE=full
FLEXSEARCH_CACHE=true

# Приложение
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# JWT
JWT_SECRET=dev_jwt_secret_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production

# Лимиты файлов
MAX_FILE_SIZE=2097152  # 2MB в байтах
MAX_FILES_PER_UPLOAD=10

# OCR
ENABLE_OCR=true
OCR_LANGUAGES=rus,eng
```

### Порты и доступы
| Сервис | Порт | Описание | Доступ |
|--------|------|----------|---------|
| App | 3000 | Next.js приложение | http://localhost:3000 |
| PostgreSQL | 5432 | База данных | localhost:5432 |
| MinIO API | 9000 | S3 API | localhost:9000 |
| MinIO Web UI | 9001 | Веб интерфейс | http://localhost:9001 |
| Redis | 6379 | Кэширование | localhost:6379 |
| Gotenberg | 3001 | Конвертация документов | http://localhost:3001 |

## 🏗️ Архитектура контейнеров

### Схема сети
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App           │    │   PostgreSQL    │    │   MinIO         │
│   (Next.js)     │    │   (Metadata)    │    │   (Files)       │
│   Port: 3000    │    │   Port: 5432    │    │   Port: 9000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                        ┌─────────────────┐
                        │   Redis         │
                        │   (Cache)       │
                        │   Port: 6379    │
                        └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Gotenberg     │
                        │   (Conversion)  │
                        │   Port: 3001    │
                        └─────────────────┘
```

### Health Checks
Все сервисы имеют настроенные health checks для автоматического мониторинга:

- **PostgreSQL**: `pg_isready` каждые 10 секунд
- **MinIO**: HTTP health check каждые 30 секунд
- **Redis**: `redis-cli ping` каждые 10 секунд
- **Gotenberg**: HTTP health check каждые 30 секунд
- **App**: Зависит от готовности всех сервисов

## 📁 Структура Docker файлов

```
docker/
├── postgres/
│   ├── Dockerfile          # PostgreSQL с дополнительными инструментами
│   ├── init.sql            # Инициализация БД
│   └── .env                # Переменные PostgreSQL
├── minio/
│   └── .env                # Переменные MinIO
├── redis/
│   └── .env                # Переменные Redis
└── gotenberg/
    ├── Dockerfile          # Gotenberg с настройками
    └── .env                # Переменные Gotenberg
```

## 🚀 Команды управления

### Основные команды
```bash
# Запуск всех сервисов
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Остановка всех сервисов
docker-compose down

# Перезапуск конкретного сервиса
docker-compose restart postgres

# Просмотр логов
docker-compose logs -f app
docker-compose logs -f postgres

# Проверка статуса
docker-compose ps
docker-compose top
```

### Управление данными
```bash
# Создание backup базы данных
docker exec kb-postgres pg_dump -U kb_user knowledge_base > backup.sql

# Восстановление из backup
docker exec -i kb-postgres psql -U kb_user knowledge_base < backup.sql

# Очистка всех данных
docker-compose down -v
docker-compose up -d
```

### Мониторинг ресурсов
```bash
# Использование ресурсов
docker stats

# Информация о контейнерах
docker inspect kb-postgres
docker inspect kb-minio

# Проверка сетей
docker network ls
docker network inspect kb-network
```

## 🔍 Отладка

### Проблемы с подключением
```bash
# Проверка сетей
docker network ls
docker network inspect kb-network

# Проверка DNS
docker exec kb-app nslookup postgres
docker exec kb-app nslookup minio
docker exec kb-app nslookup redis
docker exec kb-app nslookup gotenberg
```

### Проблемы с базой данных
```bash
# Подключение к PostgreSQL
docker exec -it kb-postgres psql -U kb_user -d knowledge_base

# Проверка таблиц
\dt

# Проверка пользователей
\du

# Проверка подключений
SELECT * FROM pg_stat_activity;
```

### Проблемы с MinIO
```bash
# Проверка MinIO
docker exec kb-minio mc admin info local

# Создание bucket
docker exec kb-minio mc mb local/knowledge-base

# Проверка файлов
docker exec kb-minio mc ls local/knowledge-base
```

### Проблемы с Redis
```bash
# Подключение к Redis
docker exec -it kb-redis redis-cli -a dev_redis_password

# Проверка ключей
KEYS *

# Проверка памяти
INFO memory
```

## 🚀 Production настройки

### Безопасность
```bash
# Создание production переменных
cp .env.example .env.production

# Настройка сильных паролей
POSTGRES_PASSWORD=your_very_secure_password
MINIO_ROOT_PASSWORD=your_very_secure_minio_password
REDIS_PASSWORD=your_very_secure_redis_password
JWT_SECRET=your_very_secure_jwt_secret
```

### SSL/TLS
```bash
# Добавление SSL сертификатов
# Let's Encrypt автоматическое обновление
# HTTPS redirect
# HSTS headers
```

### Мониторинг
```bash
# Логирование
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Мониторинг ресурсов
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Алерты при превышении лимитов
# Мониторинг FlexSearch памяти
# Уведомления админа
```

## 🆘 Решение проблем

### Частые проблемы

#### 1. Порт уже занят
```bash
# Проверка занятых портов
netstat -tulpn | grep :3000
lsof -i :3000

# Изменение порта в docker-compose.yml
ports:
  - "3001:3000"  # Вместо 3000:3000
```

#### 2. Недостаточно памяти
```bash
# Проверка доступной памяти
free -h

# Ограничение памяти для контейнеров
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 1G
```

#### 3. Проблемы с правами доступа
```bash
# Проверка прав на volumes
ls -la storage/
chmod 755 storage/

# Исправление прав в контейнере
docker exec kb-app chown -R nextjs:nodejs /app/storage
```

#### 4. Проблемы с сетью
```bash
# Пересоздание сети
docker-compose down
docker network prune
docker-compose up -d
```

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [MinIO Docker](https://hub.docker.com/r/minio/minio)
- [Redis Docker](https://hub.docker.com/_/redis)
- [Gotenberg Docker](https://hub.docker.com/r/gotenberg/gotenberg) 
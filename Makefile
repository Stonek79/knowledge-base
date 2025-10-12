PROJECT_NAME=knowledge-base

#Параметры окружения
ENV_FILE_DEV=.env.local
ENV_FILE_PROD=.env.prod
IMAGE_NAME=stonek79/knowledge-base
APP_VERSION ?= latest

# ======================
# DEV
# ======================


dev-up:
	DOCKER_BUILDKIT=0 docker compose \
		--env-file $(ENV_FILE_DEV) \
		-f docker-compose.yml -f docker-compose.dev.yml up -d --build

dev-down:
	DOCKER_BUILDKIT=0 docker compose \
		--env-file $(ENV_FILE_DEV) \
		-f docker-compose.yml -f docker-compose.dev.yml down

dev-logs:
	DOCKER_BUILDKIT=0 docker compose \
		--env-file $(ENV_FILE_DEV) \
		-f docker-compose.yml -f docker-compose.dev.yml logs -f


# ======================
# PROD
# ======================

# Сборка прод-образа для linux/amd64
prod-build:
	docker buildx build \
		--platform linux/amd64 \
		--build-arg NODE_ENV=production \
		-t $(IMAGE_NAME):$(APP_VERSION) \
		--push \
		.

# Полная пересборка без кэша (только когда реально нужно)
prod-build-clean:
	docker buildx build \
		--no-cache \
		--platform linux/amd64 \
		--build-arg NODE_ENV=production \
		-t $(IMAGE_NAME):$(APP_VERSION) \
		--push \
		.

# Локальная сборка для тестирования (без push)
prod-build-local:
	docker buildx build \
		--platform linux/amd64 \
		--build-arg NODE_ENV=production \
		--load \
		-t $(IMAGE_NAME):$(APP_VERSION) \
		.

# Очистка старых образов
docker-prune:
	docker system prune -af --filter "until=24h"
	docker builder prune -af --filter "until=24h"

# Очистка buildx кэшей
docker-clean-buildx:
	docker buildx prune -af

# Отправка уже собранного образа в Docker Hub
prod-push:
	docker push $(IMAGE_NAME):$(APP_VERSION)

# ======================
# MIGRATIONS & SEED
# ======================

migrate-dev:
	docker compose --env-file $(ENV_FILE_DEV) -f docker-compose.yml -f docker-compose.dev.yml run --rm worker npx prisma migrate dev

seed-dev:
	docker compose --env-file $(ENV_FILE_DEV) -f docker-compose.yml -f docker-compose.dev.yml run --rm worker npx prisma db seed

init-dev: migrate-dev seed-dev

migrate-prod:
	docker compose --env-file $(ENV_FILE_PROD) -f docker-compose.yml -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

seed-prod:
	docker compose --env-file $(ENV_FILE_PROD) -f docker-compose.yml -f docker-compose.prod.yml run --rm app npx prisma db seed

init-prod: migrate-prod seed-prod

# ======================
# Общие команды
# ======================

ps:
	docker compose ps

stop:
	docker compose stop

restart:
	docker compose restart

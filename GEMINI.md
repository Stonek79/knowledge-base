# Project Overview

This is a modern document management system built with Next.js, TypeScript, and a suite of powerful open-source technologies. It provides features for document search, conversion, and access control.

**Key Technologies:**

*   **Frontend:** Next.js, React, TypeScript, Material-UI (MUI)
*   **Backend:** Next.js API Routes, TypeScript
*   **Database:** PostgreSQL with Prisma ORM
*   **File Storage:** MinIO
*   **Caching:** Redis
*   **Document Conversion:** Gotenberg
*   **Search:** FlexSearch

**Architecture:**

The application is designed to run in a containerized environment using Docker. It consists of the following services:

*   **`app`:** The main Next.js application.
*   **`postgres`:** The PostgreSQL database.
*   **`minio`:** The MinIO file storage server.
*   **`redis`:** The Redis cache.
*   **`gotenberg`:** The Gotenberg service for converting documents to PDF.

# Building and Running

## Development

To run the project in development mode, you can use either Docker or run it locally.

**With Docker (Recommended):**

1.  **Set up environment variables:**
    ```bash
    cp .env.example .env.local
    ```
    Then, edit `.env.local` with your desired settings.

2.  **Start the services:**
    ```bash
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    ```

**Locally:**

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Generate Prisma client:**
    ```bash
    pnpm prisma generate
    ```

3.  **Start the development server:**
    ```bash
    pnpm dev
    ```

## Production

To build and run the project in production mode, use the following Docker command:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

# Development Conventions

## Database

*   **Migrations:** Use `pnpm prisma migrate dev` to create new database migrations.
*   **Studio:** Use `pnpm prisma studio` to open the Prisma Studio and browse your data.

## Testing and Linting

*   **Tests:** Run tests with `pnpm test`.
*   **Type Checking:** Check for type errors with `pnpm typecheck`.
*   **Linting:** Lint the code with `pnpm lint`.

## Authentication and Authorization

*   Authentication is handled using JSON Web Tokens (JWTs).
*   The `src/middleware.ts` file protects routes based on the user's role (ADMIN, USER, GUEST).
*   User management actions are located in `src/lib/actions/users.ts`.

## Search

*   Full-text search is implemented using FlexSearch.
*   The search indexer is in `src/lib/search/flexsearch-indexer.ts`.
*   The index is persisted to the file system to avoid re-indexing on every server start.

## План доработки поиска

Для реализации профессионального подхода к поиску (сначала фильтрация в базе данных, затем поиск по тексту в FlexSearch) предлагаются следующие изменения:

### 1. `src/lib/search/flexsearch-indexer.ts`

-   **Цель:** Научить поисковый движок искать в рамках заранее отфильтрованного списка документов.
-   **Изменения:**
    -   Модифицировать сигнатуру метода `search`, чтобы он мог принимать опциональный массив `prefilteredIds`.
    -   Внутри метода `search` использовать `prefilteredIds` для сужения области поиска в FlexSearch, передавая их в опциях запроса.

### 2. `src/app/api/documents/route.ts` (Поиск в админ-панели)

-   **Цель:** Заменить неэффективный поиск по базе данных на двухфазный поиск.
-   **Изменения:**
    1.  **Предварительная фильтрация:** При наличии структурных фильтров (категории, даты) делать быстрый запрос в PostgreSQL для получения только ID подходящих документов.
    2.  **Полнотекстовый поиск:** Передавать полученные ID в обновленный метод `indexer.search` вместе с текстовым запросом.
    3.  **Финальная выборка:** Получать полные данные для итогового списка ID из базы данных, сохраняя порядок релевантности от FlexSearch.

### 3. `src/app/api/documents/search/route.ts` (Основной поиск)

-   **Цель:** Унифицировать логику, применив тот же эффективный подход.
-   **Изменения:**
    -   Заменить текущую реализацию ("сначала поиск, потом фильтрация в коде") на ту же трехшаговую схему, что и в роуте для админ-панели.

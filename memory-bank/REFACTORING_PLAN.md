# Детальный план рефакторинга и улучшения кодовой базы

Этот документ описывает пошаговый план для устранения недостатков, выявленных в ходе анализа проекта.

---

### Часть 1: Устранение дублирования кода

**Задача:** Привести все компоненты, использующие поле для ввода пароля, к единому стилю, используя существующий компонент `PasswordField`.

-   **Файл для рефакторинга:** `src/components/users/CreateUserDialog.tsx`
-   **Проблема:** В этом файле реализована собственная версия поля для ввода пароля с логикой показа/скрытия, что дублирует функциональность уже существующего компонента.
-   **План действий:**
    1.  Импортировать `PasswordField` из `src/components/auth/PasswordField.tsx`.
    2.  Импортировать `Controller` из `react-hook-form`.
    3.  Удалить из `CreateUserDialog.tsx` состояние `showPassword` и связанные с ним обработчики (`handleClickShowPassword`, `handleMouseDownPassword`).
    4.  Заменить два `TextField` для пароля (`password` и `confirmPassword`) на компонент `PasswordField`, обернутый в `Controller` от `react-hook-form`. Это сделает код консистентным с `EditUserDialog.tsx` и `LoginForm.tsx`.

---

### Часть 2: Управление зависимостями

**Задача:** Актуализировать зависимости проекта: добавить недостающие и удалить неиспользуемые.

-   **Файл для изменений:** `package.json`
-   **План действий:**
    1.  **Добавить недостающую зависимость:**
        -   **Команда:** `pnpm add date-fns`
        -   **Обоснование:** Пакет `date-fns` активно используется в коде, но не объявлен в `package.json`. Явная декларация зависимостей — это лучшая практика, которая защищает от поломок в будущем.
    2.  **Удалить неиспользуемые зависимости:**
        -   **Команда:** `pnpm remove jsonwebtoken @types/jsonwebtoken tsconfig-paths`
        -   **Обоснование:**
            -   `jsonwebtoken`: Не используется. Для работы с JWT в проекте применяется `jose`.
            -   `tsconfig-paths`: Не требуется, так как Next.js "из коробки" поддерживает пути-алиасы из `tsconfig.json`.

---

### Часть 3: Удаление "мертвого" кода

**Задача:** Уменьшить размер сборки и упростить проект, удалив неиспользуемые файлы и экспорты.

-   **План действий:**
    1.  **Удалить неиспользуемые файлы:**
        -   **Цель:** Заброшенная фича поиска.
        -   **Файлы для удаления:**
            -   `src/lib/prisma/softDeleteExtension.ts`
            -   `src/lib/schemas/cache.ts`
            -   `src/lib/schemas/filter.ts`
            -   `src/lib/schemas/search.ts`
            -   `src/lib/search/cache/SearchCache.ts`
            -   `src/lib/search/coordinator/ResultCombiner.ts`
            -   `src/lib/search/coordinator/SearchCoordinator.ts`
            -   `src/lib/search/implementations/flexsearch/FlexSearchEngine.ts`
            -   `src/lib/search/interfaces/SearchEngine.ts`
            -   `src/lib/services/AggregationService.ts`
            -   `src/lib/services/CacheService.ts`
            -   `src/lib/services/DocumentService.ts`
            -   `src/lib/services/FilterService.ts`
            -   `src/lib/services/SearchService.ts`
            -   `src/lib/types/cache.ts`
            -   `src/lib/types/filter.ts`
            -   `src/lib/types/search.ts`
            -   `src/utils/doc.ts`
        -   **Важно:** Перед удалением необходимо убедиться, что эти файлы не импортируются нигде в "живом" коде. `knip` утверждает, что это так, но потребуется двойная проверка.

    2.  **Исправить дублирующиеся экспорты:**
        -   **Файл:** `src/constants/api.ts`
        -   **Проблема:** Константы `DOCUMENTS_BASE_PATH` и `DOCUMENTS_PAGE_PATH` дублируют друг друга.
        -   **Действие:** Проанализировать использование и удалить одну из них, обновив импорты.

    3.  **Удалить неиспользуемые экспорты (постепенно):**
        -   **Проблема:** `knip` обнаружил более 70 неиспользуемых экспортов.
        -   **Действие:** Это большая задача, которую можно выполнять итеративно. Начать можно с самых очевидных, например, с неиспользуемых констант в `src/constants/api.ts`. Каждое удаление требует проверки, не сломало ли это что-либо.

---

### Часть 4: Настройка инструментов

**Задача:** Обновить конфигурацию `knip`, чтобы он корректно анализировал проект.

-   **Файл для изменений:** `knip.json`
-   **План действий:**
    1.  **Убрать старую точку входа:** Удалить паттерн для `src/middleware.ts` из секции `entry`.
    2.  **Добавить новую точку входа:** Добавить `src/proxy.ts` в секцию `entry`.
    3.  **Устранить избыточность:** Удалить паттерны для `src/app/layout.tsx` и `next.config.ts`, как советует `knip`.

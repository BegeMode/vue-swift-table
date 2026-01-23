---
name: vue-swift-table
description: Vue 3 высокопроизводительная таблица данных с виртуализацией строк фиксированной высоты
---

# Vue Swift Table

## Обзор проекта

**Vue Swift Table** — это Vue 3 компонент таблицы данных, портированный из `vue-ngx-datatable` (Vue 2). Ключевая особенность — **виртуализация строк фиксированной высоты** для эффективной работы с большими объёмами данных (10 000+ записей).

## Технологический стек

- **Framework:** Vue 3.5.x
- **API Style:** Composition API (`<script setup>`, `ref`, `computed`)
- **Language:** TypeScript 5.x
- **Styling:** SCSS
- **Build Tool:** Vite 7.x
- **Testing:** Vitest
- **Package Manager:** pnpm

## Структура проекта

```
src/
├── components/           # Vue компоненты
│   ├── DataTable.vue     # Корневой компонент (точка входа)
│   ├── body/             # Компоненты тела таблицы
│   │   ├── DataTableBody.vue      # Движок виртуализации
│   │   ├── DataTableRow.vue       # Строка таблицы
│   │   └── DataTableBodyCell.vue  # Ячейка тела
│   ├── header/           # Компоненты заголовка
│   │   └── DataTableHeader.vue    # Заголовок с сортировкой
│   └── footer/           # Компоненты footer/pagination
├── managers/             # Менеджеры состояния
│   ├── rowsManager.ts    # Управление строками и видимостью
│   └── pageManager.ts    # Управление пагинацией
├── types/                # TypeScript типы и интерфейсы
├── utils/                # Утилиты
├── styles/               # SCSS стили и темы
├── demos/                # Демонстрационные компоненты
└── assets/               # Статические файлы (шрифты, данные)
```

## Ключевые архитектурные решения

### 1. Виртуализация фиксированной высоты

Позиционирование строк рассчитывается по формуле:

- `top = index * rowHeight`
- `totalScrollHeight = rows.length * rowHeight`

Рендерятся только видимые строки + буфер (~20 строк).

### 2. Pull-модель данных

Таблица сама запрашивает данные через callback, переданный в props:

- **`getPageRows(page: number)`** — callback для загрузки страницы данных
- Возвращает `Promise<{ rows: Array<T>; isLast?: boolean; allRows?: boolean }>`
  - `rows` — массив данных страницы
  - `isLast` — флаг последней страницы (для infinite scroll)
  - `allRows` — если `true`, `rows` содержит все данные сразу
- Позволяет реализовать любую логику загрузки (API, Vuex/Pinia, WebSocket и т.д.)

### 3. Режимы прокрутки (`infiniteScroll`)

| Значение                | Поведение                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `infiniteScroll: true`  | Страницы подгружаются автоматически при скролле. Pager также работает для навигации. |
| `infiniteScroll: false` | Новая страница загружается **только** через Pager (по клику на номер страницы).      |

## Правила разработки

### Стиль кода

1. Использовать Composition API с `<script setup>`
2. Типизировать все props, emits, переменные
3. Использовать `computed` для производных данных
4. Использовать `ref` для реактивного состояния

### Именование

- Компоненты: `PascalCase` (DataTableBody.vue)
- Composables: `useCamelCase` (useInfiniteScroll)
- Types/Interfaces: `PascalCase` с префиксом `I` (IRowInfo)
- Файлы типов: `kebab-case.type.ts`

### SCSS стили

- Все стили в `src/styles/`
- Темы: Material, Dark, Bootstrap
- Глобальные стили в `datatable.component.scss`

## Ключевые Props компонента DataTable

| Prop             | Тип                                            | Описание                    |
| ---------------- | ---------------------------------------------- | --------------------------- |
| `rows`           | `Array<T>`                                     | Данные для отображения      |
| `columns`        | `Array<Column>`                                | Конфигурация колонок        |
| `rowHeight`      | `number`                                       | Фиксированная высота строки |
| `headerHeight`   | `number`                                       | Высота заголовка            |
| `infiniteScroll` | `boolean`                                      | Автоподгрузка при скролле   |
| `getPageRows`    | `(page) => Promise<{rows, isLast?, allRows?}>` | Callback загрузки данных    |
| `pageSize`       | `number`                                       | Записей на странице         |
| `selectionType`  | `'single' \| 'multi' \| 'checkbox'`            | Тип выделения               |
| `sortType`       | `'single' \| 'multi'`                          | Тип сортировки              |

## События (Emits)

- `page` — смена страницы
- `sort` — изменение сортировки
- `select` — выделение строк
- `scroll-end` — достижение конца списка
- `activate` — клик по строке/ячейке

## Команды

```bash
# Запуск dev-сервера
pnpm dev

# Сборка production
pnpm build

# Тестирование
pnpm test
pnpm test:run

# Форматирование кода
pnpm prettier
```

## Ссылки на документацию

- [VUE3_PORT_SPEC.md](../../../VUE3_PORT_SPEC.md) — полная спецификация портирования
- [IMPLEMENTATION_STATUS.md](../../../IMPLEMENTATION_STATUS.md) — статус реализации
- [TASKS_FOR_NEXT_AGENT.md](../../../TASKS_FOR_NEXT_AGENT.md) — задачи для следующих сессий

## При работе с файлами

1. **DataTableBody.vue** — основная логика виртуализации, изменять осторожно
2. **rowsManager.ts** — управление массивом строк и видимостью
3. **pageManager.ts** — логика пагинации и подгрузки страниц
4. При изменении стилей проверять все три темы (Material, Dark, Bootstrap)

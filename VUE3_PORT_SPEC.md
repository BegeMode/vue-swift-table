# Спецификация портирования Vue Data Table на Vue 3

## Обзор

Цель данного документа - описать архитектуру и план портирования существующего компонента `vue-ngx-datatable` (/Users/begemode/Work/Projects/vue-table/) с Vue 2 на Vue 3. Основное изменение заключается в упрощении механизма виртуализации: новая версия будет поддерживать **только строки фиксированной высоты**.

## Технологический стек

- **Framework:** Vue 3.x
- **API Style:** Composition API (`<script setup>`, `ref`, `computed`)
- **Language:** TypeScript
- **Styling:** SCSS (перенос существующих стилей с адаптацией)

## Архитектурные изменения

### 1. Отказ от Variable Row Height

Текущая реализация использует сложные вычисления и кеширование (`rowHeightsCache`, бинарный поиск) для поддержки строк произвольной высоты. В новой версии:

- Удаляются сервисы и логика, связанные с `rowHeightsCache`.
- Позиционирование строк рассчитывается по формуле: `top = index * rowHeight`.
- Общая высота скролла: `totalScrollHeight = rows.length * rowHeight`.

### 2. Структура Компонентов

#### `DataTable.vue` (Root)

Является точкой входа и контейнером состояния.

- **Props:**
  - `rows`: Array<T> - данные.
  - `columns`: Array<Column> - конфигурация колонок.
  - `rowHeight`: Number - фиксированная высота строки (обязательно или со значением по умолчанию).
  - `headerHeight`: Number - высота хедера.
  - `footerHeight`: Number - высота футера.
  - `height`: String/Number - высота всей таблицы.
    - `loading`: Boolean - состояние загрузки данных.

    - **Layout & Styling:**
      - `columnMode`: String - режим распределения ширины колонок ('standard', 'flex', 'force').
      - `reorderable`: Boolean - разрешение на перетаскивание колонок.
      - `rowClass`: Function - функция для условных классов строки.
      - `cssClasses`: Object - переопределение иконок и классов (сортировка, пейджер).
      - `messages`: Object - тексты для локализации (emptyMessage, totalMessage и т.д.).

    - **Paging & Scrolling:**
      - `pageSize`: Number - количество строк на странице.
      - `count`: Number - общее количество строк (для серверной пагинации).
      - `page`: Number (v-model) - текущая страница.
      - `externalPaging`: Boolean - данные управляются снаружи.
      - `externalSorting`: Boolean - сортировка управляется снаружи.

    - **Grouping & Tree:**
      - `groupRowsBy`: Array - поля для группировки строк.
      - `groupExpansionDefault`: Boolean - состояние развернутости групп по умолчанию.
      - `treeFromRelation`: String - поле родителя (для Tree View).
      - `treeToRelation`: String - поле ID (для Tree View).
      - `lazyTree`: Boolean - ленивая загрузка дерева.

    - **Selection:**
      - `selectionType`: String - 'single', 'multi', 'checkbox', 'cell'.
      - `selected`: Array (v-model) - массив выбранных строк.
      - `rowIdentity`: Function - (важно!) функция для получения уникального ID строки (track-by).
      - `selectAllRowsOnPage`: Boolean - поведение чекбокса "выбрать все".

    - **Summary:**
      - `summaryRow`: Boolean - показывать строку итогов.
      - `summaryPosition`: String - 'top' | 'bottom'.
      - `summaryHeight`: Number - высота строки итогов.
    - **Virtualization**: В новой версии виртуализация включена по умолчанию.

- **Events:**
  - `update:sort`: Изменение сортировки.
  - `sort`: Алиас для совместимости.
  - `scroll-end`: Событие достижения конца списка.
  - `page`: Смена страницы.
  - `select`: Изменение выделения.
  - `activate`: Клик по ячейке/строке.
  - `tree-action`: Событие сворачивания/разворачивания узла дерева.
  - `group-toggle`: Событие сворачивания/разворачивания группы.

- **Logic:**
  - Управление сортировкой и пагинацией (если вынесена "наружу", то проксирование событий).
  - Предоставление контекста (Provide) для дочерних компонентов.

### 3. Стратегия загрузки данных (Data Loading Strategy)

Рассмотрев вариант внедрения **Pull-модели** (передача функции загрузки внутрь таблицы), принято решение сохранить **Push-модель** (передача данных через props) по следующим причинам:

1.  **Разделение ответственности (Separation of Concerns):** Таблица должна отвечать только за отображение. Логика запросов (Auth headers, Axios/Fetch, обработка ошибок API) должна оставаться снаружи.
2.  **Гибкость:** Push-модель позволяет использовать таблицу с синхронными данными, Vuex/Pinia, или Real-time подписками (WebSocket) без изменений в коде компонента.
3.  **Совместимость с Composition API:** Во Vue 3 логику "Pull и накопления" лучше всего вынести в отдельный **Composable** (`useDataSource` или `useInfiniteLoader`).

**Рекомендуемый паттерн (Composable):**
Вместо усложнения компонента таблицы, будет создан composable `useInfiniteScroll`, который:

- Принимает функцию загрузки `fetchData`.
- Хранит реактивный массив `rows`.
- Экспортирует метод `loadMore`, который родитель привязывает к событию `@scroll-end` таблицы.

Таким образом, мы получаем удобство Pull-модели, не загрязняя "ядро" компонента бизнес-логикой.

#### `DataTableBody.vue` (Virtual Scroll Engine)

Отвечает за рендеринг видимой части строк.

- **State:**
  - `scrollTop`: Текущая позиция скролла.
  - `viewportHeight`: Высота видимой области тела таблицы.
- **Computed:**
  - `totalHeight`: `props.rows.length * props.rowHeight`.
  - `startIndex`: `Math.floor(scrollTop / props.rowHeight)`.
  - `endIndex`: `Math.min(props.rows.length, startIndex + Math.ceil(viewportHeight / props.rowHeight) + buffer)`.
  - `visibleRows`: Срез массива `rows.slice(startIndex, endIndex)`.
  - `offsetY`: Смещение контента (для реализации виртуального скролла, может применяться через transform или padding к контейнеру).
- **Rendering:**
  - Использование одного контейнера с `overflow-y: auto`.
  - Внутри "spacer" div с высотой `totalHeight`, либо использование абсолютного позиционирования строк внутри контейнера.
  - Рендеринг `<DataTableRow>` в цикле `v-for="row in visibleRows"`.

#### `DataTableRow.vue`

- **Props:**
  - `row`: Объект данных строки.
  - `columns`: Конфигурация колонок.
  - `rowIndex`: Абсолютный индекс строки (для чересполосицы и ключей).
- **Style:**
  - `height`: `props.rowHeight`.
  - `transform`: `translateY(${rowIndex * rowHeight}px)` (если используется абсолютное позиционирование).

### 4. Удаление устаревшего кода

Следующие файлы и сущности не будут перенесены или будут существенно переписаны:

- `src/utils/math.ts` (частично, если содержит сложную логику для variable height).
- `src/services/dimensions-helper.service.ts` (скорее всего, не понадобится в прежнем виде).
- `ScrollerComponent` (будет заменен на нативный скролл контейнер с `resizeObserver`).
- Логика `updateIndexes` в `body.component.ts` будет упрощена до линейной формулы.

## План разработки (Roadmap)

1.  **Инициализация**: Создание структуры проекта Vue 3 + TS.
2.  **Базовые компоненты**: Портирование стилей и верстки `Header`, `Footer`.
3.  **Виртуализация (Body)**:
    - Реализация скролл-контейнера.
    - Реализация логики расчета `startIndex`/`endIndex` для фиксированной высоты.
    - Интеграция с `ResizeObserver` для отслеживания размеров контейнера.
4.  **Рендеринг строк и ячеек**: Портирование шаблонов ячеек и слотов.
5.  **Интерактивность**: Добавление поддержки выделения (selection) и событий клика.

## Ключевые отличия реализации (Vue 2 vs Vue 3 Fixed)

| Feature          | Vue 2 (Current)               | Vue 3 (Proposal)                         |
| :--------------- | :---------------------------- | :--------------------------------------- |
| **Row Height**   | Dynamic/Fixed (Cache Lookup)  | **Fixed Only** (O(1) calculation)        |
| **Scroll Event** | Custom Scroller / Tick loop   | Native `@scroll` event (throttled)       |
| **Reactivity**   | Class Components / Decorators | `<script setup>` / Composition API       |
| **Wrapper**      | `body-row-wrapper`            | Упрощенный рендеринг (flatten structure) |

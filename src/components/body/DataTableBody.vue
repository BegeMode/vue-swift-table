<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, inject, type Ref } from 'vue';
import type { CSSProperties } from 'vue';

import type { InternalTableColumn } from '@/types/table-column.type';
import type { IGroupedRows } from '@/types/grouped-rows';
import DataTableRow from './DataTableRow.vue';
import DataTableGroupHeader from './DataTableGroupHeader.vue';
import DataTableSummaryRow from './DataTableSummaryRow.vue';
import DataTableProgress from './DataTableProgress.vue';
import { DEFAULT_VISIBLE_ROWS, type IPageManager, type IRowInfo, type IRowsManager, type RowType } from '@/types/table';
import type { ISortPropDir } from '@/types/sort-prop-dir.type';

const MAX_HEIGHT = 15_000_000; // browser limit in pixels

/**
 * Scroll source tracking:
 * - 'none': Initial state or after render without scroll
 * - 'user': User initiated scroll (wheel, drag scrollbar)
 * - 'programmatic': Code-initiated scroll (initial position, page change)
 *
 * We only emit 'page' events to load next/prev pages when scroll is user-initiated.
 * Programmatic scrolls (setting initial position or jumping to page) should not trigger page loads.
 */
type ScrollSource = 'none' | 'user' | 'programmatic';

interface Props {
  loading?: 'top' | 'bottom' | 'none';
  infiniteScroll?: boolean;
  columns: Array<InternalTableColumn>;
  page: number;
  sorts?: ISortPropDir[];
  groupRowsBy?: string[];
  columnStyles?: Record<string, CSSProperties>;
  innerWidth?: number;
  rowHeight: number;
  bodyHeight?: number | string; // explicit height if needed, or flex
  selected?: Array<any>;
  selectionType?: string;
  rowIdentity?: (row: any) => any;
  summaryRow?: boolean;
  summaryPosition?: 'top' | 'bottom';
  summaryHeight?: number;
  expanded?: Set<RowType | IGroupedRows>;
  rowDetailHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  page: 0,
  rowHeight: 50,
  selected: () => [],
  summaryHeight: 30,
  expanded: () => new Set(),
  rowDetailHeight: 0,
});

const emit = defineEmits<{
  scroll: [event: { target: HTMLElement | null }];
  'update:scrollTop': [value: number];
  'row-select': [event: { row: RowType; event: MouseEvent }];
  activate: [event: { row: RowType; event: MouseEvent }];
  'group-toggle': [event: IGroupedRows];
  'scrollbar-width': [width: number];
  page: [event: { page: number }];
  'visible-rows-count': [count: number];
}>();

// State
const scrollable = ref<HTMLDivElement | null>(null);
const rowsContainer = ref<HTMLDivElement | null>(null);
const summaryTopRef = ref<HTMLDivElement | null>(null);
const summaryBottomRef = ref<HTMLDivElement | null>(null);
const containerHeight = ref(props.rowHeight * DEFAULT_VISIBLE_ROWS);
const containerWidth = ref(0);
const visibleRowsCount = computed(() => {
  const count = Math.ceil(containerHeight.value / props.rowHeight) + 1;
  emit('visible-rows-count', count);
  return count;
});

const scrollLeft = ref(0);
const scrollTop = ref(0);
// for smoother scrolling
const offsetY = ref(0);
const currentPage = ref(props.page);

const visibleRows = ref<IRowInfo[]>([]);

const rowsManager: IRowsManager = inject('rowsManager')!;
const pageManager: IPageManager = inject('pageManager')!;
// Reactive trigger for rows data changes
const rowsVersion = inject<Ref<number>>('rowsVersion')!;

// Track scroll source to avoid page loads on programmatic scrolls
const scrollSource = ref<ScrollSource>('none');
// Track if initial scroll position for non-zero page has been set
let isInitialized = false;
// Track last scroll position to determine scroll direction
let lastScrollTop = 0;
let scrollDirection: 'up' | 'down' = 'up';

// State for scrollbars
const scrollbarWidth = ref(0);
const checkScrollbar = () => {
  if (scrollable.value) {
    const width = scrollable.value.offsetWidth - scrollable.value.clientWidth;
    if (width !== scrollbarWidth.value) {
      scrollbarWidth.value = width;
      emit('scrollbar-width', width);
    }
  }
};

const updateVisibleRows = () => {
  if (!scrollable.value) {
    return;
  }
  // Pass page for paged mode, undefined for infinite scroll
  const pageArg = props.infiniteScroll ? undefined : props.page;
  rowsManager.fillVisibleRows(
    scrollTop.value * scrollYKoef.value,
    props.rowHeight,
    visibleRowsCount.value,
    visibleRows.value,
    pageArg
  );

  // Only check for next/prev page loading on user-initiated scrolls
  // Skip for: non-infinite modes, uninitialized state, or programmatic scrolls
  if (!props.infiniteScroll || !isInitialized || scrollSource.value !== 'user') {
    return;
  }

  const lastVisibleRow = visibleRows.value[visibleRows.value.length - 1];
  if (!lastVisibleRow) {
    return;
  }
  currentPage.value = lastVisibleRow.page;
  const pageInfo = pageManager.getPageInfo(currentPage.value);
  if (!pageInfo) {
    return;
  }

  // Check if scrolling down and next page is not loaded
  if (scrollDirection === 'down' && !pageInfo.isLast) {
    const maxPageIndex = pageInfo.start + pageInfo.size;
    if (lastVisibleRow.index >= maxPageIndex - visibleRowsCount.value) {
      const nextPageInfo = pageManager.getPageInfo(currentPage.value + 1);
      if (!nextPageInfo) {
        currentPage.value += 1;
        return;
      }
    }
  }

  // Check if scrolling up and previous page is not loaded
  if (scrollDirection === 'up' && currentPage.value > 1) {
    const firstVisibleRow = visibleRows.value[0];
    if (firstVisibleRow && currentPage.value > 1) {
      const minPageIndex = pageInfo.start;
      if (firstVisibleRow.index <= minPageIndex + visibleRowsCount.value) {
        const prevPageInfo = pageManager.getPageInfo(currentPage.value - 1);
        if (!prevPageInfo) {
          currentPage.value -= 1;
        }
      }
    }
  }
};

let resizeObserver: ResizeObserver | null = null;
let scrollRafId: number | null = null;
// Timer to reset scrollSource after user stops scrolling
let scrollResetTimerId: ReturnType<typeof setTimeout> | null = null;

const handleScroll = () => {
  if (!scrollable.value) {
    return;
  }

  // Clear any pending reset timer
  if (scrollResetTimerId !== null) {
    clearTimeout(scrollResetTimerId);
    scrollResetTimerId = null;
  }

  // If scroll was programmatic, reset to 'none' after processing
  // If scroll was from user, mark as 'user'
  if (scrollSource.value === 'programmatic') {
    // Programmatic scroll event - reset for next scroll
    scrollSource.value = 'none';
  } else {
    // This is user-initiated scroll
    scrollSource.value = 'user';

    // Reset to 'none' after user stops scrolling (allows paginator to work)
    scrollResetTimerId = setTimeout(() => {
      scrollSource.value = 'none';
      scrollResetTimerId = null;
    }, 200);
  }

  lastScrollTop = scrollTop.value;
  scrollTop.value = scrollable.value.scrollTop;
  if (lastScrollTop < scrollTop.value) {
    scrollDirection = 'down';
  } else {
    scrollDirection = 'up';
  }

  scrollLeft.value = scrollable.value.scrollLeft;
  if (rowsContainer.value) {
    rowsContainer.value.scrollLeft = scrollLeft.value;
  }

  // Also sync summary rows
  if (summaryTopRef.value) {
    summaryTopRef.value.scrollLeft = scrollLeft.value;
  }
  if (summaryBottomRef.value) {
    summaryBottomRef.value.scrollLeft = scrollLeft.value;
  }

  emit('scroll', { target: scrollable.value });

  offsetY.value = scrollTop.value % props.rowHeight;
};

const rafHandleScroll = () => {
  // Cancel any pending RAF to prevent stacking
  if (scrollRafId !== null) {
    cancelAnimationFrame(scrollRafId);
  }
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = null;
    handleScroll();
  });
};

/**
 * Forward wheel events to the scrollable container.
 * The rows container overlays the scrollable div, so we need to manually
 * forward wheel events. Using scrollBy() for better native scroll behavior.
 */
const onWheel = (e: WheelEvent) => {
  if (!scrollable.value) return;
  e.preventDefault();
  scrollable.value.scrollBy({
    top: e.deltaY,
    left: e.deltaX,
    behavior: 'instant',
  });
};

const updateContainerSize = (entries: ResizeObserverEntry[]) => {
  for (const entry of entries) {
    if (entry.target === scrollable.value) {
      containerHeight.value = entry.contentRect.height;
      containerWidth.value = entry.contentRect.width;
      checkScrollbar();
      break;
    }
  }
};

onMounted(async () => {
  if (scrollable.value) {
    checkScrollbar();
    scrollable.value.addEventListener('scroll', rafHandleScroll);

    resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(scrollable.value);

    await nextTick();
    if (scrollable.value) {
      containerHeight.value = scrollable.value.clientHeight;
      containerWidth.value = scrollable.value.clientWidth;
    }
  }
});

onUnmounted(() => {
  if (scrollable.value) {
    scrollable.value.removeEventListener('scroll', rafHandleScroll);
  }

  if (scrollRafId !== null) {
    cancelAnimationFrame(scrollRafId);
    scrollRafId = null;
  }

  if (scrollResetTimerId !== null) {
    clearTimeout(scrollResetTimerId);
    scrollResetTimerId = null;
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

const isRowExpanded = (row: IRowInfo) => {
  return props.expanded?.has(row.data as RowType | IGroupedRows) ?? false;
};

const allRowsHeight = computed(() => {
  // Depend on rowsVersion to trigger recalculation when rows data changes
  rowsVersion.value;
  // Pass page for paged mode, undefined for infinite scroll
  const pageArg = props.infiniteScroll ? undefined : props.page;
  const base = props.rowHeight * rowsManager.getRowsCount(pageArg);
  let detail = 0;
  visibleRows.value.forEach(r => {
    if (props.expanded?.has(r.data as RowType | IGroupedRows)) {
      detail += props.rowDetailHeight;
    }
  });
  return base + detail;
});

const totalHeight = computed(() => {
  return Math.min(allRowsHeight.value, MAX_HEIGHT);
});

const scrollYKoef = computed(() => {
  const viewPortHeight = rowsContainer.value?.clientHeight ?? 0;
  // if {allRowsHeight} > 15 million -> we have to apply koef on scroll
  // if {allRowsHeight} <= 15 million -> {scrollYKoef} = 1
  const result = (allRowsHeight.value - viewPortHeight) / (totalHeight.value - viewPortHeight);
  if (Number.isNaN(result)) {
    return 1;
  }
  return result;
});

const visibleRowsHeight = computed(() => containerHeight.value + offsetY.value);

watch(
  [
    () => props.sorts,
    () => props.groupRowsBy,
    scrollTop,
    visibleRows,
    containerHeight,
    () => props.expanded,
    rowsVersion,
  ],
  updateVisibleRows
);

watch(
  () => props.page,
  async (newVal, oldVal) => {
    if (!scrollable.value) {
      return;
    }

    // If user is actively scrolling, never force scroll position changes
    // This prevents jumps when page change is triggered by user scroll
    if (props.infiniteScroll && scrollSource.value === 'user') {
      return;
    }

    // If props.page matches currentPage, this is an "echo" from our own emit
    // (user scrolled -> currentPage changed -> emit('page') -> parent updated props.page)
    // In this case, don't force scroll position
    if (props.infiniteScroll && newVal === currentPage.value) {
      return;
    }

    if (props.infiniteScroll && oldVal) {
      const pageInfo = pageManager.getPageInfo(newVal);
      if (!pageInfo) return;

      // Check if we're already scrolled within this page's range
      const currentScrollTop = scrollable.value.scrollTop;
      const pageStartScroll = pageInfo.start * props.rowHeight;
      const pageEndScroll = (pageInfo.start + pageInfo.size) * props.rowHeight;

      // If already in range, don't force scroll (user is scrolling naturally)
      if (currentScrollTop >= pageStartScroll && currentScrollTop < pageEndScroll) {
        return;
      }

      // Set scroll position
      await nextTick();
      scrollSource.value = 'programmatic';
      scrollable.value.scrollTop = pageStartScroll;
    } else {
      if (!props.infiniteScroll) {
        scrollable.value.scrollTop = 0;
      }
      updateVisibleRows();
    }
  }
);

watch(currentPage, newVal => {
  emit('page', { page: newVal });
});

watch(
  rowsVersion,
  async () => {
    if (!props.infiniteScroll) {
      isInitialized = true;
      return;
    }
    if (isInitialized || props.page === 0) {
      return;
    }
    if (!scrollable.value) {
      return;
    }
    const pageInfo = pageManager.getPageInfo(props.page);
    if (!pageInfo) {
      return;
    }
    // Mark as initialized and set programmatic scroll
    isInitialized = true;
    await nextTick();
    if (scrollable.value) {
      scrollSource.value = 'programmatic';
      scrollable.value.scrollTop = pageInfo.start * props.rowHeight;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="datatable-body">
    <div class="datatable-body-table">
      <DataTableSummaryRow
        v-if="summaryRow && summaryPosition === 'top'"
        ref="summaryTopRef"
        :columns="columns"
        :columnStyles="columnStyles"
        :rowHeight="summaryHeight"
        :innerWidth="innerWidth"
        class="datatable-summary-top"
      />
      <div class="datatable-body-scroll-area">
        <DataTableProgress
          v-if="loading === 'top'"
          class="progress-top"
          :style="{ width: containerWidth ? `${containerWidth}px` : '100%' }"
        />
        <div ref="scrollable" class="datatable-body-scrollable">
          <div
            class="datatable-body-scroll-content"
            :style="{
              height: `${totalHeight}px`,
              width: innerWidth ? `${innerWidth}px` : '100%',
            }"
          ></div>
        </div>
        <div
          ref="rowsContainer"
          class="datatable-body-rows"
          :style="{
            width: `${containerWidth}px`,
            transform: `translate3d(0, -${offsetY}px, 0)`,
            height: `${visibleRowsHeight}px`,
          }"
          @wheel="onWheel"
        >
          <template v-for="(item, index) in visibleRows" :key="index">
            <DataTableGroupHeader
              v-if="item.data?.__isGroup"
              :group="item.data as IGroupedRows"
              :expanded="(item.data as IGroupedRows).expanded"
              :rowHeight="rowHeight"
              :innerWidth="innerWidth"
              @toggle="emit('group-toggle', $event)"
            />
            <DataTableRow
              v-else-if="item.data"
              :row="item.data"
              :rowIndex="item.index"
              :columns="columns"
              :columnStyles="columnStyles"
              :rowHeight="rowHeight"
              :rowDetailHeight="rowDetailHeight"
              :expanded="isRowExpanded(item)"
              :isSelected="selected?.includes(item.data)"
              :selectionType="selectionType"
              :innerWidth="innerWidth"
              @select="emit('row-select', { row: item.data, event: $event })"
              @activate="emit('activate', { row: item.data, event: $event })"
            >
              <template #detail>
                <slot name="rowDetail" :row="item.data"></slot>
              </template>
            </DataTableRow>
          </template>
        </div>
        <DataTableProgress
          v-if="loading === 'bottom'"
          class="progress-bottom"
          :style="{ width: containerWidth ? `${containerWidth}px` : '100%' }"
        />
      </div>
      <DataTableSummaryRow
        v-if="summaryRow && summaryPosition === 'bottom'"
        ref="summaryBottomRef"
        :columns="columns"
        :columnStyles="columnStyles"
        :rowHeight="summaryHeight"
        :innerWidth="innerWidth"
        class="datatable-summary-bottom"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.datatable-body {
  flex: 1;
  display: flex;
  background-color: white;
  overflow: hidden;
  contain: content;

  &-table {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    contain: content;
    height: 100%;
  }

  &-scroll-area {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  &-rows {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-flow: column nowrap;
    contain: layout style;
    overflow: hidden;
    will-change: transform;
    z-index: 1;
    pointer-events: none;
  }

  :deep(.datatable-body-row),
  :deep(.datatable-group-header) {
    pointer-events: auto;
  }

  &-scrollable {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
  }

  &-scroll-content {
    position: relative;
    contain: layout style;
    width: 100%;
  }
}

.datatable-summary-top,
.datatable-summary-bottom {
  flex-shrink: 0;
  z-index: 10;
}

.progress-top,
.progress-bottom {
  position: absolute;
  left: 0;
  z-index: 100;
}

.progress-top {
  top: 0;
}

.progress-bottom {
  bottom: 0;
}
</style>

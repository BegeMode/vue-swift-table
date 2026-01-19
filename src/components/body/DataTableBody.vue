<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, inject, type Ref } from 'vue';
import type { CSSProperties } from 'vue';

import type { TableColumn } from '../../types/table-column.type';
import type { IGroupedRows } from '../../types/grouped-rows';
import DataTableRow from './DataTableRow.vue';
import DataTableGroupHeader from './DataTableGroupHeader.vue';
import DataTableSummaryRow from './DataTableSummaryRow.vue';
import type { IPageManager, IRowInfo, IRowsManager, RowType } from '@/types/table';
import type { ISortPropDir } from '@/types/sort-prop-dir.type';

interface Props {
  infiniteScroll?: boolean;
  columns: Array<TableColumn>;
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

const emit = defineEmits([
  'scroll',
  'update:scrollTop',
  'row-select',
  'activate',
  'group-toggle',
  'scrollbar-width',
  'page',
]);

const SCROLL_THROTTLE = 16; // ~60fps
const DEFAULT_VISIBLE_ROWS = 50;

// State
const scrollable = ref<HTMLDivElement | null>(null);
const rowsContainer = ref<HTMLDivElement | null>(null);
const containerHeight = ref(props.rowHeight * DEFAULT_VISIBLE_ROWS);
const containerWidth = ref(0);
const visibleRowsCount = computed(() => Math.ceil(containerHeight.value / props.rowHeight) + 1);

const scrollLeft = ref(0);
const scrollTop = ref(0);
const offsetY = ref(0);
const currentPage = ref(props.page);

const visibleRows = ref<IRowInfo[]>([]);

const rowsManager: IRowsManager = inject('rowsManager')!;
const pageManager: IPageManager = inject('pageManager')!;
// Reactive trigger for rows data changes
const rowsVersion = inject<Ref<number>>('rowsVersion')!;

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
  rowsManager.fillVisibleRows(scrollTop.value, props.rowHeight, visibleRowsCount.value, visibleRows.value, pageArg);
  if (!props.infiniteScroll) {
    return;
  }
  const lastVisibleRow = visibleRows.value[visibleRows.value.length - 1];
  if (!lastVisibleRow) {
    return;
  }
  currentPage.value = lastVisibleRow.page;
  let pageInfo = pageManager.getPageInfo(currentPage.value);
  if (!pageInfo || pageInfo.isLast) {
    return;
  }
  const maxPageIndex = pageInfo.start + pageInfo.size;
  if (lastVisibleRow.index >= maxPageIndex - visibleRowsCount.value) {
    pageInfo = pageManager.getPageInfo(currentPage.value + 1);
    if (!pageInfo) {
      currentPage.value += 1;
    }
  }
};

let lastScrollTime = 0;
let resizeObserver: ResizeObserver | null = null;

const handleScroll = () => {
  if (!scrollable.value) return;

  const now = Date.now();
  if (now - lastScrollTime < SCROLL_THROTTLE) return;
  lastScrollTime = now;

  scrollTop.value = scrollable.value.scrollTop;

  scrollLeft.value = scrollable.value.scrollLeft;
  if (rowsContainer.value) {
    rowsContainer.value.scrollLeft = scrollLeft.value;
  }

  emit('scroll', { target: scrollable.value });

  offsetY.value = scrollTop.value % props.rowHeight;
};

const onWheel = (e: WheelEvent) => {
  if (!scrollable.value) return;
  scrollable.value.scrollTop += e.deltaY;
  scrollable.value.scrollLeft += e.deltaX;
};

const rafHandleScroll = () => {
  requestAnimationFrame(handleScroll);
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

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

const isRowExpanded = (row: IRowInfo) => {
  return props.expanded?.has(row.data as RowType | IGroupedRows) ?? false;
};

const totalHeight = computed(() => {
  // Depend on rowsVersion to trigger recalculation when rows data changes
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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

      await nextTick();
      scrollable.value.scrollTop = pageStartScroll;
    } else {
      updateVisibleRows();
    }
  }
);

watch(currentPage, () => {
  emit('page', { page: currentPage.value });
});
</script>

<template>
  <div class="datatable-body">
    <div class="datatable-body-table">
      <DataTableSummaryRow
        v-if="summaryRow && summaryPosition === 'top'"
        :columns="columns"
        :columnStyles="columnStyles"
        :rowHeight="summaryHeight"
        class="datatable-summary-top"
      />
      <div class="datatable-body-scroll-area">
        <div ref="scrollable" class="datatable-body-scrollable" @scroll="handleScroll">
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
          <template v-for="item in visibleRows" :key="item.uid">
            <DataTableGroupHeader
              v-if="item.data!.__isGroup"
              :group="item.data as IGroupedRows"
              :expanded="(item.data as IGroupedRows).expanded"
              :rowHeight="rowHeight"
              @toggle="emit('group-toggle', $event)"
            />
            <DataTableRow
              v-else
              :row="item.data!"
              :rowIndex="item.index"
              :columns="columns"
              :columnStyles="columnStyles"
              :rowHeight="rowHeight"
              :rowDetailHeight="rowDetailHeight"
              :expanded="isRowExpanded(item)"
              :isSelected="selected?.includes(item.data)"
              :selectionType="selectionType"
              @select="emit('row-select', { row: item.data, event: $event })"
              @activate="emit('activate', { row: item.data, event: $event })"
            >
              <template #detail>
                <slot name="rowDetail" :row="item.data"></slot>
              </template>
            </DataTableRow>
          </template>
        </div>
      </div>
      <DataTableSummaryRow
        v-if="summaryRow && summaryPosition === 'bottom'"
        :columns="columns"
        :columnStyles="columnStyles"
        :rowHeight="summaryHeight"
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
    position: relative;
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
</style>

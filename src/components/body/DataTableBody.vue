<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { CSSProperties } from 'vue';

import type { TableColumn } from '../../types/table-column.type';
import type { IGroupedRows } from '../../types/grouped-rows';
import DataTableRow from './DataTableRow.vue';
import DataTableGroupHeader from './DataTableGroupHeader.vue';
import DataTableSummaryRow from './DataTableSummaryRow.vue';

interface Props {
  rows: Array<Record<string, unknown> | IGroupedRows | any>;
  columns: Array<TableColumn>;
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
  expanded?: Array<any>;
  rowDetailHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  rows: () => [],
  rowHeight: 50,
  selected: () => [],
  summaryHeight: 30,
  expanded: () => [],
  rowDetailHeight: 0,
});

const emit = defineEmits(['scroll', 'update:scrollTop', 'row-select', 'activate', 'group-toggle', 'scrollbar-width']);

const SCROLL_THROTTLE = 16; // ~60fps
const DEFAULT_VISIBLE_ROWS = 50;

// State
const scrollable = ref<HTMLDivElement | null>(null);
const rowsContainer = ref<HTMLDivElement | null>(null);
const containerHeight = ref(props.rowHeight * DEFAULT_VISIBLE_ROWS);
const containerWidth = ref(0);
const visibleRowsCount = computed(() => Math.ceil(containerHeight.value / props.rowHeight) + 1);

const firstVisibleRow = ref(0);
const lastVisibleRow = ref(DEFAULT_VISIBLE_ROWS);
const scrollLeft = ref(0);
const offsetY = ref(0);

const visibleRows = ref<Record<string, any>[]>([]);

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
  const start = Math.max(0, firstVisibleRow.value);
  lastVisibleRow.value = Math.min(props.rows.length, start + visibleRowsCount.value);
  const length = lastVisibleRow.value - start;

  visibleRows.value.length = length;
  for (let i = 0; i < length; i++) {
    visibleRows.value[i] = {
      row: props.rows[start + i],
      rowIndex: i,
      expanded: expandedSet.value.has(start + i),
    };
  }
};

let lastScrollTime = 0;
let resizeObserver: ResizeObserver | null = null;

const handleScroll = () => {
  if (!scrollable.value) return;

  const now = Date.now();
  if (now - lastScrollTime < SCROLL_THROTTLE) return;
  lastScrollTime = now;

  const scrollTop = scrollable.value.scrollTop;

  scrollLeft.value = scrollable.value.scrollLeft;
  if (rowsContainer.value) {
    rowsContainer.value.scrollLeft = scrollLeft.value;
  }

  emit('scroll', { target: scrollable.value });

  firstVisibleRow.value = Math.trunc(scrollTop / props.rowHeight);
  offsetY.value = scrollTop % props.rowHeight;
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
  updateVisibleRows();

  if (scrollable.value) {
    checkScrollbar();
    scrollable.value.addEventListener('scroll', rafHandleScroll);

    resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(scrollable.value);

    await nextTick();
    if (scrollable.value) {
      containerHeight.value = scrollable.value.clientHeight;
      containerWidth.value = scrollable.value.clientWidth;
      firstVisibleRow.value = 0;
      lastVisibleRow.value = Math.min(DEFAULT_VISIBLE_ROWS, props.rows.length);
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

// const rowOffset = computed(() => {
//   if (props.summaryRow && props.summaryPosition === 'top') {
//     return props.summaryHeight;
//   }
//   return 0;
// });

const expandedIndices = computed(() => {
  if (!props.expanded || props.expanded.length === 0 || !props.rowDetailHeight) return [];
  const expandSet = new Set(props.expanded);
  const indices: number[] = [];
  props.rows.forEach((r, i) => {
    if (expandSet.has(r)) indices.push(i);
  });
  return indices;
});

const expandedSet = computed(() => new Set(expandedIndices.value));

const totalHeight = computed(() => {
  const base = props.rowHeight * props.rows.length;
  let detail = 0;
  expandedIndices.value.forEach(i => {
    if (i >= firstVisibleRow.value && i < lastVisibleRow.value) {
      detail += props.rowDetailHeight;
    }
  });

  return base + detail;
});

const visibleRowsHeight = computed(() => containerHeight.value + offsetY.value);

watch([() => props.rows, firstVisibleRow, containerHeight, expandedIndices], updateVisibleRows);
</script>

<template>
  <div class="datatable-body">
    <div class="datatable-body-table">
      <DataTableSummaryRow
        v-if="summaryRow && summaryPosition === 'top'"
        :rows="rows"
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
          <template v-for="item in visibleRows" :key="item.rowIndex">
            <DataTableGroupHeader
              v-if="item.row.__isGroup"
              :group="item.row"
              :expanded="item.row.expanded"
              :rowHeight="rowHeight"
              @toggle="emit('group-toggle', $event)"
            />
            <DataTableRow
              v-else
              :row="item.row"
              :rowIndex="item.rowIndex"
              :columns="columns"
              :columnStyles="columnStyles"
              :rowHeight="rowHeight"
              :rowDetailHeight="rowDetailHeight"
              :expanded="item.expanded"
              :isSelected="selected?.includes(item.row)"
              :selectionType="selectionType"
              @select="emit('row-select', { row: item.row, event: $event })"
              @activate="emit('activate', { row: item.row, event: $event })"
            >
              <template #detail>
                <slot name="rowDetail" :row="item.row"></slot>
              </template>
            </DataTableRow>
          </template>
        </div>
      </div>
      <DataTableSummaryRow
        v-if="summaryRow && summaryPosition === 'bottom'"
        :rows="rows"
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

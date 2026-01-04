<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
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

const emit = defineEmits(['scroll', 'update:scrollTop', 'row-select', 'activate', 'group-toggle']);

// State
const scrollTop = ref(0);
const scroller = ref<HTMLElement | null>(null);
const viewportHeight = ref(0); // This should be observed

// Resize Observer to get viewport height
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (scroller.value) {
    viewportHeight.value = scroller.value.clientHeight;

    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        viewportHeight.value = entry.contentRect.height;
      }
    });
    resizeObserver.observe(scroller.value);

    scroller.value.addEventListener('scroll', onScroll, { passive: true });
  }
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (scroller.value) scroller.value.removeEventListener('scroll', onScroll);
});

const onScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
  emit('scroll', e);
  emit('update:scrollTop', scrollTop.value);
};

// Calculations for Variable Height
const expandedIndices = computed(() => {
  if (!props.expanded || props.expanded.length === 0 || !props.rowDetailHeight) return [];
  const expandSet = new Set(props.expanded);
  const indices: number[] = [];
  props.rows.forEach((r, i) => {
    if (expandSet.has(r)) indices.push(i);
  });
  return indices;
});

const getRowTop = (index: number) => {
  if (expandedIndices.value.length === 0) return index * props.rowHeight;

  // Binary search count of expanded before index

  let left = 0;
  let right = expandedIndices.value.length - 1;
  let result = 0;

  while (left <= right) {
    const mid = (left + right) >>> 1;
    if (expandedIndices.value[mid] && expandedIndices.value[mid] < index) {
      result = mid + 1;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return index * props.rowHeight + result * props.rowDetailHeight;
};

const totalHeight = computed(() => {
  const base = props.rows.length * props.rowHeight;
  const detail = expandedIndices.value.length * props.rowDetailHeight;
  return base + detail;
});

// Buffer for smooth scrolling (render a few extra rows)
const BUFFER = 5;

const getStartIndex = (scrollTopVal: number) => {
  if (expandedIndices.value.length === 0) {
    return Math.floor(scrollTopVal / props.rowHeight);
  }

  let low = 0;
  let high = props.rows.length - 1;
  let idx = 0;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const top = getRowTop(mid);
    if (top <= scrollTopVal) {
      idx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return idx;
};

const startIndex = computed(() => {
  return getStartIndex(scrollTop.value);
});

const visibleRows = computed(() => {
  // Determine range
  // Simple heuristic for count: (Viewport / MinRowHeight) + Buffer
  // MinRowHeight is props.rowHeight.
  const visibleCount = Math.ceil(viewportHeight.value / props.rowHeight);
  const start = Math.max(0, startIndex.value - BUFFER);
  const end = Math.min(props.rows.length, startIndex.value + visibleCount + BUFFER);

  const expandSet = new Set(expandedIndices.value);

  const res = [];
  for (let i = start; i < end; i++) {
    const row = props.rows[i];
    // Optimized: getRowTop does binary search.
    // Optimization: we could incrementally calculate if we knew previous top.
    // But for <50 items, N*LogM is fine.
    const top = getRowTop(i);
    res.push({
      row,
      rowIndex: i,
      offsetY: top,
      expanded: expandSet.has(i),
    });
  }
  return res;
});

// Styles
const scrollerStyle = computed<CSSProperties>(() => ({
  height: '100%',
  overflowY: 'auto',
  overflowX: 'auto',
  position: 'relative',
}));

const contentStyle = computed<CSSProperties>(() => ({
  height: `${totalHeight.value + (props.summaryRow ? props.summaryHeight : 0)}px`,
  width: props.innerWidth ? `${props.innerWidth}px` : '100%',
  position: 'relative',
}));

const rowOffset = computed(() => {
  if (props.summaryRow && props.summaryPosition === 'top') {
    return props.summaryHeight;
  }
  return 0;
});
</script>

<template>
  <div class="datatable-body" ref="scroller" :style="scrollerStyle">
    <div :style="contentStyle" class="datatable-scroll">
      <DataTableSummaryRow
        v-if="summaryRow && summaryPosition === 'top'"
        :rows="rows"
        :columns="columns"
        :columnStyles="columnStyles"
        :rowHeight="summaryHeight"
        style="position: sticky; top: 0; z-index: 10"
      />

      <template v-for="item in visibleRows" :key="item.rowIndex">
        <DataTableGroupHeader
          v-if="item.row.__isGroup"
          :group="item.row"
          :expanded="item.row.expanded"
          :rowHeight="rowHeight"
          :style="{
            transform: `translateY(${item.offsetY}px)`,
            position: 'absolute',
            width: '100%',
            top: `${rowOffset}px`,
          }"
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
          :offsetY="item.offsetY"
          :isSelected="selected?.includes(item.row)"
          :selectionType="selectionType"
          :style="{ top: `${rowOffset}px` }"
          @select="emit('row-select', { row: item.row, event: $event })"
          @activate="emit('activate', { row: item.row, event: $event })"
        >
          <template #detail>
            <slot name="rowDetail" :row="item.row"></slot>
          </template>
        </DataTableRow>
      </template>

      <DataTableSummaryRow
        v-if="summaryRow && summaryPosition === 'bottom'"
        :rows="rows"
        :columns="columns"
        :columnStyles="columnStyles"
        :rowHeight="summaryHeight"
        :style="{ position: 'sticky', bottom: 0, zIndex: 10, marginTop: `${totalHeight}px` }"
      />
    </div>
  </div>
</template>

<style scoped>
.datatable-body {
  /* Ensure it takes space */
  flex: 1 1 auto;
}
</style>

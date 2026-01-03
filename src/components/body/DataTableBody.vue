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
}

const props = withDefaults(defineProps<Props>(), {
  rows: () => [],
  rowHeight: 50,
  selected: () => [],
  summaryHeight: 30
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
    
    resizeObserver = new ResizeObserver((entries) => {
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

// Calculations
const totalHeight = computed(() => props.rows.length * props.rowHeight);

// Buffer for smooth scrolling (render a few extra rows)
const BUFFER = 5;

const startIndex = computed(() => {
  return Math.floor(scrollTop.value / props.rowHeight);
});

const endIndex = computed(() => {
  const visibleCount = Math.ceil(viewportHeight.value / props.rowHeight);
  return Math.min(props.rows.length, startIndex.value + visibleCount + BUFFER);
});

const visibleRows = computed(() => {
  // We need to account for buffer in start index too if we want, but usually start is strictly top.
  // Better to buffer top and bottom.
  const start = Math.max(0, startIndex.value - BUFFER);
  const end = Math.min(props.rows.length, endIndex.value);
  return props.rows.slice(start, end).map((row, i) => ({
    row,
    rowIndex: start + i
  }));
});

// Styles
const scrollerStyle = computed<CSSProperties>(() => ({
  height: '100%',
  overflowY: 'auto',
  overflowX: 'auto',
  position: 'relative'
}));

const contentStyle = computed<CSSProperties>(() => ({
  height: `${totalHeight.value + (props.summaryRow ? props.summaryHeight : 0)}px`,
  width: props.innerWidth ? `${props.innerWidth}px` : '100%',
  position: 'relative'
}));

const rowOffset = computed(() => {
    if (props.summaryRow && props.summaryPosition === 'top') {
        return props.summaryHeight;
    }
    return 0;
});

</script>

<template>
  <div 
    class="datatable-body" 
    ref="scroller" 
    :style="scrollerStyle"
  >
    <div :style="contentStyle" class="datatable-scroll">
       <DataTableSummaryRow 
         v-if="summaryRow && summaryPosition === 'top'"
         :rows="rows"
         :columns="columns"
         :columnStyles="columnStyles"
         :rowHeight="summaryHeight"
         style="position: sticky; top: 0; z-index: 10;"
       />

       <template v-for="item in visibleRows" :key="item.rowIndex">
         <DataTableGroupHeader
           v-if="item.row.__isGroup"
           :group="item.row"
           :expanded="item.row.expanded"
           :rowHeight="rowHeight"
           :style="{ transform: `translateY(${item.rowIndex * rowHeight}px)`, position: 'absolute', width: '100%', top: `${rowOffset}px` }"
           @toggle="emit('group-toggle', $event)"
         />
         <DataTableRow
           v-else
           :row="item.row"
           :rowIndex="item.rowIndex"
           :columns="columns"
           :columnStyles="columnStyles"
           :rowHeight="rowHeight"
           :isSelected="selected?.includes(item.row)"
           :selectionType="selectionType"
           :style="{ top: `${rowOffset}px` }"
           @select="emit('row-select', { row: item.row, event: $event })"
           @activate="emit('activate', { row: item.row, event: $event })"
         />
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

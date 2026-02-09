<script setup lang="ts">
import { computed, inject } from 'vue';
import type { TableColumnProp, InternalTableColumn } from '@/types/table-column.type';
import { getterForProp } from '@/utils/column-prop-getters';
import type { IRowsManager } from '@/types/table';

const props = defineProps<{
  columns: InternalTableColumn[];
  columnStyles?: Record<string, any>; // CSSProperties
  rowHeight: number;
  innerWidth?: number;
}>();

const summaryData = computed(() => {
  const summary: Record<string, any> = {};
  const rowsManager: IRowsManager = inject('rowsManager')!;
  const rows = rowsManager.getRows();

  for (const col of props.columns) {
    // Skip if not visible? handled by template iteration
    if (!col.prop) continue;

    // Get values
    const getter = getterForProp(col.prop);
    const cells = rows.map(row => getter(row, col.prop as TableColumnProp));

    let val: any = null;
    if (col.summaryFunc) {
      val = col.summaryFunc(cells);
    } else {
      // Default sum
      val = defaultSumFunc(cells);
    }

    if (typeof col.prop === 'string') {
      summary[col.prop] = val;
    }
  }
  return summary;
});

function defaultSumFunc(cells: any[]): any {
  const numbers = cells.filter(cell => typeof cell === 'number');
  if (!numbers.length) {
    return null;
  }
  return numbers.reduce((res, cell) => res + cell, 0);
}

const styles = computed(() => ({
  height: `${props.rowHeight}px`,
  width: props.innerWidth ? `${props.innerWidth}px` : '100%',
}));
</script>

<template>
  <div class="datatable-summary-row" :style="styles">
    <div
      v-for="(col, index) in columns"
      :key="index"
      class="datatable-summary-cell"
      :class="{ frozen: col.frozenLeft || col.frozenRight }"
      :style="{
        width: col.width ? `${col.width}px` : '150px',
        minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
        maxWidth: col.maxWidth ? `${col.maxWidth}px` : undefined,
        ...(columnStyles?.[col.$$id || col.prop || ''] || {}),
      }"
    >
      <!-- Slot support would go here, for now simple text -->
      <span v-if="typeof col.prop === 'string' && summaryData[col.prop] !== null">
        {{ summaryData[col.prop] }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.datatable-summary-row {
  display: flex;
  background: #eee;
  font-weight: bold;
  overflow: hidden; /* Prevent spill */
  z-index: 99; /* Stay on top if sticky */
}

.datatable-summary-cell {
  padding: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  line-height: inherit;
}
</style>

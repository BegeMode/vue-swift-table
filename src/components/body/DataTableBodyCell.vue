<script setup lang="ts">
import { computed } from 'vue';
import type { InternalTableColumn } from '../../types/table-column.type';
import CellSlotRenderer from './CellSlotRenderer';

interface Props {
  row: Record<string, unknown>;
  column: InternalTableColumn;
  expanded?: boolean;
}

const props = defineProps<Props>();

const value = computed(() => {
  if (!props.column.prop) return '';
  const prop = props.column.prop;
  if (typeof prop === 'string') {
    return props.row[prop];
  }
  return '';
});

const style = computed(() => ({
  width: props.column.width ? `${props.column.width}px` : '150px',
  minWidth: props.column.minWidth ? `${props.column.minWidth}px` : undefined,
  maxWidth: props.column.maxWidth ? `${props.column.maxWidth}px` : undefined,
}));
</script>

<template>
  <div class="datatable-body-cell" :class="column.cellClass" :style="style">
    <div class="datatable-body-cell-label">
      <CellSlotRenderer :column="column" :row="row" :value="value" :expanded="expanded" />
    </div>
  </div>
</template>

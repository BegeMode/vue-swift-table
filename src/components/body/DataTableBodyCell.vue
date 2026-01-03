<script setup lang="ts">
import { computed } from 'vue';
import type { TableColumn } from '../../types/table-column.type';
// import { deepValueGetter } from '../../utils/column-prop-getters'; // simplify for now

interface Props {
  row: Record<string, unknown>;
  column: TableColumn;
}

const props = defineProps<Props>();

const value = computed(() => {
  if (!props.column.prop) return '';
  const prop = props.column.prop;
  if (typeof prop === 'string') {
    // Simple access for now, support deep generic later
    return props.row[prop];
  }
  return '';
});

const style = computed(() => ({
  width: props.column.width ? `${props.column.width}px` : '150px', // Default width
  minWidth: props.column.minWidth ? `${props.column.minWidth}px` : undefined,
  maxWidth: props.column.maxWidth ? `${props.column.maxWidth}px` : undefined,
}));

</script>

<template>
  <div class="datatable-body-cell" :class="column.cellClass" :style="style">
    <div class="datatable-body-cell-label">
      <!-- TODO: Support cellTemplate or Slots -->
      {{ value }}
    </div>
  </div>
</template>

<style scoped>
.datatable-body-cell {
  position: relative;
  display: inline-block;
  vertical-align: top;
  height: 100%;
  line-height: inherit; /* Inherit from row */
  padding: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

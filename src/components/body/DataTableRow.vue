<script setup lang="ts">
import { computed } from 'vue';
import type { TableColumn } from '../../types/table-column.type';
import DataTableBodyCell from './DataTableBodyCell.vue'; // will create next

interface Props {
  row: Record<string, unknown>;
  rowIndex: number;
  columns: Array<TableColumn>;
  rowHeight: number;
}

const props = defineProps<Props>();

const style = computed(() => ({
  height: `${props.rowHeight}px`,
  width: '100%', // or specific width if total column width is known
  position: 'absolute' as const,
  transform: `translateY(${props.rowIndex * props.rowHeight}px)`
}));
</script>

<template>
  <div class="datatable-body-row" :style="style">
    <div class="datatable-row-center datatable-row-group">
      <DataTableBodyCell
        v-for="(col, index) in columns"
        :key="col.$$id || col.prop || index"
        :column="col"
        :row="row"
      />
    </div>
  </div>
</template>

<style scoped>
.datatable-body-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  box-sizing: border-box;
}
.datatable-row-center {
  display: flex;
  flex-direction: row;
  flex: 1;
}
</style>

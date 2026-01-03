<script setup lang="ts">
import { computed } from 'vue';
import type { TableColumn } from '../../types/table-column.type';
import DataTableBodyCell from './DataTableBodyCell.vue'; // will create next

interface Props {
  row: Record<string, unknown>;
  rowIndex: number;
  columns: Array<TableColumn>;
  columnStyles?: Record<string, any>; // CSSProperties

  rowHeight: number;
  isSelected?: boolean;
  selectionType?: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['activate', 'select']);

const onRowClick = (event: MouseEvent) => {
  emit('activate', { type: 'click', event });
  emit('select', event);
};

const style = computed(() => ({
  height: `${props.rowHeight}px`,
  width: '100%', // or specific width if total column width is known
  position: 'absolute' as const,
  transform: `translateY(${props.rowIndex * props.rowHeight}px)`
}));
</script>

<template>
  <div 
    class="datatable-body-row" 
    :class="{ 'active': isSelected }"
    :style="style"
    @click="onRowClick"
  >
    <div class="datatable-row-center datatable-row-group">
      <div 
        v-if="selectionType === 'checkbox'"
        class="datatable-body-cell datatable-checkbox-cell"
        :style="{ width: '30px', minWidth: '30px', maxWidth: '30px' }"
      >
        <div class="datatable-body-cell-label">
            <label>
              <input 
                type="checkbox" 
                :checked="isSelected" 
                @click.stop="onRowClick($event)"
              />
            </label>
        </div>
      </div>
      <DataTableBodyCell
        v-for="(col, index) in columns"
        :key="col.$$id || col.prop || index"
        :class="{ 'frozen': col.frozenLeft || col.frozenRight }"
        :column="col"
        :row="row"
        :style="columnStyles?.[col.$$id || col.prop || ''] || {}"
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

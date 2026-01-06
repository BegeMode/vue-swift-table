<script setup lang="ts">
import type { TableColumn } from '../../types/table-column.type';
import DataTableBodyCell from './DataTableBodyCell.vue'; // will create next

interface Props {
  row: Record<string, unknown>;
  rowIndex: number;
  columns: Array<TableColumn>;
  columnStyles?: Record<string, any>; // CSSProperties

  rowDetailHeight?: number;
  expanded?: boolean;
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
</script>

<template>
  <div class="datatable-body-row-wrapper" :class="{ active: isSelected }" @click="onRowClick">
    <div class="datatable-body-row" :style="{ height: `${rowHeight}px` }">
      <div class="datatable-row-center datatable-row-group">
        <div
          v-if="selectionType === 'checkbox'"
          class="datatable-body-cell datatable-checkbox-cell"
          :style="{ width: '30px', minWidth: '30px', maxWidth: '30px' }"
        >
          <div class="datatable-body-cell-label">
            <label>
              <input type="checkbox" :checked="isSelected" @click.stop="onRowClick($event)" />
            </label>
          </div>
        </div>
        <DataTableBodyCell
          v-for="(col, index) in columns"
          :key="col.$$id || col.prop || index"
          :class="{ frozen: col.frozenLeft || col.frozenRight }"
          :column="col"
          :row="row"
          :expanded="expanded"
          :style="columnStyles?.[col.$$id || col.prop || ''] || {}"
        />
      </div>
    </div>
    <div
      v-if="expanded && rowDetailHeight"
      class="datatable-row-detail"
      :style="{ height: `${rowDetailHeight}px`, width: '100%' }"
    >
      <slot name="detail"></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.datatable-body-row-wrapper {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
}
.datatable-body-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
}
.datatable-row-center {
  display: flex;
  flex-direction: row;
  flex: 1;
}
.datatable-row-detail {
  overflow-y: hidden;
  box-sizing: border-box;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import type { TableColumn } from '../../types/table-column.type';
import type { SortType } from '../../types/sort.type';

interface Props {
  columns: Array<TableColumn>;
  headerHeight: number;
  sortType?: SortType | string;
  sorts?: Array<any>;
}

const props = defineProps<Props>();
const emit = defineEmits(['sort']);

const style = computed(() => ({
  height: `${props.headerHeight}px`,
  width: '100%'
}));

const onColumnClick = (column: TableColumn) => {
  if (column.sortable) {
    emit('sort', { column });
  }
};
</script>

<template>
  <div class="datatable-header" :style="style">
    <div class="datatable-header-inner">
      <div 
        v-for="col in columns" 
        :key="col.$$id || col.prop"
        class="datatable-header-cell"
        :class="col.headerClass"
        :style="{ width: col.width ? col.width + 'px' : '150px' }"
        @click="onColumnClick(col)"
      >
        <span class="datatable-header-cell-label draggable">
            {{ col.name || col.prop }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.datatable-header-inner {
  display: flex;
  align-items: center;
  height: 100%;
}
.datatable-header-cell {
  display: inline-block;
  overflow: hidden;
  padding: 0.5rem;
  vertical-align: top;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>

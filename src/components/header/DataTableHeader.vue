<script setup lang="ts">
import { computed } from 'vue';
import type { TableColumn } from '../../types/table-column.type';
import type { SortType } from '../../types/sort.type';

interface Props {
  columns: Array<TableColumn>;
  headerHeight: number;
  sortType?: SortType | string;
  sorts?: Array<any>;
  selectionType?: string;
  allRowsSelected?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['sort', 'select-all']);

const style = computed(() => ({
  height: `${props.headerHeight}px`,
  width: '100%'
}));

const onColumnClick = (column: TableColumn) => {
  if (column.sortable) {
    emit('sort', { column });
  }
};

// ------------------------------------------------------------------
// Resize Logic
// ------------------------------------------------------------------
let resizingColumn: TableColumn | null = null;
let startX = 0;
let startWidth = 0;

const onResizeStart = (column: TableColumn, event: MouseEvent) => {
  if (!column.resizeable) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  resizingColumn = column;
  startX = event.pageX;
  startWidth = column.width || 150;
  
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none'; // Prevent text selection
};

const onResizeMove = (event: MouseEvent) => {
  if (!resizingColumn) return;
  
  const diff = event.pageX - startX;
  const newWidth = Math.max(30, startWidth + diff); // Min width 30
  
  if (resizingColumn.maxWidth && newWidth > resizingColumn.maxWidth) {
      resizingColumn.width = resizingColumn.maxWidth;
  } else if (resizingColumn.minWidth && newWidth < resizingColumn.minWidth) {
      resizingColumn.width = resizingColumn.minWidth;
  } else {
      resizingColumn.width = newWidth;
  }
};

const onResizeEnd = (event: MouseEvent) => {
  if (!resizingColumn) return;
  
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  
  resizingColumn = null;
};
</script>

<template>
  <div class="datatable-header" :style="style">
    <div class="datatable-header-inner">
      <div 
        v-if="selectionType === 'checkbox'" 
        class="datatable-header-cell datatable-checkbox-cell"
        :style="{ width: '30px' }"
      >
        <label>
          <input 
            type="checkbox" 
            :checked="allRowsSelected" 
            @change="emit('select-all')" 
          />
        </label>
      </div>
      <div 
        v-for="col in columns" 
        :key="col.$$id || col.prop"
        class="datatable-header-cell"
        :class="[col.headerClass, { resizeable: col.resizeable !== false }]"
        :style="{ width: col.width ? col.width + 'px' : '150px' }"
        @click="onColumnClick(col)"
      >
        <span class="datatable-header-cell-label draggable">
            {{ col.name || col.prop }}
        </span>
        <span 
            v-if="col.resizeable !== false"
            class="resize-handle" 
            @mousedown="onResizeStart(col, $event)"
            @click.stop
        ></span>
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
  position: relative; /* For handle positioning */
}

/* Resize Handle */
.resize-handle {
  display: inline-block;
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: ew-resize;
  z-index: 100;
}

.resize-handle:hover {
  background-color: rgba(0, 0, 0, 0.1);
}
</style>

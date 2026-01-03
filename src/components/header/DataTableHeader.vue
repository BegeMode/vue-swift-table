<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TableColumn } from '../../types/table-column.type';
import type { SortType } from '../../types/sort.type';

interface Props {
  columns: Array<TableColumn>;
  columnStyles?: Record<string, any>; // CSSProperties
  innerWidth?: number;
  headerHeight: number;
  sortType?: SortType | string;
  sorts?: Array<any>;
  selectionType?: string;
  allRowsSelected?: boolean;
  reorderable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  reorderable: true
});

const emit = defineEmits(['sort', 'select-all', 'column-reorder']);

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

const onResizeEnd = () => {
  if (!resizingColumn) return;
  
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  
  resizingColumn = null;
};

// ------------------------------------------------------------------
// Drag and Drop (Reordering) Logic
// ------------------------------------------------------------------
const dragTarget = ref<string | null>(null);

const onDragStart = (event: DragEvent, column: TableColumn) => {
  if (!props.reorderable) return;
  
  // Set data to identify the dragged column
  if(event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', JSON.stringify(column));
      // Optional: Set drag image if needed
  }
};

const onDragOver = (event: DragEvent, targetColumn: TableColumn) => {
    if (!props.reorderable) return;
    
    // Allow drop
    event.preventDefault();
    
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
    
    // Determine drop position (left or right of target) logic could go here
    // For now simple target highlighting
    const targetId = targetColumn.$$id || targetColumn.prop;
    if (targetId)
        dragTarget.value = String(targetId);
};

const onDragLeave = (_event: DragEvent) => {
    // We might need better logic to only clear if actually leaving the cell
    // dragTarget.value = null; 
};

const onDrop = (event: DragEvent, targetColumn: TableColumn) => {
    if (!props.reorderable) return;
    event.preventDefault();
    dragTarget.value = null;
    
    if(event.dataTransfer) {
        const sourceJson = event.dataTransfer.getData('text/plain');
        if (sourceJson) {
            try {
                const sourceColumn = JSON.parse(sourceJson) as TableColumn;
                
                // Identify source and target by prop or id
                const sourceId = sourceColumn.$$id || sourceColumn.prop;
                const targetId = targetColumn.$$id || targetColumn.prop;
                
                if (sourceId !== targetId) {
                    emit('column-reorder', {
                       source: sourceColumn,
                       target: targetColumn
                    });
                }
            } catch (e) {
                console.error('Failed to parse dropped column data', e);
            }
        }
    }
};

</script>

<template>
  <div class="datatable-header" :style="style">
    <div class="datatable-header-inner" :style="{ width: innerWidth ? innerWidth + 'px' : '100%' }">
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
        :class="[
            col.headerClass, 
            { 
                resizeable: col.resizeable !== false,
                'drag-target': dragTarget === (col.$$id || col.prop),
                'frozen': col.frozenLeft || col.frozenRight 
            }
        ]"
        :style="{ width: col.width ? col.width + 'px' : '150px', ...(columnStyles?.[col.$$id || col.prop || ''] || {}) }"
        :draggable="reorderable"
        @click="onColumnClick(col)"
        @dragstart="onDragStart($event, col)"
        @dragover="onDragOver($event, col)"
        @dragleave="onDragLeave($event)"
        @drop="onDrop($event, col)"
      >
        <span class="datatable-header-cell-label draggable">
            {{ col.name || col.prop }}
        </span>
        <span 
            v-if="col.resizeable !== false"
            class="resize-handle" 
            @mousedown="onResizeStart(col, $event)"
            @click.stop
            @dragstart.stop.prevent
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

.datatable-header-cell.drag-target {
    border-left: 2px solid var(--primary-color, #106cc8);
    /* Or some other visual indicator */
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

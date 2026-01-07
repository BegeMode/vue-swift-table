<script setup lang="ts">
import { computed, provide, toRefs, ref, watch, useSlots } from 'vue';
import DataTableBody from '@/components/body/DataTableBody.vue';
import DataTableHeader from '@/components/header/DataTableHeader.vue';
import DataTableFooter from '@/components/footer/DataTableFooter.vue';
import { useRowGrouping } from '@/composables/useRowGrouping';
import { columnsByPin, columnsTotalWidth } from '@/utils/column';
import type { CSSProperties } from 'vue';

import type { TableColumn } from '@/types/table-column.type';
import type { SortType } from '@/types/sort.type';
import type { SelectionType } from '@/types/selection.type';
import type { ISortPropDir } from '@/types/sort-prop-dir.type';
import type { IGroupedRows } from '@/types/grouped-rows';
import { SortDirection } from '@/types/sort-direction.type';
import type { RowType } from '@/types/table';

// Props Definition based on Spec
interface Props {
  /** Array of rows to display in the table */
  rows: Array<Record<string, unknown>>;
  /**
   * Array of column definitions.
   * **Important:** For column resizing to work correctly, this must be passed
   * as a reactive `ref()`. The component directly mutates column.width during resize.
   * @example
   * const columns = ref<TableColumn[]>([...]);
   * <DataTable :columns="columns" ... />
   */
  columns: Array<TableColumn>;
  rowHeight?: number | string; // Fixed height, mandatory or default
  rowDetailHeight?: number; // Height of the detail row
  headerHeight?: number;
  footerHeight?: number;
  height?: string | number;
  loading?: boolean;

  // Layout & Styling
  columnMode?: 'standard' | 'flex' | 'force';
  reorderable?: boolean;
  rowClass?: (row: Record<string, unknown>, index: number) => string | Record<string, boolean>;
  cssClasses?: Record<string, unknown>;
  messages?: Record<string, string>;

  // Paging & Scrolling
  pageSize?: number;
  count?: number;
  offset?: number; // page index
  externalPaging?: boolean;
  externalSorting?: boolean;

  // Grouping & Tree
  groupRowsBy?: Array<string>;
  groupExpansionDefault?: boolean;
  treeFromRelation?: string;
  treeToRelation?: string;
  lazyTree?: boolean;

  // Selection
  selectionType?: SelectionType;
  /** Array of selected rows */
  selected?: Array<RowType>;
  /** Function to determine row identity for selection comparison */
  rowIdentity?: (row: RowType) => unknown;
  selectAllRowsOnPage?: boolean;

  // Summary
  summaryRow?: boolean;
  summaryPosition?: 'top' | 'bottom';
  summaryHeight?: number;
  // Sorting
  sortType?: SortType;
  /** Array of active sorts */
  sorts?: Array<ISortPropDir>;
  // Theme
  theme?: string;
}

const props = withDefaults(defineProps<Props>(), {
  rowHeight: 50,
  headerHeight: 50,
  footerHeight: 0,
  columnMode: 'standard',
  reorderable: false,
  externalPaging: false,
  externalSorting: false,
  groupExpansionDefault: false,
  lazyTree: false,
  selectAllRowsOnPage: false,
  summaryRow: false,
  summaryPosition: 'top',
  summaryHeight: 30,
  theme: 'material',
  rows: () => [],
  columns: () => [],
  selected: () => [],
  sorts: () => [],
  cssClasses: () => ({
    sortAscending: 'datatable-icon-up',
    sortDescending: 'datatable-icon-down',
    pagerLeftArrow: 'datatable-icon-left',
    pagerRightArrow: 'datatable-icon-right',
    pagerPrevious: 'datatable-icon-prev',
    pagerNext: 'datatable-icon-skip',
  }),
  messages: () => ({
    emptyMessage: 'No data to display',
    totalMessage: 'total',
    selectedMessage: 'selected',
  }),
});

const emit = defineEmits([
  'update:sort',
  'sort',
  'scroll-end',
  'page',
  'select',
  'activate',
  'tree-action',
  'group-toggle',
  'update:selected',
  'scroll',
  'update:selected',
  'scroll',
  'reorder',
  'detail-toggle',
]);

// ------------------------------------------------------------------
// Row Detail Logic
// ------------------------------------------------------------------
const expandedRows = ref<RowType[]>([]);

const toggleExpandDetail = (row: RowType) => {
  const index = expandedRows.value.indexOf(row);
  if (index === -1) {
    expandedRows.value.push(row);
  } else {
    expandedRows.value.splice(index, 1);
  }
  emit('detail-toggle', {
    rows: expandedRows.value,
    value: row,
  });
};

defineExpose({
  toggleExpandDetail,
});

// ------------------------------------------------------------------
// Sorting Logic
// ------------------------------------------------------------------
const internalSorts = ref<ISortPropDir[]>(props.sorts || []);

watch(
  () => props.sorts,
  val => {
    internalSorts.value = val || [];
  }
);

const sortedRows = computed(() => {
  if (props.externalSorting || !internalSorts.value.length) {
    return props.rows;
  }

  const rows = [...props.rows];
  return rows.sort((a, b) => {
    for (const sort of internalSorts.value) {
      const { prop, dir } = sort;
      if (!prop) continue;

      const valA = a[prop] as string | number;
      const valB = b[prop] as string | number;

      if (valA === valB) continue;

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      const comparison = valA > valB ? 1 : -1;
      return dir === 'asc' ? comparison : -comparison;
    }
    return 0;
  });
});

const onSort = (payload: { column: TableColumn; event?: MouseEvent }) => {
  const { column, event } = payload;
  const prop = column.prop || column.$$id;

  // If sortable is explicitly false, do nothing (should be handled by header usually)
  if (!prop) return;

  let newSorts = [...internalSorts.value];
  const existingIdx = newSorts.findIndex(s => s.prop === prop);
  const sortType = props.sortType || 'single';
  const isMulti = sortType === 'multi';
  const isShift = event?.shiftKey; // Check shift key

  if (isMulti && isShift) {
    // Multi-Sort (Additive) logic
    if (existingIdx > -1) {
      const sortItem = newSorts[existingIdx];
      if (sortItem) {
        if (sortItem.dir === SortDirection.asc) {
          sortItem.dir = SortDirection.desc;
        } else {
          // Remove from list
          newSorts.splice(existingIdx, 1);
        }
      }
    } else {
      // Add to end
      newSorts.push({ prop, dir: SortDirection.asc });
    }
  } else {
    // Single Sort logic (Replace)
    if (existingIdx > -1) {
      const sortItem = newSorts[existingIdx];
      if (sortItem) {
        if (sortItem.dir === SortDirection.asc) {
          newSorts = [{ prop, dir: SortDirection.desc }];
        } else {
          newSorts = [];
        }
      }
    } else {
      // New column
      newSorts = [{ prop, dir: SortDirection.asc }];
    }
  }

  internalSorts.value = newSorts;
  emit('sort', newSorts);
  emit('update:sort', newSorts);
};

// ------------------------------------------------------------------
// Pagination Logic
// ------------------------------------------------------------------
const internalOffset = ref(props.offset || 0);

watch(
  () => props.offset,
  val => {
    if (val !== undefined) internalOffset.value = val;
  }
);

const pageSize = computed(() => {
  // If undefined, we show all rows (no paging)
  return props.pageSize || 0;
});

const rowCount = computed(() => {
  if (props.externalPaging) return props.count || 0;
  return props.rows.length;
});

const pagedRows = computed(() => {
  if (props.externalPaging) return props.rows;

  // Grouping Paging
  if (props.groupRowsBy && props.groupRowsBy.length) {
    if (!groupTree.value) return [];

    // If no page size, return full flat list
    if (!pageSize.value) return groupedRows.value;

    // Slice Groups (Top Level)
    const start = internalOffset.value * pageSize.value;
    const end = start + pageSize.value;
    const pagedGroups = groupTree.value.slice(start, end);
    return flattenGroups(pagedGroups);
  }

  // Row Paging
  if (!pageSize.value) return sortedRows.value;

  const start = internalOffset.value * pageSize.value;
  const end = start + pageSize.value;
  return sortedRows.value.slice(start, end);
});

const onPage = (event: { offset: number; limit: number; count: number }) => {
  if (!props.externalPaging) {
    internalOffset.value = event.offset;
  }
  emit('page', event);
};

// ------------------------------------------------------------------
// Grouping Logic
// ------------------------------------------------------------------
const {
  groupedRows,
  groupTree,
  flattenGroups,
  onGroupToggle: onGroupToggleLogic,
} = useRowGrouping(
  sortedRows, // Use sorted rows
  toRefs(props).groupRowsBy,
  toRefs(props).groupExpansionDefault
);

const onGroupToggle = (event: IGroupedRows) => {
  // Event comes from Body/Header: { type: 'group', value: group }
  // Or just group object?
  // Vue 2 body-group-header emitted { type: 'group', value: this.group }
  // Our DataTableGroupHeader emits user object.
  // Let's assume the event payload IS the group object or { value: group }
  // I'll check DataTableGroupHeader.vue: emit('toggle', props.group)
  // So event is the group.
  onGroupToggleLogic(event);
  emit('group-toggle', event);
};

// ------------------------------------------------------------------
// Selection Logic
// ------------------------------------------------------------------
const selectedState = ref<RowType[]>(props.selected || []);

// Watch props selected to keep in sync if controlled externally
watch(
  () => props.selected,
  val => {
    selectedState.value = val || [];
  }
);

const onRowSelect = ({ row, type: _type, event }: { row: RowType; type?: string; event?: MouseEvent }) => {
  if (!props.selectionType) return;

  const select = (r: RowType) => {
    selectedState.value = [r];
    emit('select', { selected: selectedState.value });
    emit('update:selected', selectedState.value);
  };

  const toggle = (r: RowType) => {
    // Find index of row in selected
    const idx = selectedState.value.indexOf(r);
    // Note: If using rowIdentity, we should use that to find the index.
    // For now, assuming object reference equality or simple identity.

    if (idx > -1) {
      selectedState.value.splice(idx, 1);
    } else {
      selectedState.value.push(r);
    }
    emit('select', { selected: selectedState.value });
    emit('update:selected', selectedState.value);
  };

  if (props.selectionType === 'single') {
    select(row);
  } else if (props.selectionType === 'multi') {
    if (event?.ctrlKey || event?.metaKey) {
      toggle(row);
    } else {
      select(row);
    }
  } else if (props.selectionType === 'multiClick') {
    toggle(row);
  } else if (props.selectionType === 'checkbox') {
    toggle(row);
  }

  emit('activate', { type: 'click', row, event });
};

const onSelectAll = () => {
  // Basic implementation: Toggle all visible or all rows
  // For now, let's select all rows if not all selected, otherwise clear.
  const allSelected = selectedState.value.length === (props.count || props.rows.length);
  if (allSelected) {
    selectedState.value = [];
  } else {
    selectedState.value = [...props.rows];
  }
  emit('select', { selected: selectedState.value });
  emit('update:selected', selectedState.value);
};

// Computed classes for the root element
const componentClasses = computed(() => ({
  'ngx-datatable': true,
  [props.theme]: true, // Dynamic theme
  'fixed-header': true,
  'fixed-row': true,
  'scroll-vertical': true, // Virtualization implies vertical scrolling
  virtualized: true,
  selectable: !!props.selectionType,
  'checkbox-selection': props.selectionType === 'checkbox',
  'cell-selection': props.selectionType === 'cell',
  'single-selection': props.selectionType === 'single',
  'multi-selection': props.selectionType === 'multi',
  'multi-click-selection': props.selectionType === 'multiClick',
}));

// Provide context if needed
provide('dataTable', {
  props: toRefs(props),
  emit,
});

provide('dataTableSlots', useSlots());

provide('selection', {
  selected: selectedState,
  selectionType: toRefs(props).selectionType,
  onRowSelect,
});

const onColumnReorder = ({ source, target }: { source: TableColumn; target: TableColumn }) => {
  // Find indices
  const columns = [...props.columns];
  const sourceIdx = columns.findIndex(c => (c.$$id || c.prop) === (source.$$id || source.prop));
  const targetIdx = columns.findIndex(c => (c.$$id || c.prop) === (target.$$id || target.prop));

  if (sourceIdx > -1 && targetIdx > -1) {
    // Move source to target index
    const [movedColumn] = columns.splice(sourceIdx, 1);
    if (movedColumn) {
      columns.splice(targetIdx, 0, movedColumn);
      emit('reorder', columns);
    }
  }
};

// ------------------------------------------------------------------
// Column Pinning / Sticky Logic
// ------------------------------------------------------------------
const innerWidth = computed(() => {
  if (!props.columns) return 0;
  return columnsTotalWidth(props.columns);
});

const sortedColumns = computed(() => {
  if (!props.columns) return [];
  const { left, center, right } = columnsByPin(props.columns);
  return [...left, ...center, ...right];
});

const columnStyles = computed(() => {
  const styles: Record<string, CSSProperties> = {};
  if (!props.columns) return styles;

  const { left, right } = columnsByPin(props.columns);

  let leftOffset = 0;
  for (const col of left) {
    const id = col.$$id || col.prop || '';
    if (id) {
      styles[String(id)] = {
        position: 'sticky',
        left: `${leftOffset}px`,
        zIndex: 2,
      };
    }
    const width = col.width || 150;
    leftOffset += width;
  }

  let rightOffset = 0;
  // Right columns are sorted Left-to-Right in the 'right' array.
  // To stack them correctly on the right, we reverse iteration.
  // The last column in 'right' array is the right-most, so right: 0.
  // The second to last has right: width of last.
  for (let i = right.length - 1; i >= 0; i--) {
    const col = right[i];
    if (!col) continue;
    const id = col.$$id || col.prop || '';
    if (id) {
      styles[String(id)] = {
        position: 'sticky',
        right: `${rightOffset}px`,
        zIndex: 2,
      };
    }
    const width = col.width || 150;
    rightOffset += width;
  }

  return styles;
});

const offsetX = ref(0);
const scrollbarWidth = ref(0);

const onScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  offsetX.value = target.scrollLeft;
  emit('scroll', e);
};
</script>

<template>
  <div :class="componentClasses">
    <div class="visible">
      <DataTableHeader
        :columns="sortedColumns"
        :columnStyles="columnStyles"
        :innerWidth="innerWidth"
        :headerHeight="headerHeight"
        :offsetX="offsetX"
        :scrollbarWidth="scrollbarWidth"
        :reorderable="reorderable"
        :sorts="internalSorts"
        :sortType="sortType"
        :selectionType="selectionType"
        :allRowsSelected="selectedState.length === (props.count || props.rows.length) && props.rows.length > 0"
        @sort="onSort"
        @select-all="onSelectAll"
        @column-reorder="onColumnReorder"
      />

      <!-- Body Component -->
      <DataTableBody
        :rows="pagedRows"
        :columns="sortedColumns"
        :columnStyles="columnStyles"
        :innerWidth="innerWidth"
        :rowHeight="Number(rowHeight)"
        :bodyHeight="height"
        :selected="selectedState"
        :selectionType="selectionType"
        :summaryRow="summaryRow"
        :summaryPosition="summaryPosition"
        :expanded="expandedRows"
        :rowDetailHeight="rowDetailHeight"
        @scroll="onScroll"
        @row-select="onRowSelect"
        @group-toggle="onGroupToggle"
        @scrollbar-width="scrollbarWidth = $event"
      >
        <template #rowDetail="scope">
          <slot name="rowDetail" v-bind="scope"></slot>
        </template>
      </DataTableBody>

      <!-- Footer Component will go here -->
      <DataTableFooter
        v-if="footerHeight"
        :footerHeight="footerHeight"
        :rowCount="rowCount"
        :pageSize="pageSize"
        :offset="internalOffset"
        :pagerLeftArrowIcon="cssClasses.pagerLeftArrow as string"
        :pagerRightArrowIcon="cssClasses.pagerRightArrow as string"
        :pagerPreviousIcon="cssClasses.pagerPrevious as string"
        :pagerNextIcon="cssClasses.pagerNext as string"
        :totalMessage="messages.totalMessage"
        :selectedMessage="selected?.length > 0 ? messages.selectedMessage : false"
        :selectedCount="selected?.length"
        @page="onPage"
      />
    </div>
  </div>
</template>

<style lang="scss">
// Styles are imported in global index.scss, but we can add overrides here if needed
</style>

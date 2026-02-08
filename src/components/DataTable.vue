<script setup lang="ts">
import { computed, provide, toRefs, ref, watch, useSlots } from 'vue';

defineOptions({
  name: 'vue-swift-table',
});

import DataTableBody from '@/components/body/DataTableBody.vue';
import DataTableHeader from '@/components/header/DataTableHeader.vue';
import DataTableFooter from '@/components/footer/DataTableFooter.vue';
import { columnsByPin, columnsTotalWidth } from '@/utils/column';
import type { CSSProperties } from 'vue';

import type { TableColumn } from '@/types/table-column.type';
import type { ISortPropDir } from '@/types/sort-prop-dir.type';
import type { IGroupedRows } from '@/types/grouped-rows';
import { DEFAULT_VISIBLE_ROWS, type RowType } from '@/types/table';
import { PageManager } from '@/managers/pageManager';
import { RowsManager } from '@/managers/rowsManager';
import type { DataTableProps } from '@/types/props';

const props = withDefaults(defineProps<DataTableProps>(), {
  rowHeight: 50,
  headerHeight: 50,
  footerHeight: 50,
  columnMode: 'standard',
  reorderable: false,
  externalSorting: false,
  groupExpansionDefault: false,
  lazyTree: false,
  selectAllRowsOnPage: false,
  summaryRow: false,
  summaryPosition: 'top',
  summaryHeight: 30,
  theme: 'material',
  page: 1,
  infiniteScroll: false,
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
  'update:sorts',
  'sort',
  'page',
  'select',
  'activate',
  'tree-action',
  'group-toggle',
  'update:selected',
  'scroll',
  'reorder',
  'detail-toggle',
]);

const pageManager = new PageManager();
const rowsManager = new RowsManager(pageManager);

// Reactive version counter - incremented when rows data changes
const rowsVersion = ref(0);

provide('pageManager', pageManager);
provide('rowsManager', rowsManager);
provide('rowsVersion', rowsVersion);

// ------------------------------------------------------------------
// Row Detail Logic
// ------------------------------------------------------------------
const expandedRows = ref<Set<RowType>>(new Set());

const toggleExpandDetail = (row: RowType) => {
  if (expandedRows.value.has(row)) {
    expandedRows.value.delete(row);
  } else {
    expandedRows.value.add(row);
  }
  emit('detail-toggle', {
    rows: expandedRows.value,
    value: row,
  });
};

// ------------------------------------------------------------------
// Sorting Logic
// ------------------------------------------------------------------
const internalSorts = ref<ISortPropDir[]>(props.sorts || []);

watch(
  () => props.sorts,
  val => {
    internalSorts.value = val || [];
    if (!props.externalSorting && internalSorts.value.length > 0) {
      rowsManager.sort(internalSorts.value);
      rowsVersion.value++;
    }
  },
  { immediate: true }
);

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
        if (sortItem.dir === 'asc') {
          sortItem.dir = 'desc';
        } else {
          // Remove from list
          newSorts.splice(existingIdx, 1);
        }
      }
    } else {
      // Add to end
      newSorts.push({ prop, dir: 'asc' });
    }
  } else {
    // Single Sort logic (Replace)
    if (existingIdx > -1) {
      const sortItem = newSorts[existingIdx];
      if (sortItem) {
        if (sortItem.dir === 'asc') {
          newSorts = [{ prop, dir: 'desc' }];
        } else {
          newSorts = [];
        }
      }
    } else {
      // New column
      newSorts = [{ prop, dir: 'asc' }];
    }
  }

  internalSorts.value = newSorts;
  if (!props.externalSorting) {
    rowsManager.sort(newSorts);
  }
  emit('sort', newSorts);
  emit('update:sorts', newSorts);
};

// ------------------------------------------------------------------
// Pagination Logic
// ------------------------------------------------------------------
const internalPage = ref(0);
const internalTotalPages = ref<number | undefined>(props.totalPages);
const visibleRowsCount = ref(DEFAULT_VISIBLE_ROWS);

watch(
  () => props.totalPages,
  val => {
    internalTotalPages.value = val;
    if (val) {
      pageManager.setPageAsLast(val);
    }
  }
);

watch(
  () => props.page,
  val => {
    onPage({ page: val });
  }
);

const loading = ref<'top' | 'bottom' | 'none'>('none');

const onPage = async (event: { page: number }) => {
  const pageInfo = pageManager.getPageInfo(event.page);
  if (pageInfo) {
    internalPage.value = event.page;
    return;
  }
  loading.value = 'top';
  if (internalPage.value > 0 && props.infiniteScroll) {
    loading.value = event.page < internalPage.value ? 'top' : 'bottom';
  }
  try {
    const data = await props.getPageRows(event.page);
    if (data.allRows) {
      let totalPages = internalTotalPages.value ?? Math.ceil(data.rows.length / 30);
      let pageSize = Math.ceil(data.rows.length / totalPages);
      if (pageSize < visibleRowsCount.value) {
        pageSize = visibleRowsCount.value;
        totalPages = Math.ceil(data.rows.length / pageSize);
      }
      if (internalTotalPages.value) {
        internalTotalPages.value = totalPages;
      }
      for (let i = 1; i <= totalPages; i++) {
        const pageData = data.rows.slice((i - 1) * pageSize, i * pageSize);
        if (pageData.length === 0) {
          pageManager.setPageAsLast(i - 1);
          break;
        }
        rowsManager.addPage(pageData, i, i === totalPages);
      }
    } else {
      if (!data.rows?.length) {
        // no data, so previous page is the last
        const pageInfo = pageManager.getPageInfo(event.page - 1);
        if (pageInfo) {
          pageManager.setPageAsLast(event.page - 1);
          internalTotalPages.value = event.page - 1;
        }
        rowsVersion.value++;
        return;
      }
      rowsManager.addPage(data.rows, event.page, data.isLast);
      if (data.isLast) {
        internalTotalPages.value = event.page;
      } else {
        internalTotalPages.value = event.page + 1;
      }
    }
  } catch (e) {
    throw e;
  } finally {
    loading.value = 'none';
  }

  // Apply current sort to newly added data
  if (!props.externalSorting && internalSorts.value.length > 0) {
    rowsManager.sort(internalSorts.value);
  }

  internalPage.value = event.page;
  // Trigger reactive update for components depending on rows count
  rowsVersion.value++;
  emit('page', event);
};

// ------------------------------------------------------------------
// Grouping Logic
// ------------------------------------------------------------------
// Watch for groupRowsBy changes and update RowsManager
watch(
  () => props.groupRowsBy,
  newFields => {
    rowsManager.setGroupBy(newFields || []);
  },
  { immediate: true }
);

const onGroupToggle = (event: IGroupedRows) => {
  rowsManager.toggleGroupExpanded(event.key);
  // Trigger reactive update for components depending on rows data
  rowsVersion.value++;
  emit('group-toggle', event);
};

// ------------------------------------------------------------------
// Selection Logic
// ------------------------------------------------------------------
const selectedState = ref<Array<RowType | IGroupedRows>>(props.selected || []);

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

  const toggle = (r: RowType | IGroupedRows) => {
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
  const allSelected = selectedState.value.length === rowsManager.getRowsCount();
  if (allSelected) {
    selectedState.value = [];
  } else {
    selectedState.value = [...rowsManager.getRows()];
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

const reset = () => {
  pageManager.clear();
  rowsManager.clear();
  internalTotalPages.value = props.totalPages;
};

const refresh = (page = 1) => {
  reset();
  onPage({ page });
};

defineExpose({
  toggleExpandDetail,
  reset,
  refresh,
});
</script>

<template>
  <div :class="componentClasses">
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
      :allRowsSelected="selectedState.length === rowsManager.getRowsCount() && rowsManager.getRowsCount() > 0"
      @sort="onSort"
      @select-all="onSelectAll"
      @column-reorder="onColumnReorder"
    />

    <!-- Body Component -->
    <DataTableBody
      :loading="loading"
      :infiniteScroll="infiniteScroll"
      :page="internalPage"
      :columns="sortedColumns"
      :columnStyles="columnStyles"
      :innerWidth="innerWidth"
      :rowHeight="Number(rowHeight)"
      :bodyHeight="height"
      :selected="selectedState"
      :selectionType="selectionType"
      :sorts="internalSorts"
      :groupRowsBy="groupRowsBy"
      :summaryRow="summaryRow"
      :summaryPosition="summaryPosition"
      :expanded="expandedRows"
      :rowDetailHeight="rowDetailHeight"
      @scroll="onScroll"
      @row-select="onRowSelect"
      @group-toggle="onGroupToggle"
      @scrollbar-width="scrollbarWidth = $event"
      @page="onPage"
      @visible-rows-count="visibleRowsCount = $event"
    >
      <template #rowDetail="scope">
        <slot name="rowDetail" v-bind="scope"></slot>
      </template>
    </DataTableBody>

    <!-- Footer Component will go here -->
    <DataTableFooter
      v-if="footerHeight"
      :footerHeight="footerHeight"
      :totalPages="internalTotalPages"
      :page="internalPage || page"
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
</template>

<style lang="scss">
// Styles are imported in global index.scss, but we can add overrides here if needed
</style>

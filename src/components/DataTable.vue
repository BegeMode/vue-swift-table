<script setup lang="ts">
import { computed, provide, toRefs } from 'vue';
import DataTableBody from './body/DataTableBody.vue';
import DataTableHeader from './header/DataTableHeader.vue';
import DataTableFooter from './footer/DataTableFooter.vue';
import { ref, watch } from 'vue';

import type { TableColumn } from '../types/table-column.type';
import type { SortType } from '../types/sort.type';
import type { SelectionType } from '../types/selection.type';

// Props Definition based on Spec
interface Props {
  rows: Array<Record<string, unknown>>;
  columns: Array<TableColumn>;
  rowHeight?: number | string; // Fixed height, mandatory or default
  headerHeight?: number;
  footerHeight?: number;
  height?: string | number;
  loading?: boolean;
  
  // Layout & Styling
  columnMode?: 'standard' | 'flex' | 'force';
  reorderable?: boolean;
  rowClass?: (row: any, index: number) => string | Record<string, boolean>;
  cssClasses?: Record<string, unknown>;
  messages?: Record<string, string>;

  // Paging & Scrolling
  pageSize?: number;
  count?: number;
  offset?: number; // page index
  externalPaging?: boolean;
  externalSorting?: boolean;

  // Grouping & Tree
  groupRowsBy?: Array<string | any>;
  groupExpansionDefault?: boolean;
  treeFromRelation?: string;
  treeToRelation?: string;
  lazyTree?: boolean;

  // Selection
  selectionType?: SelectionType;
  selected?: Array<any>;
  rowIdentity?: (row: any) => any;
  selectAllRowsOnPage?: boolean;

  // Summary
  summaryRow?: boolean;
  summaryPosition?: 'top' | 'bottom';
  summaryHeight?: number;
  // Sorting
  sortType?: SortType;
  sorts?: Array<any>;
}

const props = withDefaults(defineProps<Props>(), {
  rowHeight: 50,
  headerHeight: 50,
  footerHeight: 0,
  columnMode: 'standard',
  reorderable: true,
  externalPaging: false,
  externalSorting: false,
  groupExpansionDefault: false,
  lazyTree: false,
  selectAllRowsOnPage: false,
  summaryRow: false,
  summaryPosition: 'top',
  summaryHeight: 30,
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
  })
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
  'scroll'
]);

// ------------------------------------------------------------------
// Pagination Logic
// ------------------------------------------------------------------
const internalOffset = ref(props.offset || 0);

watch(() => props.offset, (val) => {
  if (val !== undefined) internalOffset.value = val;
});

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
  // If no page size defined, show all
  if (!pageSize.value) return props.rows;
  
  const start = internalOffset.value * pageSize.value;
  const end = start + pageSize.value;
  return props.rows.slice(start, end);
});

const onPage = (event: { offset: number; limit: number; count: number }) => {
  if (!props.externalPaging) {
    internalOffset.value = event.offset;
  }
  emit('page', event);
};

// Computed classes for the root element
const componentClasses = computed(() => ({
  'ngx-datatable': true,
  'material': true, // Default theme for now, can be made dynamic
  'fixed-header': true,
  'fixed-row': true,
  'scroll-vertical': true, // Virtualization implies vertical scrolling
  'virtualized': true,
  'selectable': !!props.selectionType,
  'checkbox-selection': props.selectionType === 'checkbox',
  'cell-selection': props.selectionType === 'cell',
  'single-selection': props.selectionType === 'single',
  'multi-selection': props.selectionType === 'multi',
  'multi-click-selection': props.selectionType === 'multiClick'
}));

// Provide context if needed
provide('dataTable', {
  props: toRefs(props),
  emit
});

const onScroll = (e: Event) => {
  emit('scroll', e);
};

</script>

<template>
  <div :class="componentClasses">
    <div class="visible">
      <DataTableHeader
        :columns="columns"
        :headerHeight="headerHeight"
        :sortType="sortType"
        :sorts="sorts"
        @sort="emit('sort', $event)"
      />

      <!-- Body Component -->
      <DataTableBody
        :rows="pagedRows"
        :columns="columns"
        :rowHeight="Number(rowHeight)" 
        :bodyHeight="height"
        @scroll="onScroll"
      />

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

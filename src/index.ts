// Main entry point for vue-swift-table library
import VueSwiftTable from './components/DataTable.vue';

// Named export for component
export { VueSwiftTable };

// Also export with DataTable name for backwards compatibility
export { default as DataTable } from './components/DataTable.vue';

// Default export
export default VueSwiftTable;

// Re-export types for consumers
export type { TableColumn } from './types/table-column.type';
export type { SortType } from './types/sort.type';
export type { SelectionType } from './types/selection.type';
export type { ISortPropDir } from './types/sort-prop-dir.type';
export type { IGroupedRows } from './types/grouped-rows';
export { SortDirection } from './types/sort-direction.type';
export type { RowType } from './types/table';

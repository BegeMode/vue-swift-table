import type { RowType } from './table';
import type { TableColumn } from './table-column.type';
import type { SelectionType } from './selection.type';
import type { ISortPropDir } from './sort-prop-dir.type';
import type { SortType } from './sort.type';

export interface DataTableProps {
  getPageRows: (page: number) => Promise<{ rows: Array<RowType>; isLast?: boolean; allRows?: boolean }>;
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

  // Layout & Styling
  columnMode?: 'standard' | 'flex' | 'force';
  reorderable?: boolean;
  rowClass?: (row: Record<string, unknown>, index: number) => string | Record<string, boolean>;
  cssClasses?: Record<string, unknown>;
  messages?: Record<string, string>;

  // Paging & Scrolling
  infiniteScroll?: boolean;
  totalPages?: number;
  page?: number; // page index
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

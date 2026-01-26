import type { TableColumn, TableColumnProp } from '@/types/table-column.type';

export type SortDirection = 'asc' | 'desc';

export interface ISortPropDir {
  dir: SortDirection;
  prop: TableColumnProp;
}

export interface ISortEvent {
  sorts: ISortPropDir[];
  column?: TableColumn;
  prevValue?: SortDirection;
  newValue?: SortDirection;
}

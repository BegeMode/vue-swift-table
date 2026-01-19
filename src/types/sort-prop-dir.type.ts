import { SortDirection } from '@/types/sort-direction.type';
import type { TableColumn, TableColumnProp } from '@/types/table-column.type';

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

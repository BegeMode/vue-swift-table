import type { TableColumnProp } from '@/types/table-column.type';

export type SortDirection = 'asc' | 'desc';

export interface ISortPropDir {
  dir: SortDirection;
  prop: TableColumnProp;
}

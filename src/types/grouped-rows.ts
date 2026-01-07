import type { RowType } from './table';

export interface IGroupedRows {
  key: string;
  value: RowType[]; // The rows in this group
  keys?: { title: string; prop: string; value: unknown }[]; // For nested grouping keys (if any)
  level: number;
  expanded: boolean;
  __isGroup: true;
}

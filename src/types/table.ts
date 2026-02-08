import type { IGroupedRows } from '@/types/grouped-rows';
import type { ISortPropDir } from '@/types/sort-prop-dir.type';

// Type alias for table row
export type RowType = Record<string, any>;

export const DEFAULT_VISIBLE_ROWS = 50;

export interface IPageInfo {
  page: number;
  start: number;
  size: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface IPageManager {
  addPage(page: number, start: number, size: number, isLast?: boolean): void;
  getPageInfo(page: number): IPageInfo | null;
  getPagesInfo(): IPageInfo[];
  removePage(page: number): void;
  clear(): void;
  totalPages: number;
  isFirstPage(page: number): boolean;
  isLastPage(page: number): boolean;
  setPageAsLast(page: number): void;
  getLastPage(): number;
}

export interface IRowInfo {
  uid: string; // Unique identifier for Vue key
  page: number;
  data: RowType | IGroupedRows | null;
  index: number;
  isExpanded: boolean;
  isPlaceholder?: boolean;
}

export interface IRowsManager {
  fillVisibleRows(
    scrollTop: number,
    rowHeight: number,
    visibleCount: number,
    destArray: IRowInfo[],
    page?: number
  ): void;
  getRowsCount(page?: number): number;
  getLoadedRowsCount(): number;
  getRows(): RowType[] | IGroupedRows[];
  addPage(rows: RowType[], page: number, isLast?: boolean): void;
  clear(): void;
  sort(sort: ISortPropDir[]): void;
  // Grouping
  setGroupBy(fields: string[]): void;
  toggleGroupExpanded(groupKey: string): void;
}

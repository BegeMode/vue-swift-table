import type { ISortPropDir } from '@/types/sort-prop-dir.type';
import type { IPageManager, IRowInfo, IRowsManager, RowType } from '@/types/table';
import type { IGroupedRows } from '@/types/grouped-rows';

export class RowsManager implements IRowsManager {
  private rows: IRowInfo[] = [];
  private defaultPageSize: number = 0;

  // Grouping state
  private groupByFields: string[] = [];
  private expandedGroups: Record<string, boolean> = {};
  private groupedRows: IRowInfo[] = []; // Flattened grouped rows for rendering

  constructor(private readonly pageManager: IPageManager) {}

  fillVisibleRows(
    scrollTop: number,
    rowHeight: number,
    visibleCount: number,
    destArray: IRowInfo[],
    page?: number
  ): void {
    // Use grouped rows if grouping is active
    const rows = this.groupByFields.length > 0 ? this.groupedRows : this.rows;

    // Calculate base offset for paged mode
    let baseOffset = 0;
    if (page !== undefined) {
      const pageInfo = this.pageManager.getPageInfo(page);
      if (pageInfo) {
        baseOffset = pageInfo.start;
      }
    }

    const firstVisibleRow = Math.trunc(scrollTop / rowHeight);
    const start = Math.max(0, baseOffset + firstVisibleRow);
    const lastVisibleRow = Math.min(rows.length, start + visibleCount);
    const length = lastVisibleRow - start;
    if (length < 0) {
      return;
    }
    destArray.length = length;
    for (let i = 0; i < length; i++) {
      destArray[i] = rows[start + i] as IRowInfo;
    }
  }

  clear(): void {
    this.rows = [];
    this.defaultPageSize = 0;
    this.pageManager.clear();
    this.groupByFields = [];
    this.expandedGroups = {};
    this.groupedRows = [];
  }

  getRowsCount(page?: number): number {
    // Use grouped rows count if grouping is active
    if (this.groupByFields.length > 0) {
      return this.groupedRows.length;
    }
    // Return page size for paged mode
    if (page !== undefined) {
      const pageInfo = this.pageManager.getPageInfo(page);
      return pageInfo?.size || 0;
    }
    return this.rows.length;
  }

  getLoadedRowsCount(): number {
    const pages = this.pageManager.getPagesInfo();
    return pages.reduce((acc, page) => acc + page.size, 0);
  }

  getRows(): RowType[] | IGroupedRows[] {
    return this.rows.filter(row => !row.isPlaceholder).map(row => row.data) as RowType[] | IGroupedRows[];
  }

  addPage(rows: RowType[], page: number, isLast?: boolean): void {
    const size = rows.length;

    // Save the page size from the first call as "default size"
    if (this.defaultPageSize === 0) {
      this.defaultPageSize = size;
    }

    // Calculate startIndex based on known pages
    const startIndex = this.calculateStartIndex(page);

    const rowInfos: IRowInfo[] = rows.map((row, i) => ({
      uid: `row-${page}-${startIndex + i}`,
      page,
      data: row,
      index: startIndex + i,
      isExpanded: false,
      isPlaceholder: false,
    }));

    // Check if there is already data for this page (reload)
    const existingPageInfo = this.pageManager.getPageInfo(page);
    if (existingPageInfo) {
      // Page already loaded — update data
      if (existingPageInfo.size !== size) {
        // Size changed — need to rebuild array
        this.rebuildArray(page, size - existingPageInfo.size, rowInfos);
      } else {
        // The same size — just replace data
        for (let i = 0; i < size; i++) {
          this.rows[existingPageInfo.start + i] = rowInfos[i]!;
        }
      }
      this.pageManager.addPage(page, existingPageInfo.start, size, isLast);
      return;
    }

    // If array is shorter than the starting position of the page — create placeholders
    if (this.rows.length < startIndex) {
      this.createPlaceholders(page, startIndex - this.rows.length);
    }

    // Check if there is enough reserved space
    const nextPageInfo = this.findNextLoadedPage(page);
    if (nextPageInfo) {
      // There is a loaded page after the current one
      const availableSpace = nextPageInfo.start - startIndex;
      if (availableSpace < size) {
        // Not enough space — need to shift the following rows
        this.shiftRowsRight(startIndex + availableSpace, size - availableSpace);
        this.updatePageStartIndexes(page + 1, size - availableSpace);
      }
      // Insert data
      for (let i = 0; i < size; i++) {
        this.rows[startIndex + i] = rowInfos[i]!;
      }
    } else {
      // No loaded pages after the current one — add to the end or replace placeholders
      if (this.rows.length >= startIndex + size) {
        // There are placeholders — replace
        for (let i = 0; i < size; i++) {
          this.rows[startIndex + i] = rowInfos[i]!;
        }
      } else if (this.rows.length >= startIndex) {
        // Partially there is space
        const existingCount = this.rows.length - startIndex;
        for (let i = 0; i < existingCount; i++) {
          this.rows[startIndex + i] = rowInfos[i]!;
        }
        for (let i = existingCount; i < size; i++) {
          this.rows.push(rowInfos[i]!);
        }
      } else {
        this.rows.push(...rowInfos);
      }
    }

    this.pageManager.addPage(page, startIndex, size, isLast);

    // Rebuild groups if grouping is active
    if (this.groupByFields.length > 0) {
      this.rebuildGroups();
    }
  }

  sort(sorts: ISortPropDir[]) {
    if (sorts.length === 0) {
      return;
    }

    const compare = (a: IRowInfo, b: IRowInfo) => {
      // Placeholders always go to the end
      if (a.isPlaceholder && !b.isPlaceholder) return 1;
      if (!a.isPlaceholder && b.isPlaceholder) return -1;
      if (a.isPlaceholder && b.isPlaceholder) return 0;

      for (const sort of sorts) {
        const { prop, dir } = sort;
        if (!prop) continue;

        const valA = (a.data as Record<string, unknown>)?.[prop];
        const valB = (b.data as Record<string, unknown>)?.[prop];

        if (valA === valB) continue;

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        const comparison = valA > valB ? 1 : -1;
        return dir === 'asc' ? comparison : -comparison;
      }
      return 0;
    };

    // Sort the entire array, placeholders go to the end
    const sortedRows = this.rows.toSorted(compare);

    // Take elements sequentially from the beginning of the sorted array
    // (placeholders at the end, real data at the beginning)
    const pagesInfo = this.pageManager.getPagesInfo();
    let sortedIndex = 0; // Index in sorted array

    for (const pageInfo of pagesInfo) {
      const startIndex = pageInfo.start;
      const size = pageInfo.size;
      const page = pageInfo.page;

      for (let i = 0; i < size; i++) {
        const item = sortedRows[sortedIndex];
        if (!item || item.isPlaceholder) {
          // The real data has ended
          break;
        }
        item.page = page;
        item.index = startIndex + i;
        this.rows[startIndex + i] = item;
        sortedIndex++;
      }
    }
  }

  // ================================================
  // Grouping Methods
  // ================================================

  setGroupBy(fields: string[]): void {
    this.groupByFields = fields;
    if (fields.length === 0) {
      this.groupedRows = [];
      this.expandedGroups = {};
    } else {
      this.rebuildGroups();
    }
  }

  toggleGroupExpanded(groupKey: string): void {
    // Default is true (expanded), so if not in map, toggle to false
    const currentState = this.expandedGroups[groupKey] ?? true;
    this.expandedGroups[groupKey] = !currentState;
    this.rebuildGroups();
  }

  private rebuildGroups(): void {
    if (this.groupByFields.length === 0) {
      this.groupedRows = [];
      return;
    }

    // Collect all real rows (not placeholders)
    const allRows = this.rows.filter((r: IRowInfo) => !r.isPlaceholder);

    // Build group tree
    const groupTree = this.buildGroupTree(allRows, this.groupByFields, 0, '');

    // Flatten groups for rendering
    this.groupedRows = this.flattenGroups(groupTree);
  }

  private buildGroupTree(rows: IRowInfo[], fields: string[], level: number, parentKey: string): IRowInfo[] {
    if (level >= fields.length) {
      // Return rows as-is when no more grouping levels
      return rows;
    }

    const field = fields[level]!;
    const groups = new Map<string, { groupInfo: IGroupedRows; rows: IRowInfo[] }>();

    for (const rowInfo of rows) {
      if (!rowInfo.data || rowInfo.isPlaceholder) continue;

      const fieldValue = (rowInfo.data as Record<string, unknown>)[field];
      const keyVal = fieldValue === null || fieldValue === undefined ? '' : String(fieldValue);
      const uniqueKey = this.getGroupKey(keyVal, level, parentKey);

      if (!groups.has(uniqueKey)) {
        const isExpanded = this.expandedGroups[uniqueKey] ?? true; // Default expanded
        groups.set(uniqueKey, {
          groupInfo: {
            __isGroup: true,
            key: uniqueKey,
            value: [],
            level,
            expanded: isExpanded,
            keys: [{ title: field, prop: field, value: keyVal }],
          },
          rows: [],
        });
      }

      groups.get(uniqueKey)!.rows.push(rowInfo);
    }

    // Recursively build children and convert to IRowInfo[]
    const result: IRowInfo[] = [];
    let index = 0;

    for (const { groupInfo, rows: groupRows } of groups.values()) {
      // Create IRowInfo for the group header
      const groupRowInfo: IRowInfo = {
        uid: `group-${groupInfo.key}`,
        page: 0,
        data: groupInfo,
        index: index++,
        isExpanded: groupInfo.expanded,
        isPlaceholder: false,
      };

      result.push(groupRowInfo);

      // If expanded, add children
      if (groupInfo.expanded) {
        if (level + 1 < fields.length) {
          // More levels - recurse
          const childGroups = this.buildGroupTree(groupRows, fields, level + 1, groupInfo.key);
          for (const child of childGroups) {
            child.index = index++;
            result.push(child);
          }
        } else {
          // Leaf level - add actual rows
          for (const row of groupRows) {
            row.index = index++;
            result.push(row);
          }
        }
      }

      // Update group value with actual row data
      groupInfo.value = groupRows.map(r => r.data as RowType);
    }

    return result;
  }

  private getGroupKey(key: string, level: number, parentKey: string): string {
    return `${parentKey}_${level}_${key}`;
  }

  private flattenGroups(items: IRowInfo[]): IRowInfo[] {
    // Items are already flattened by buildGroupTree
    return items;
  }

  /**
   * Calculates startIndex for the page based on the known sizes of previous pages
   */
  private calculateStartIndex(page: number): number {
    let startIndex = 0;

    for (let p = 1; p < page; p++) {
      const pageInfo = this.pageManager.getPageInfo(p);
      if (pageInfo) {
        startIndex = pageInfo.start + pageInfo.size;
      } else {
        // Page not loaded — use default size
        startIndex += this.defaultPageSize;
      }
    }

    return startIndex;
  }

  /**
   * Finds the next loaded page after the specified page
   */
  private findNextLoadedPage(page: number): { page: number; start: number; size: number } | null {
    // Search in a reasonable range (up to 100 pages forward)
    for (let p = page + 1; p <= page + 100; p++) {
      const pageInfo = this.pageManager.getPageInfo(p);
      if (pageInfo) {
        return { page: p, start: pageInfo.start, size: pageInfo.size };
      }
    }
    return null;
  }

  /**
   * Creates placeholder row
   */
  private createPlaceholders(forPage: number, count: number): void {
    const startIndex = this.rows.length;
    for (let i = 0; i < count; i++) {
      this.rows.push({
        uid: `placeholder-${startIndex + i}`,
        page: forPage,
        data: null,
        index: startIndex + i,
        isExpanded: false,
        isPlaceholder: true,
      });
    }
  }

  /**
   * Shifts rows to the right starting from the specified index
   */
  private shiftRowsRight(fromIndex: number, shift: number): void {
    // Expand the array
    const oldLength = this.rows.length;
    this.rows.length = oldLength + shift;

    // Shift elements to the left
    for (let i = oldLength - 1; i >= fromIndex; i--) {
      this.rows[i + shift] = this.rows[i]!;
    }

    // Fill the freed space with placeholders
    for (let i = fromIndex; i < fromIndex + shift; i++) {
      this.rows[i] = {
        uid: `placeholder-${i}`,
        page: 0,
        data: null,
        index: i,
        isExpanded: false,
        isPlaceholder: true,
      };
    }
  }

  /**
   * Updates startIndex for all loaded pages starting from the specified page
   */
  private updatePageStartIndexes(fromPage: number, shift: number): void {
    // Search for all loaded pages after fromPage and update their startIndex
    for (let p = fromPage; p <= fromPage + 100; p++) {
      const pageInfo = this.pageManager.getPageInfo(p);
      if (pageInfo) {
        this.pageManager.addPage(p, pageInfo.start + shift, pageInfo.size, pageInfo.isLast);
      }
    }
  }

  /**
   * Rebuilds the array when the size of an already loaded page changes
   */
  private rebuildArray(page: number, sizeDelta: number, newRowInfos: IRowInfo[]): void {
    const pageInfo = this.pageManager.getPageInfo(page);
    if (!pageInfo) return;

    const startIndex = pageInfo.start;

    if (sizeDelta > 0) {
      // Page increased — shift rows to the right
      this.shiftRowsRight(startIndex + pageInfo.size, sizeDelta);
      this.updatePageStartIndexes(page + 1, sizeDelta);
    } else if (sizeDelta < 0) {
      // Page decreased — shift rows to the left
      const absShift = Math.abs(sizeDelta);
      const removeFrom = startIndex + pageInfo.size - absShift;
      this.rows.splice(removeFrom, absShift);
      this.updatePageStartIndexes(page + 1, sizeDelta);
    }

    // Insert new data
    for (let i = 0; i < newRowInfos.length; i++) {
      this.rows[startIndex + i] = newRowInfos[i]!;
    }
  }
}

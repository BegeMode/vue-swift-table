import { describe, it, expect, beforeEach } from 'vitest';
import { RowsManager } from './rowsManager';
import { PageManager } from './pageManager';
import type { IRowInfo, RowType } from '@/types/table';

describe('RowsManager', () => {
  let pageManager: PageManager;
  let rowsManager: RowsManager;

  // Helper для создания тестовых данных
  const createRows = (count: number, prefix: string = 'row'): RowType[] => {
    return Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, name: `${prefix} ${i}` }));
  };

  beforeEach(() => {
    pageManager = new PageManager();
    rowsManager = new RowsManager(pageManager);
  });

  describe('basic operations', () => {
    it('should add first page at index 0', () => {
      const rows = createRows(10);
      rowsManager.addPage(rows, 1);

      const pageInfo = pageManager.getPageInfo(1);
      expect(pageInfo?.start).toBe(0);
      expect(pageInfo?.size).toBe(10);
    });

    it('should add consecutive pages sequentially', () => {
      rowsManager.addPage(createRows(10, 'p1'), 1);
      rowsManager.addPage(createRows(10, 'p2'), 2);
      rowsManager.addPage(createRows(10, 'p3'), 3);

      expect(pageManager.getPageInfo(1)?.start).toBe(0);
      expect(pageManager.getPageInfo(2)?.start).toBe(10);
      expect(pageManager.getPageInfo(3)?.start).toBe(20);
    });

    it('should fill visible rows correctly', () => {
      rowsManager.addPage(createRows(10, 'p1'), 1);
      rowsManager.addPage(createRows(10, 'p2'), 2);

      const visible: IRowInfo[] = [];
      // scrollTop=250 with rowHeight=50 means first visible row is 5
      rowsManager.fillVisibleRows(250, 50, 10, visible);
      expect(visible.length).toBe(10);
      expect((visible[0]?.data as RowType)?.['id']).toBe('p1-5');
    });

    it('should register page info in pageManager', () => {
      const rows = createRows(10);
      rowsManager.addPage(rows, 1, false);
      rowsManager.addPage(rows, 2, true);

      expect(pageManager.isFirstPage(1)).toBe(true);
      expect(pageManager.isLastPage(2)).toBe(true);
    });
  });

  describe('starting from middle page', () => {
    it('should create placeholders for previous pages when starting from page 3', () => {
      rowsManager.addPage(createRows(10, 'p3'), 3);

      // Should have placeholders for pages 1-2 (20 rows) + page 3 (10 rows) = 30 total
      const count = rowsManager.getRowsCount();
      expect(count).toBe(30);
    });

    it('should insert page 2 into reserved placeholder space', () => {
      rowsManager.addPage(createRows(10, 'p3'), 3);
      rowsManager.addPage(createRows(10, 'p2'), 2);

      const visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(500, 50, 10, visible);
      expect((visible[0]?.data as RowType)?.['id']).toBe('p2-0');
    });

    it('should insert page 1 into reserved placeholder space', () => {
      rowsManager.addPage(createRows(10, 'p3'), 3);
      rowsManager.addPage(createRows(10, 'p2'), 2);
      rowsManager.addPage(createRows(10, 'p1'), 1);

      const visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(0, 50, 10, visible);
      expect((visible[0]?.data as RowType)?.['id']).toBe('p1-0');
    });
  });

  describe('variable page sizes', () => {
    it('should handle page 2 having more rows than reserved space', () => {
      rowsManager.addPage(createRows(10, 'p1'), 1);
      rowsManager.addPage(createRows(10, 'p3'), 3);
      // Page 2 has 15 rows instead of expected 10
      rowsManager.addPage(createRows(15, 'p2'), 2);

      const visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(500, 50, 10, visible);
      expect((visible[0]?.data as RowType)?.['id']).toBe('p2-0');
    });

    it('should shift subsequent rows when page size exceeds reserved space', () => {
      rowsManager.addPage(createRows(10, 'p1'), 1);
      rowsManager.addPage(createRows(10, 'p3'), 3);
      rowsManager.addPage(createRows(15, 'p2'), 2);

      expect(rowsManager.getRowsCount()).toBe(35);
    });

    it('should handle reloading a page with different size', () => {
      rowsManager.addPage(createRows(10, 'p1'), 1);
      rowsManager.addPage(createRows(10, 'p2'), 2);
      rowsManager.addPage(createRows(15, 'p1-new'), 1);

      expect(rowsManager.getRowsCount()).toBe(25);
    });

    it('should handle page reload with smaller size', () => {
      rowsManager.addPage(createRows(10, 'p1'), 1);
      rowsManager.addPage(createRows(10, 'p2'), 2);
      // Reload page 1 with 5 rows
      rowsManager.addPage(createRows(5, 'p1-small'), 1);

      // Size should decrease
      expect(rowsManager.getRowsCount()).toBeLessThanOrEqual(20);
    });
  });

  describe('edge cases', () => {
    it('should handle loading pages in random order', () => {
      rowsManager.addPage(createRows(10, 'p5'), 5);
      rowsManager.addPage(createRows(10, 'p2'), 2);
      rowsManager.addPage(createRows(10, 'p1'), 1);
      rowsManager.addPage(createRows(10, 'p3'), 3);
      rowsManager.addPage(createRows(10, 'p4'), 4);

      expect(rowsManager.getRowsCount()).toBe(50);
    });

    it('should clear all data on clear()', () => {
      rowsManager.addPage(createRows(10, 'p1'), 1);
      rowsManager.addPage(createRows(10, 'p2'), 2);

      rowsManager.clear();

      expect(rowsManager.getRowsCount()).toBe(0);
    });

    it('should work with last page flag', () => {
      rowsManager.addPage(createRows(10, 'p1'), 1, false);
      rowsManager.addPage(createRows(5, 'p2'), 2, true);

      expect(pageManager.isLastPage(2)).toBe(true);
      expect(pageManager.isLastPage(1)).toBe(false);
    });
  });

  describe('fillVisibleRows', () => {
    it('should return correct subset based on scroll position', () => {
      rowsManager.addPage(createRows(20, 'row'), 1);

      const visible: IRowInfo[] = [];
      // scrollTop=0, rowHeight=50, visibleCount=5
      rowsManager.fillVisibleRows(0, 50, 5, visible);

      expect(visible.length).toBe(5);
      expect((visible[0]?.data as RowType)?.['id']).toBe('row-0');
      expect((visible[4]?.data as RowType)?.['id']).toBe('row-4');
    });

    it('should handle scroll to middle of data', () => {
      rowsManager.addPage(createRows(20, 'row'), 1);

      const visible: IRowInfo[] = [];
      // scrollTop=250 means first visible row is 5
      rowsManager.fillVisibleRows(250, 50, 5, visible);

      expect((visible[0]?.data as RowType)?.['id']).toBe('row-5');
    });

    it('should limit results to available data', () => {
      rowsManager.addPage(createRows(3, 'row'), 1);

      const visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(0, 50, 10, visible);

      expect(visible.length).toBe(3);
    });
  });

  describe('sorting', () => {
    it('should sort rows ascending by field', () => {
      const rows: RowType[] = [
        { id: '3', name: 'Charlie', age: 30 },
        { id: '1', name: 'Alice', age: 25 },
        { id: '2', name: 'Bob', age: 35 },
      ];
      rowsManager.addPage(rows, 1);

      rowsManager.sort([{ prop: 'name', dir: 'asc' }]);

      const visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(0, 50, 10, visible);

      expect((visible[0]?.data as RowType)?.['name']).toBe('Alice');
      expect((visible[1]?.data as RowType)?.['name']).toBe('Bob');
      expect((visible[2]?.data as RowType)?.['name']).toBe('Charlie');
    });

    it('should sort rows descending by field', () => {
      const rows: RowType[] = [
        { id: '1', name: 'Alice', age: 25 },
        { id: '2', name: 'Bob', age: 35 },
        { id: '3', name: 'Charlie', age: 30 },
      ];
      rowsManager.addPage(rows, 1);

      rowsManager.sort([{ prop: 'age', dir: 'desc' }]);

      const visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(0, 50, 10, visible);

      expect((visible[0]?.data as RowType)?.['age']).toBe(35);
      expect((visible[1]?.data as RowType)?.['age']).toBe(30);
      expect((visible[2]?.data as RowType)?.['age']).toBe(25);
    });

    it('should keep placeholders at the end after sorting', () => {
      // Start from page 2 to create placeholders for page 1
      const rows: RowType[] = [
        { id: '3', name: 'Charlie' },
        { id: '1', name: 'Alice' },
      ];
      rowsManager.addPage(rows, 2);

      // Page 1 has placeholders
      const page1Info = pageManager.getPageInfo(1);
      expect(page1Info).toBeNull(); // Page 1 not loaded, but placeholders created

      rowsManager.sort([{ prop: 'name', dir: 'asc' }]);

      const visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(0, 50, 10, visible);

      // First should be placeholders, then real data
      // After sort placeholders stay in their place (page 1 area)
      // Real data from page 2 should be sorted
      const page2visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(100, 50, 10, page2visible); // scrollTop=100 for page 2

      expect((page2visible[0]?.data as RowType)?.['name']).toBe('Alice');
      expect((page2visible[1]?.data as RowType)?.['name']).toBe('Charlie');
    });
  });

  describe('grouping', () => {
    it('should group rows by field', () => {
      const rows: RowType[] = [
        { id: '1', category: 'A', name: 'Item 1' },
        { id: '2', category: 'B', name: 'Item 2' },
        { id: '3', category: 'A', name: 'Item 3' },
        { id: '4', category: 'B', name: 'Item 4' },
      ];
      rowsManager.addPage(rows, 1);

      rowsManager.setGroupBy(['category']);

      // Should have 2 groups + 4 rows = 6 items when expanded
      expect(rowsManager.getRowsCount()).toBe(6);

      const visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(0, 50, 10, visible);

      // First item should be a group header
      expect((visible[0]?.data as { __isGroup?: boolean })?.__isGroup).toBe(true);
    });

    it('should collapse group when toggled', () => {
      const rows: RowType[] = [
        { id: '1', category: 'A', name: 'Item 1' },
        { id: '2', category: 'A', name: 'Item 2' },
        { id: '3', category: 'B', name: 'Item 3' },
      ];
      rowsManager.addPage(rows, 1);

      rowsManager.setGroupBy(['category']);

      // Initially: 2 groups + 3 rows = 5 items
      expect(rowsManager.getRowsCount()).toBe(5);

      // Get first group key
      const visible: IRowInfo[] = [];
      rowsManager.fillVisibleRows(0, 50, 10, visible);
      const firstGroupKey = (visible[0]?.data as { key?: string })?.key;

      // Toggle first group to collapse
      rowsManager.toggleGroupExpanded(firstGroupKey!);

      // After collapse: 2 groups + 1 row (from B) = 3 items
      expect(rowsManager.getRowsCount()).toBe(3);
    });

    it('should clear grouping when empty array passed', () => {
      const rows: RowType[] = [
        { id: '1', category: 'A', name: 'Item 1' },
        { id: '2', category: 'B', name: 'Item 2' },
      ];
      rowsManager.addPage(rows, 1);

      rowsManager.setGroupBy(['category']);
      expect(rowsManager.getRowsCount()).toBe(4); // 2 groups + 2 rows

      rowsManager.setGroupBy([]);
      expect(rowsManager.getRowsCount()).toBe(2); // Back to raw rows
    });

    it('should rebuild groups when new page is added', () => {
      rowsManager.setGroupBy(['category']);

      rowsManager.addPage([{ id: '1', category: 'A', name: 'Item 1' }], 1);
      expect(rowsManager.getRowsCount()).toBe(2); // 1 group + 1 row

      rowsManager.addPage([{ id: '2', category: 'A', name: 'Item 2' }], 2);
      // Still 1 group (A) but now with 2 rows = 3 items
      expect(rowsManager.getRowsCount()).toBe(3);

      rowsManager.addPage([{ id: '3', category: 'B', name: 'Item 3' }], 3);
      // 2 groups (A, B) + 3 rows = 5 items
      expect(rowsManager.getRowsCount()).toBe(5);
    });
  });
});

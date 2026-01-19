import type { IPageManager, IPageInfo } from '@/types/table';

export class PageManager implements IPageManager {
  private pages: Map<number, IPageInfo> = new Map();

  addPage(page: number, start: number, size: number, isLast?: boolean): void {
    this.pages.set(page, { page, start, size, isFirst: page === 1, isLast: !!isLast });
  }

  getPageInfo(page: number): IPageInfo | null {
    return this.pages.get(page) || null;
  }

  getPagesInfo(): IPageInfo[] {
    return Array.from(this.pages.values()).sort((a, b) => a.page - b.page);
  }

  removePage(page: number): void {
    this.pages.delete(page);
  }

  get totalPages(): number {
    return this.pages.size;
  }

  clear(): void {
    this.pages = new Map();
  }

  isFirstPage(page: number): boolean {
    return !!this.pages.get(page)?.isFirst;
  }

  isLastPage(page: number): boolean {
    return !!this.pages.get(page)?.isLast;
  }
}

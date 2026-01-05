export const SortType = {
  single: 'single',
  multi: 'multi',
} as const;

export type SortType = (typeof SortType)[keyof typeof SortType];

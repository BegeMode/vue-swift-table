export const SelectionType = {
  single: 'single',
  singleFocus: 'singleFocus',
  multi: 'multi',
  multiClick: 'multiClick',
  cell: 'cell',
  checkbox: 'checkbox',
} as const;

export type SelectionType = (typeof SelectionType)[keyof typeof SelectionType];

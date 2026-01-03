export interface IGroupedRows {
  key: string;
  value: Record<string, unknown | IGroupedRows>[]; // The rows in this group
  keys?: { title: string; prop: string; value: any }[]; // For nested grouping keys (if any)
  level: number;
  expanded: boolean;
  __isGroup: true;
}

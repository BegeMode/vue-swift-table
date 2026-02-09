import type { InternalTableColumn } from '@/types/table-column.type';
import { camelCase, deCamelCase } from './camel-case';
import { getterForProp } from './column-prop-getters';
import { id } from './id';

/**
 * Sets the column defaults
 */
export function setColumnsDefaults(columns: InternalTableColumn[]): void {
  if (!columns) {
    return;
  }

  // Only one column should hold the tree view
  // Thus if multiple columns are provided with
  // isTreeColumn as true we take only the first one
  let treeColumnFound = false;

  for (const column of columns) {
    setColumnDefaults(column);
    if (!('isTreeColumn' in column)) {
      column.isTreeColumn = false;
    } else if (column.isTreeColumn && !treeColumnFound) {
      // If the first column with isTreeColumn is true found
      // we mark that treeCoulmn is found
      column.isTreeColumn = true;
      treeColumnFound = true;
    } else {
      // After that isTreeColumn property for any other column
      // will be set as false
      column.isTreeColumn = false;
    }
  }
}

export function setColumnDefaults(column: InternalTableColumn): void {
  if (!column || !column.prop) {
    return;
  }

  if (!column.$$id) {
    column.$$id = id();
  }

  // prop can be numeric; zero is valid not a missing prop
  // translate name => prop
  if (isNullOrUndefined(column.prop) && column.name) {
    column.prop = camelCase(column.name);
  }

  column.$$valueGetter = getterForProp(column.prop);

  // format props if no name passed
  if (!isNullOrUndefined(column.prop) && isNullOrUndefined(column.name)) {
    column.name = deCamelCase(String(column.prop));
  }

  if (isNullOrUndefined(column.prop) && isNullOrUndefined(column.name)) {
    column.name = ''; // Fixes IE and Edge displaying `null`
  }

  if (!('resizeable' in column)) {
    column.resizeable = true;
  }

  if (!('sortable' in column)) {
    column.sortable = true;
  }

  if (!('draggable' in column)) {
    column.draggable = true;
  }

  if (!('visible' in column)) {
    column.visible = true;
  }

  if (!('canAutoResize' in column) || isNullOrUndefined(column.canAutoResize)) {
    column.canAutoResize = true;
  }

  if (!('width' in column) || !column.width) {
    column.width = 150;
  }
  column.isTarget = isNullOrUndefined(column.isTarget) ? false : column.isTarget;
}

export function isNullOrUndefined<T>(value: T | null | undefined): value is null | undefined {
  // eslint-disable-next-line no-undefined
  return value === null || value === undefined;
}

import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import type { IGroupedRows } from '../types/grouped-rows';
import { getterForProp } from '../utils/column-prop-getters';

export function useRowGrouping(
  rows: Ref<any[]>,
  groupRowsBy: Ref<any[] | undefined>,
  groupExpansionDefault: Ref<boolean>
) {
  // Map to store expanded state of groups: key -> boolean
  // We uses a unique key constructed from path if possible, or just value if unique enough for now.
  const expandedGroups = ref<Record<string, boolean>>({});

  // Reset expanded state when grouping changes
  watch(groupRowsBy, () => {
    expandedGroups.value = {};
  }, { deep: true });

  const getGroupKey = (key: string, level: number, parentKey: string = '') => {
      return `${parentKey}_${level}_${key}`;
  };

  const groupingExpansion = (key: string) => {
    if (expandedGroups.value[key] !== undefined) {
      return expandedGroups.value[key];
    }
    return groupExpansionDefault.value;
  };

  // Main Grouping Logic
  // We build a tree of Groups first
  const groupTree = computed(() => {
    if (!groupRowsBy.value || !groupRowsBy.value.length) {
      return null;
    }
    return groupRows(rows.value, groupRowsBy.value, 0);
  });
  
  // Helper to group rows recursively
  function groupRows(data: any[], groupByFields: any[], level: number, parentKey: string = ''): (any | IGroupedRows)[] {
    // If we exhausted fields, return data
    if (level >= groupByFields.length) {
      return data;
    }

    const field = groupByFields[level];
    const valueGetter = getterForProp(field);
    
    // We use a Map to preserve order of appearance
    const groups = new Map<string, IGroupedRows>();
    
    for (const row of data) {
      const fieldVal = valueGetter(row, field);
      const keyVal = fieldVal === null || fieldVal === undefined ? '' : String(fieldVal);
      const uniqueKey = getGroupKey(keyVal, level, parentKey);

      if (!groups.has(uniqueKey)) {
        groups.set(uniqueKey, {
          __isGroup: true,
          key: uniqueKey,
          value: [row], // Start with this row
          level: level,
          expanded: groupingExpansion(uniqueKey),
          keys: [{ title: String(field), prop: String(field), value: keyVal }] // Store metadata
        });
      } else {
        groups.get(uniqueKey)!.value.push(row);
      }
    }
    
    // Recursively group children
    const result: IGroupedRows[] = [];
    for (const group of groups.values()) {
        // If there are more levels, group the children
        if (level + 1 < groupByFields.length) {
            group.value = groupRows(group.value, groupByFields, level + 1, group.key);
        }
        result.push(group);
    }
    
    return result;
  }

  // Flattener
  const flattenedRows = computed(() => {
     if (!groupTree.value) return rows.value;
     return flattenGroups(groupTree.value);
  });
  
  function flattenGroups(groups: (any | IGroupedRows)[]): any[] {
     const result: any[] = [];
     for (const item of groups) {
        if (item.__isGroup) {
           result.push(item); // Add the group header
           if (item.expanded) {
               // Add its children (flattened if they are groups)
               if (item.value && item.value.length > 0) {
                   if (item.value[0].__isGroup) {
                        result.push(...flattenGroups(item.value));
                   } else {
                        result.push(...item.value);
                   }
               }
           }
        } else {
           // Should not happen at top level if grouping is active, but consistent
           result.push(item);
        }
     }
     return result;
  }

  const onGroupToggle = (group: IGroupedRows) => {
      const newState = !group.expanded;
      // We need to update the source map to trigger reactivity 
      // because strict modification of computed object might not trigger re-eval of `flattenedRows` 
      // if `expanded` was just a property. 
      // However, `groupTree` is computed. 
      // We should rely on `expandedGroups` ref which is a dependency of `groupTree` (via `groupingExpansion`).
      // So updating `expandedGroups` should trigger `groupTree` re-calc -> `flattenedRows` re-calc.
      
      expandedGroups.value[group.key] = newState;
      
      // Also update the local object for immediate UI feedback if needed (though reactivity handles it)
      // group.expanded = newState; 
  };

  return {
    groupedRows: flattenedRows,
    groupTree,
    flattenGroups,
    onGroupToggle
  };
}

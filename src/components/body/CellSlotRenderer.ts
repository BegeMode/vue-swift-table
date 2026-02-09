import { defineComponent, h, inject } from 'vue';
import type { PropType, Slots } from 'vue';
import type { InternalTableColumn } from '@/types/table-column.type';

export default defineComponent({
  name: 'CellSlotRenderer',
  props: {
    column: {
      type: Object as PropType<InternalTableColumn>,
      required: true,
    },
    row: {
      type: Object,
      required: true,
    },
    value: {
      type: [String, Number, Boolean, Object, Array] as any,
      default: null,
    },
    expanded: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const tableSlots = inject<Slots>('dataTableSlots');

    return () => {
      const slotName = `col-${props.column.prop || props.column.$$id}`;

      if (tableSlots && tableSlots[slotName]) {
        return tableSlots[slotName]!({
          row: props.row,
          column: props.column,
          value: props.value,
          expanded: props.expanded,
        });
      }

      // Default rendering
      return h('span', props.value);
    };
  },
});

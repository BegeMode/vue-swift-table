import { defineComponent, h, inject } from 'vue';
import type { Slots } from 'vue';

export default defineComponent({
  name: 'HeaderSlotRenderer',
  props: {
    column: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const tableSlots = inject<Slots>('dataTableSlots');

    return () => {
      const prop = props.column.prop || props.column.$$id;
      const slotName = `header-${prop}`;

      if (tableSlots && tableSlots[slotName]) {
        return tableSlots[slotName]!({
          column: props.column,
        });
      }

      // Default rendering
      return h('span', props.column.name || props.column.prop);
    };
  },
});

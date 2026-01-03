<script setup lang="ts">
import { computed } from 'vue';
import type { IGroupedRows } from '../../types/grouped-rows';

const props = defineProps<{
  group: IGroupedRows;
  expanded: boolean;
  rowHeight: number;
}>();

const emit = defineEmits(['toggle']);

const toggleExpandGroup = () => {
    emit('toggle', props.group);
};

const groupTitle = computed(() => {
    if (!props.group.keys || !props.group.keys.length) {
       return props.group.key;
    }
    return props.group.keys.map(k => `${k.title || k.prop} - ${k.value}`).join('; ');
});

const styles = computed(() => ({
    paddingLeft: props.group.level ? `${props.group.level * 10}px` : '5px',
    height: `${props.rowHeight}px`,
    lineHeight: `${props.rowHeight}px`
}));
</script>

<template>
  <div 
    class="datatable-group-header"
    :class="{ 'active': expanded }"
    :style="styles"
    @click="toggleExpandGroup"
  >
     <a 
       href="#" 
       @click.prevent 
       :class="expanded ? 'datatable-icon-down' : 'datatable-icon-right'"
     >
     </a>
     <slot name="groupHeader" :group="group" :expanded="expanded" :level="group.level">
        <span class="datatable-group-header-content">
           <b>{{ groupTitle }}</b>
        </span>
     </slot>
  </div>
</template>

<style scoped lang="scss">
.datatable-group-header {
  display: flex;
  align-items: center;
  width: 100%;
  border-bottom: 1px solid #eee;
  background: #f5f5f5;
  cursor: pointer;
  box-sizing: border-box;
  
  a {
    text-decoration: none;
    color: inherit;
    margin-right: 5px;
    display: inline-block;
  }
}
</style>

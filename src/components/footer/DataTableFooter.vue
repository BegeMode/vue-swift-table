<script setup lang="ts">
import { computed } from 'vue';
import DataTablePager from './DataTablePager.vue';

interface Props {
  rowCount: number;
  pageSize: number;
  offset: number; // 0-based index
  footerHeight: number;
  totalMessage?: string;
  selectedMessage?: string | boolean;
  selectedCount?: number;
  
  pagerLeftArrowIcon?: string;
  pagerRightArrowIcon?: string;
  pagerPreviousIcon?: string;
  pagerNextIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  rowCount: 0,
  pageSize: 0,
  offset: 0,
  footerHeight: 0,
  totalMessage: 'total',
  selectedMessage: false,
  selectedCount: 0
});

const emit = defineEmits(['page']);

const currentPage = computed(() => props.offset + 1);

const onPageChange = ({ page }: { page: number }) => {
  emit('page', {
    offset: page - 1,
    limit: props.pageSize,
    count: props.rowCount
  });
};

const curPageText = computed(() => {
  const { rowCount, pageSize, offset } = props;
  if (!rowCount) return `0 ${props.totalMessage}`;
  
  const start = offset * pageSize + 1;
  const end = Math.min((offset + 1) * pageSize, rowCount);
  return `${start} - ${end} of ${rowCount} ${props.totalMessage}`;
});
</script>

<template>
  <div 
    class="datatable-footer" 
    :style="{ height: footerHeight + 'px' }"
  >
    <div class="datatable-footer-inner" :class="{ 'selected-count': selectedMessage }">
      <div v-if="selectedMessage" class="page-count">
        <span v-if="selectedCount">
          {{ selectedCount }} {{ selectedMessage }} / 
        </span>
        {{ curPageText }}
      </div>
      <div v-else class="page-count">
        {{ curPageText }}
      </div>
      <div class="datatable-pager">
        <DataTablePager
          :page="currentPage"
          :size="pageSize"
          :count="rowCount"
          :pagerLeftArrowIcon="pagerLeftArrowIcon"
          :pagerRightArrowIcon="pagerRightArrowIcon"
          :pagerPreviousIcon="pagerPreviousIcon"
          :pagerNextIcon="pagerNextIcon"
          @change="onPageChange"
        />
      </div>
    </div>
  </div>
</template>

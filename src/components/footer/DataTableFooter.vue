<script setup lang="ts">
import { computed, inject, watch, type Ref } from 'vue';
import DataTablePager from './DataTablePager.vue';
import type { IPageManager, IRowsManager } from '@/types/table';

interface Props {
  totalPages?: number;
  totalRows?: number;
  page: number;
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
  page: 0,
  footerHeight: 0,
  totalMessage: 'total',
  selectedMessage: false,
  selectedCount: 0,
});

const emit = defineEmits(['page']);

const currentPage = computed(() => props.page);

const rowsManager = inject('rowsManager') as IRowsManager;
const pageManager = inject('pageManager') as IPageManager;
// Reactive trigger for rows data changes
const rowsVersion = inject<Ref<number>>('rowsVersion')!;

const onPageChange = ({ page }: { page: number }) => {
  emit('page', {
    page,
  });
};

const curPageText = computed(() => {
  // Depend on rowsVersion to trigger recalculation when rows data changes
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  rowsVersion.value;
  const { totalRows, page } = props;
  let rowCount = totalRows;
  if (!rowCount) {
    rowCount = rowsManager.getLoadedRowsCount();
  }
  if (!rowCount) {
    return `0 ${props.totalMessage}`;
  }
  const pageInfo = pageManager.getPageInfo(page);
  if (!pageInfo) {
    return `0 ${props.totalMessage}`;
  }
  const pageSize = pageInfo.size;
  const start = pageInfo.start + 1;
  const end = Math.min(pageInfo.start + pageSize, rowCount);
  return `${start} - ${end} of ${rowCount} ${props.totalMessage}`;
});

watch(
  () => props.page,
  (newVal, oldVal) => {
    if (oldVal === undefined) {
      onPageChange({ page: newVal });
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="datatable-footer"
    :class="{ 'datatable-footer-border': Boolean(footerHeight) }"
    :style="{ height: footerHeight + 'px' }"
  >
    <div class="datatable-footer-inner" :class="{ 'selected-count': selectedMessage }">
      <div v-if="selectedMessage" class="page-count">
        <span v-if="selectedCount"> {{ selectedCount }} {{ selectedMessage }} / </span>
        {{ curPageText }}
      </div>
      <div v-else class="page-count">
        {{ curPageText }}
      </div>
      <div class="datatable-pager">
        <DataTablePager
          :page="currentPage"
          :totalPages="totalPages"
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

<script setup lang="ts">
import type { IPageManager } from '@/types/table';
import { computed, inject, toRefs, type Ref } from 'vue';

interface Props {
  totalPages?: number;
  pagerLeftArrowIcon?: string;
  pagerRightArrowIcon?: string;
  pagerPreviousIcon?: string;
  pagerNextIcon?: string;
  page?: number; // Current page, 1-based
}

const props = withDefaults(defineProps<Props>(), {
  page: 1,
  pagerLeftArrowIcon: 'datatable-icon-left',
  pagerRightArrowIcon: 'datatable-icon-right',
  pagerPreviousIcon: 'datatable-icon-prev',
  pagerNextIcon: 'datatable-icon-skip',
});

const emit = defineEmits(['change']);

const rowsVersion = inject<Ref<number>>('rowsVersion')!;

const { page, totalPages } = toRefs(props);

const pageManager = inject('pageManager') as IPageManager;

const pages = computed(() => {
  const cur = page.value;
  const max = 5;
  const total = Math.max(totalPages.value || 0, pageManager.totalPages, cur);

  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let start = cur - 2;
  let end = cur + 2;

  if (start < 1) {
    start = 1;
    end = Math.min(start + max - 1, total);
  } else if (end > total) {
    end = total;
    start = Math.max(end - max + 1, 1);
  }

  // Adjust if we are near ends to keep 5 items if possible
  if (end - start + 1 < max) {
    if (start === 1) {
      end = Math.min(start + max - 1, total);
    } else {
      start = Math.max(end - max + 1, 1);
    }
  }

  const p = [];
  for (let i = start; i <= end; i++) {
    p.push(i);
  }
  return p;
});

const canPrevious = computed(() => page.value > 1);
const canNext = computed(() => {
  // Depend on rowsVersion to trigger recalculation when rows data changes
  rowsVersion.value;
  return !pageManager.isLastPage(page.value);
});
const canLast = computed(() => {
  // Depend on rowsVersion to trigger recalculation when rows data changes
  rowsVersion.value;
  return !pageManager.isLastPage(page.value) && pageManager.getLastPage();
});

const selectPage = (p: number) => {
  if (p < 1 || (totalPages.value && p > totalPages.value) || p === page.value) return;
  emit('change', { page: p });
};
</script>

<template>
  <ul class="pager">
    <li :class="{ disabled: !canPrevious }">
      <a role="button" aria-label="First" @click.prevent="selectPage(1)">
        <i :class="pagerPreviousIcon"></i>
      </a>
    </li>
    <li :class="{ disabled: !canPrevious }">
      <a role="button" aria-label="Previous" @click.prevent="selectPage(page - 1)">
        <i :class="pagerLeftArrowIcon"></i>
      </a>
    </li>
    <li v-for="pg in pages" :key="pg" :class="{ active: pg === page }">
      <a role="button" @click.prevent="selectPage(pg)">
        {{ pg }}
      </a>
    </li>
    <li :class="{ disabled: !canNext }">
      <a role="button" aria-label="Next" @click.prevent="selectPage(page + 1)">
        <i :class="pagerRightArrowIcon"></i>
      </a>
    </li>
    <li :class="{ disabled: !canLast }" v-if="totalPages">
      <a role="button" aria-label="Last" @click.prevent="selectPage(totalPages)">
        <i :class="pagerNextIcon"></i>
      </a>
    </li>
  </ul>
</template>

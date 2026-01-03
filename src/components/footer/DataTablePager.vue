<script setup lang="ts">
import { computed, toRefs } from 'vue';

interface Props {
  pagerLeftArrowIcon?: string;
  pagerRightArrowIcon?: string;
  pagerPreviousIcon?: string;
  pagerNextIcon?: string;
  
  page?: number;        // Current page, 1-based
  size?: number;        // Rows per page
  count?: number;       // Total rows
  pagerComponent?: any; // Custom pager component
}

const props = withDefaults(defineProps<Props>(), {
  page: 1,
  size: 0,
  count: 0,
  pagerLeftArrowIcon: 'datatable-icon-left',
  pagerRightArrowIcon: 'datatable-icon-right',
  pagerPreviousIcon: 'datatable-icon-prev',
  pagerNextIcon: 'datatable-icon-skip'
});

const emit = defineEmits(['change']);

const { page, size, count } = toRefs(props);

const totalPages = computed(() => {
  const s = size.value;
  const c = count.value;
  if (s < 1 || c < 1) return 1;
  return Math.ceil(c / s);
});

const pages = computed(() => {
  const cur = page.value;
  const total = totalPages.value;
  const max = 5;
  
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
const canNext = computed(() => page.value < totalPages.value);

const selectPage = (p: number) => {
  if (p < 1 || p > totalPages.value || p === page.value) return;
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
    <li 
      v-for="pg in pages" 
      :key="pg" 
      :class="{ active: pg === page }"
    >
      <a role="button" @click.prevent="selectPage(pg)">
        {{ pg }}
      </a>
    </li>
    <li :class="{ disabled: !canNext }">
      <a role="button" aria-label="Next" @click.prevent="selectPage(page + 1)">
        <i :class="pagerRightArrowIcon"></i>
      </a>
    </li>
    <li :class="{ disabled: !canNext }">
      <a role="button" aria-label="Last" @click.prevent="selectPage(totalPages)">
        <i :class="pagerNextIcon"></i>
      </a>
    </li>
  </ul>
</template>

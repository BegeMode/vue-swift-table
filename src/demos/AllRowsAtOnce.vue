<script setup lang="ts">
import { ref, watch } from 'vue';
import DataTable from '@/components/DataTable.vue';
import type { TableColumn } from '@/types/table-column.type';
import { load10k } from './dataLoader';

const infiniteScroll = ref(false);
const totalPages = ref(100);

const savedTotalPages = localStorage.getItem('allRowsAtOnce::totalPages');
if (savedTotalPages) {
  totalPages.value = parseInt(savedTotalPages);
}

const savedInfiniteScroll = localStorage.getItem('allRowsAtOnce::infiniteScroll');
if (savedInfiniteScroll) {
  infiniteScroll.value = savedInfiniteScroll === 'true';
}

watch(totalPages, () => {
  localStorage.setItem('allRowsAtOnce::totalPages', totalPages.value.toString());
});

watch(infiniteScroll, () => {
  localStorage.setItem('allRowsAtOnce::infiniteScroll', infiniteScroll.value.toString());
});

const columns = ref<TableColumn[]>([
  { prop: 'id', name: 'ID', width: 80, resizeable: true, sortable: true },
  { prop: 'name', name: 'Name', width: 200, resizeable: true, sortable: true },
  {
    prop: 'age',
    name: 'Age',
    width: 100,
    resizeable: true,
    sortable: true,
    summaryFunc: (cells: unknown[]) => {
      const nums = cells.filter(c => typeof c === 'number') as number[];
      if (!nums.length) return 'Avg 0';
      const sum = nums.reduce((a, b) => a + b, 0);
      return `Avg ${(sum / nums.length).toFixed(1)}`;
    },
  },
  { prop: 'email', name: 'Email', width: 250, resizeable: true, sortable: true },
  { prop: 'company', name: 'Company', width: 200, resizeable: true, sortable: true },
  { prop: 'address', name: 'Address', width: 300, resizeable: true, sortable: false },
]);

const getPageRows = async (_page: number): Promise<{ rows: Array<Record<string, unknown>>; allRows: boolean }> => {
  const rows = (await load10k()) ?? [];
  return {
    rows,
    allRows: true,
  };
};
</script>

<template>
  <div class="demo-wrapper">
    <div class="header-params">
      <h2>All rows at once</h2>
      <div class="controls">
        <label><input type="checkbox" v-model="infiniteScroll" /> Infinite Scroll</label>
        <label>Total pages: <input type="number" v-model="totalPages" :min="1" :max="10000" /></label>
      </div>
    </div>

    <div class="table-wrapper">
      <DataTable
        :infiniteScroll="infiniteScroll"
        :getPageRows="getPageRows"
        :columns="columns"
        :headerHeight="50"
        :rowHeight="50"
        :totalPages="totalPages"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.demo-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.header-params {
  padding: 10px;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
  font-size: 14px;

  label {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .control-row {
    display: flex;
    gap: 10px;
  }
}
.table-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 10px;
  background: white;
}
.dark-wrapper {
  background: #1a1e28;
}
</style>

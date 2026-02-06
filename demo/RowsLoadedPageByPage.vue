<script setup lang="ts">
import { ref, watch } from 'vue';
import { VueSwiftTable, type TableColumn, type ISortPropDir } from '@/index';
import { loadPage10k, type TSort } from './dataLoader';

const infiniteScroll = ref(false);
const startPage = ref(1);
const pageSize = ref(20);
const search = ref('');
const sorts = ref<ISortPropDir[]>([]);
const table = ref<InstanceType<typeof VueSwiftTable> | null>(null);

const savedPageSize = localStorage.getItem('rowsLoadedPageByPage::pageSize');
if (savedPageSize) {
  pageSize.value = parseInt(savedPageSize);
}

const savedInfiniteScroll = localStorage.getItem('rowsLoadedPageByPage::infiniteScroll');
if (savedInfiniteScroll) {
  infiniteScroll.value = savedInfiniteScroll === 'true';
}

const savedStartPage = localStorage.getItem('rowsLoadedPageByPage::startPage');
if (savedStartPage) {
  startPage.value = parseInt(savedStartPage);
}

watch(pageSize, () => {
  localStorage.setItem('rowsLoadedPageByPage::pageSize', pageSize.value.toString());
});

watch(infiniteScroll, () => {
  localStorage.setItem('rowsLoadedPageByPage::infiniteScroll', infiniteScroll.value.toString());
});

watch(startPage, () => {
  localStorage.setItem('rowsLoadedPageByPage::startPage', startPage.value.toString());
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

const getPageRows = async (page: number): Promise<{ rows: Array<Record<string, unknown>>; isLast: boolean }> => {
  const rows = (await loadPage10k(page, pageSize.value, search.value, sorts.value, 500)) ?? [];
  return {
    rows,
    isLast: !rows.length || rows.length < pageSize.value,
  };
};

const onPage = (event: { page: number }) => {
  console.log('onPage', event.page);
};

const onSort = (payload: ISortPropDir[]) => {
  console.log('onSort', payload);
  sorts.value = payload satisfies TSort[];
  table.value?.refresh(startPage.value);
};

watch(search, () => {
  table.value?.refresh();
});
</script>

<template>
  <div class="demo-wrapper">
    <div class="header-params">
      <h2>All rows at once</h2>
      <div class="controls">
        <label><input type="checkbox" v-model="infiniteScroll" /> Infinite Scroll</label>
        <label>Page size: <input type="number" v-model="pageSize" :min="1" max="1000" /></label>
        <label>Start page: <input type="number" v-model="startPage" :min="1" max="1000" /></label>
        <label>Search: <input type="text" v-model="search" /></label>
      </div>
    </div>

    <div class="table-wrapper">
      <vue-swift-table
        ref="table"
        :infiniteScroll="infiniteScroll"
        :getPageRows="getPageRows"
        :columns="columns"
        :headerHeight="50"
        :rowHeight="50"
        :page="startPage"
        :externalSorting="true"
        @page="onPage"
        @sort="onSort"
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

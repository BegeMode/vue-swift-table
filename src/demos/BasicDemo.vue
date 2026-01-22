<script setup lang="ts">
import { ref, watch } from 'vue';
import { VueSwiftTable, type TableColumn, type SelectionType } from '@/index';
import { loadPage10k } from './dataLoader';

// Mock Data Generation
// const generateData = (count: number) => {
//   return Array.from({ length: count }, (_, i) => ({
//     id: i,
//     name: `Name ${i}`,
//     age: 20 + (i % 50),
//     email: `user${i}@example.com`,
//     company: `Company ${i % 10}`,
//     address: `Address ${i} Street`,
//   }));
// };

const table = ref<InstanceType<typeof VueSwiftTable> | null>(null);
const infiniteScroll = ref(false);

// Pagination State
const limit = ref(250);
const footerHeight = ref(50);
const groupRowsBy = ref<string[]>([]);
const summaryRow = ref(false);
const summaryPosition = ref<'top' | 'bottom'>('top');
const search = ref('');

// Selection State
const selectionType = ref<SelectionType>('single');
const selected = ref([]);
const theme = ref('material');

const onSelect = (event: any) => {
  console.log('Select Event:', event);
  selected.value = event.selected;
};

const onPage = (event: any) => {
  console.log('Page Event:', event);
};

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
  let rows = (await loadPage10k(page, limit.value, search.value, 200)) ?? [];
  return {
    rows,
    isLast: !rows.length || rows.length < limit.value,
  };
};

watch(search, () => {
  table.value?.refresh();
});

const onSort = (event: Array<{ prop: string; dir: 'asc' | 'desc' }>) => {
  console.log('Sort Event:', event);
};

const onScroll = (_e: Event) => {
  // console.log('Scroll:', (e.target as HTMLElement).scrollTop);
};

const onReorder = (newColumns: TableColumn[]) => {
  columns.value = newColumns;
  console.log(
    'Columns reordered:',
    newColumns.map(c => c.name)
  );
};
</script>

<template>
  <div class="demo-wrapper">
    <div class="header-params">
      <h2>Basic Demo</h2>
      <div class="controls">
        <label><input type="checkbox" v-model="infiniteScroll" /> Infinite Scroll</label>
        <label>Page Size: <input type="number" v-model="limit" /></label>
        <label>Footer Height: <input type="number" v-model="footerHeight" /></label>
        <div class="control-row">
          <label>
            Selection:
            <select v-model="selectionType">
              <option value="">None</option>
              <option value="single">Single</option>
              <option value="multi">Multi (Ctrl/Cmd)</option>
              <option value="multiClick">Multi Click</option>
              <option value="checkbox">Checkbox</option>
            </select>
          </label>
          <label>
            Theme:
            <select v-model="theme">
              <option value="material">Material</option>
              <option value="dark">Dark</option>
              <option value="bootstrap">Bootstrap</option>
            </select>
          </label>
        </div>
        <span style="font-size: 0.9em">Selected: {{ selected.length }}</span>
        <button @click="groupRowsBy = groupRowsBy.length ? [] : ['company']">Toggle Grouping (Company)</button>
        <div class="control-row">
          <label> <input type="checkbox" v-model="summaryRow" /> Summary Row </label>
          <label>
            Summary Position:
            <select v-model="summaryPosition">
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>
        </div>
        <label>Search: <input type="text" v-model="search" /></label>
      </div>
    </div>

    <div class="table-wrapper" :class="theme === 'dark' ? 'dark-wrapper' : ''">
      <vue-swift-table
        ref="table"
        :infiniteScroll="infiniteScroll"
        :getPageRows="getPageRows"
        :columns="columns"
        :headerHeight="50"
        :rowHeight="50"
        :height="600"
        :pageSize="limit"
        :footerHeight="footerHeight"
        :selectionType="selectionType"
        :selected="selected"
        :theme="theme"
        :groupRowsBy="groupRowsBy"
        :summaryRow="summaryRow"
        :summaryPosition="summaryPosition"
        sortType="multi"
        reorderable
        @select="onSelect"
        @reorder="onReorder"
        @sort="onSort"
        @scroll="onScroll"
        @page="onPage"
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

<script setup lang="ts">
import { ref } from 'vue';
import DataTable from './components/DataTable.vue';
import type { TableColumn } from './types/table-column.type';

// Mock Data Generation
const generateData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Name ${i}`,
    age: 20 + (i % 50),
    email: `user${i}@example.com`,
    company: `Company ${i % 10}`,
    address: `Address ${i} Street`
  }));
};

const rows = ref(generateData(100)); // Reduce for pagination test

// Pagination State
const limit = ref(10);
const footerHeight = ref(50);
const externalPaging = ref(false);

import type { SelectionType } from './types/selection.type';

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
  { prop: 'age', name: 'Age', width: 100, resizeable: true, sortable: true },
  { prop: 'email', name: 'Email', width: 250, resizeable: true, sortable: true },
  { prop: 'company', name: 'Company', width: 200, resizeable: true, sortable: true },
  { prop: 'address', name: 'Address', width: 300, resizeable: true, sortable: false },
]);

const onSort = (event: any) => {
  console.log('Sort Event:', event);
  const { column } = event;
  const prop = column.prop as string;
  
  rows.value.sort((a: any, b: any) => {
    if (a[prop] < b[prop]) return -1;
    if (a[prop] > b[prop]) return 1;
    return 0;
  });
  
  // Trigger update (Vue 3 ref internal mutation might need a trigger if deep watch isn't on, 
  // but array sort usually triggers reactive update)
  rows.value = [...rows.value];
};

const onScroll = (e: Event) => {
  // Console log mostly for debugging, to see if virtual scroll events fire efficiently
  // console.log('Scroll:', (e.target as HTMLElement).scrollTop);
};

const onReorder = (newColumns: TableColumn[]) => {
  columns.value = newColumns;
  console.log('Columns reordered:', newColumns.map(c => c.name));
};

</script>

<template>
  <div class="app-container" :class="{'dark-mode': theme === 'dark'}">
    <div class="header-params">
      <h1>Vue Swift Table Demo</h1>
      <div class="controls">
         <label>Page Size: <input type="number" v-model="limit" /></label>
         <label>Footer Height: <input type="number" v-model="footerHeight" /></label>
         <label><input type="checkbox" v-model="externalPaging" /> Server-side Paging</label>
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
         <span>Selected: {{ selected.length }}</span>
      </div>
      <p>Rows: {{ rows.length }} | Virtualization: ON</p>
    </div>

    <!-- Container must have height for the table to calculate viewport -->
    <div class="table-wrapper">
      <DataTable
        :rows="rows"
        :columns="columns"
        :headerHeight="50"
        :rowHeight="50"
        :height="600"
        @sort="onSort"
        @scroll="onScroll"
        @page="onPage"
        :pageSize="limit"
        :footerHeight="footerHeight"
        :externalPaging="externalPaging"
        :selectionType="selectionType"
        :selected="selected"
        @select="onSelect"
        @reorder="onReorder"
        :theme="theme"
      />
    </div>
  </div>
</template>

<style lang="scss">
@import "./styles/index.scss";

body {
  margin: 0;
  padding: 0;
  background-color: #f5f7fa;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  transition: background-color 0.3s;
  
  &.dark-mode {
      background-color: #1a1e28;
      color: #fff;
  }
}

.header-params {
  margin-bottom: 20px;
}

.table-wrapper {
  flex: 1;
  background: white;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border-radius: 8px;
  overflow: hidden;
  max-height: 650px; // Slightly larger than table height to show container
}
</style>

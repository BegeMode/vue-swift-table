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

const rows = ref(generateData(10000)); // Generate 10k rows for stress testing virtualization

const columns: TableColumn[] = [
  { prop: 'id', name: 'ID', width: 80, resizeable: true, sortable: true },
  { prop: 'name', name: 'Name', width: 200, resizeable: true, sortable: true },
  { prop: 'age', name: 'Age', width: 100, resizeable: true, sortable: true },
  { prop: 'email', name: 'Email', width: 250, resizeable: true, sortable: true },
  { prop: 'company', name: 'Company', width: 200, resizeable: true, sortable: true },
  { prop: 'address', name: 'Address', width: 300, resizeable: true, sortable: false },
];

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

</script>

<template>
  <div class="app-container">
    <div class="header-params">
      <h1>Vue Swift Table Demo</h1>
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

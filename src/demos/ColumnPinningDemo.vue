<script setup lang="ts">
import { ref } from 'vue';
import { VueSwiftTable, type TableColumn } from '@/index';

// Mock Data
const rows = Array.from({ length: 50 }, (_, i) => ({
  name: `Person ${i}`,
  gender: i % 2 === 0 ? 'Male' : 'Female',
  age: 20 + (i % 40),
  email: `person${i}@example.com`,
  phone: `555-01${i.toString().padStart(2, '0')}`,
  address: `${i} Main St, Cityville, State, 12345`,
  company: `Company ${i}`,
  zip: `1234${i}`,
  country: 'USA',
}));

const columns = ref<TableColumn[]>([
  { prop: 'name', name: 'Name (Pinned Left)', width: 200, frozenLeft: true },
  { prop: 'gender', name: 'Gender', width: 100 },
  { prop: 'age', name: 'Age', width: 80 },
  { prop: 'email', name: 'Email', width: 250 },
  { prop: 'phone', name: 'Phone', width: 150 },
  { prop: 'address', name: 'Address', width: 300 },
  { prop: 'zip', name: 'Zip', width: 100 },
  { prop: 'country', name: 'Country', width: 150 },
  { prop: 'company', name: 'Company (Pinned Right)', width: 200, frozenRight: true },
]);

const getPageRows = (_page: number): Promise<{ rows: Array<Record<string, unknown>>; isLast: boolean }> => {
  return Promise.resolve({
    rows,
    isLast: true,
  });
};
</script>

<template>
  <div class="demo-wrapper">
    <div class="header-params">
      <h2>Column Pinning / Frozen Columns</h2>
      <p>
        Columns can be pinned to the left or right. Scroll horizontally to see the effect. "Name" is pinned left,
        "Company" is pinned right.
      </p>
    </div>

    <div class="table-wrapper">
      <vue-swift-table
        :getPageRows="getPageRows"
        :columns="columns"
        :rowHeight="50"
        :headerHeight="50"
        class="material"
        :height="500"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.demo-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 1000px;
}
.header-params {
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}
.table-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 10px;
}
</style>

<script setup lang="ts">
import { ref } from 'vue';
import DataTable from '@/components/DataTable.vue';
import type { TableColumn } from '@/types/table-column.type';

const rows = Array.from({ length: 15 }, (_, i) => ({
  name: `User ${i}`,
  gender: i % 2 === 0 ? 'male' : 'female',
  age: 20 + (i % 60),
}));

const getPageRows = (_page: number): Promise<{ rows: Array<Record<string, unknown>>; isLast: boolean }> => {
  return Promise.resolve({
    rows,
    isLast: true,
  });
};

const columns = ref<TableColumn[]>([
  { prop: 'name', name: 'Name', width: 200 },
  { prop: 'gender', name: 'Gender', width: 250 },
  { prop: 'age', name: 'Age', width: 150 },
]);
</script>

<template>
  <div class="demo-wrapper">
    <div class="header-params">
      <h2>Expressive Templates Demo</h2>
      <p>
        Uses <code>&lt;template #header-name&gt;</code> and <code>&lt;template #col-name&gt;</code> to customize
        content.
      </p>
    </div>

    <div class="table-wrapper">
      <DataTable :getPageRows="getPageRows" :columns="columns" :rowHeight="60" :headerHeight="50" class="material">
        <!-- Header Templates -->
        <template #header-name="{ column }">
          <span>Holla! {{ column.name }}</span>
        </template>

        <template #header-gender="{ column }">
          <span>{{ column.name }} (Icon) <span style="font-size: 1.2em">♀♂</span></span>
        </template>

        <!-- Body Templates -->
        <template #col-name="{ row }">
          <span v-if="row"
            >Hi: <strong>{{ row.name }}</strong></span
          >
        </template>

        <template #col-gender="{ row }">
          <div v-if="row">
            My name is: <i>{{ row.name }}</i> and <i>{{ row.gender }}</i>
            <br />
            <small>Knock Knock</small>
          </div>
        </template>

        <template #col-age="{ row }">
          <div v-if="row" style="width: 100%; height: 40px; border: solid 1px #ddd; padding: 3px; position: relative">
            <div
              style="background: #999; height: 100%; position: absolute; top: 0; left: 0"
              :style="{ width: row.age + '%' }"
            ></div>
            <span style="position: relative; z-index: 1; padding: 5px">{{ row.age }}</span>
          </div>
        </template>
      </DataTable>
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
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}
.table-wrapper {
  flex: 1;
  padding: 10px;
  overflow: hidden;
}
</style>

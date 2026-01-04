<script setup lang="ts">
import { ref, computed } from 'vue';
import DataTable from '../components/DataTable.vue';
import type { TableColumn } from '../types/table-column.type';

// Mock Data
const rows = ref(
  Array.from({ length: 50 }, (_, i) => ({
    id: i,
    name: `Person ${i}`,
    gender: i % 2 === 0 ? 'Male' : 'Female',
    age: 20 + (i % 40),
    company: `Company ${i}`,
    address: `123 St, City ${i}`,
  }))
);

const table = ref();
// const expanded = ref<any[]>([]);

const toggleExpandRow = (row: any) => {
  if (table.value) {
    table.value.toggleExpandDetail(row);
  }
};

const onDetailToggle = (event: any) => {
  console.log('Detail Toggled', event);
};

const isMobile = ref(false);

const columns = computed(() => {
  const cols: TableColumn[] = [
    {
      prop: 'expanded',
      name: '',
      width: 50,
      sortable: false,
      resizeable: false,
      frozenLeft: true,
    },
    { prop: 'name', name: 'Name', width: 200 },
  ];

  if (!isMobile.value) {
    cols.push(
      { prop: 'gender', name: 'Gender', width: 100 },
      { prop: 'age', name: 'Age', width: 80 },
      { prop: 'company', name: 'Company', width: 200 }
    );
  }

  return cols;
});
</script>

<template>
  <div class="demo-wrapper">
    <div class="header-params">
      <h2>Row Detail / Responsive Demo</h2>
      <p>
        This demo shows how to use the Row Detail feature. Toggle "Mobile Mode" to hide columns and see them in the
        detail view instead.
      </p>
      <div class="controls">
        <button @click="isMobile = !isMobile">Toggle Mobile Mode ({{ isMobile ? 'ON' : 'OFF' }})</button>
      </div>
    </div>

    <div class="table-wrapper">
      <DataTable
        ref="table"
        :rows="rows"
        :columns="columns"
        :rowHeight="50"
        :rowDetailHeight="100"
        class="material expandable"
        columnMode="force"
        @detail-toggle="onDetailToggle"
      >
        <!-- Expanded Toggle Column Template -->
        <!-- We use a slot for the 'expanded' column content if we want custom cell -->
        <template #col-expanded="{ row, expanded }">
          <a
            href="#"
            class="expand-icon"
            :class="{ 'datatable-icon-right': !expanded, 'datatable-icon-down': expanded }"
            title="Expand/Collapse Row"
            @click.prevent="toggleExpandRow(row)"
          >
          </a>
        </template>

        <!-- Use body cell slot for custom expander if generic column slot not working yet 
             Wait, currently DataTableBodyCell uses basic rendering. 
             If we want custom cell templates, we need to implement slots in DataTableBodyCell.
             For now, let's assume standard cell rendering, but wait...
             The prompt implies porting features. 
             Does DataTableBodyCell support slots? 
             Let's check DataTableBodyCell.vue.
        -->

        <!-- Row Detail Template -->
        <template #rowDetail="{ row }">
          <div class="detail-content">
            <div v-if="isMobile">
              <strong>Hidden Columns (Mobile):</strong>
              <div>Gender: {{ row.gender }}</div>
              <div>Age: {{ row.age }}</div>
              <div>Company: {{ row.company }}</div>
            </div>
            <div v-else>
              <strong>Extra Details:</strong>
              <div>Address: {{ row.address }}</div>
              <div>ID: {{ row.id }}</div>
            </div>
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
  overflow: hidden;
  padding: 10px;
}
.detail-content {
  padding: 10px 20px;
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
  height: 100%;
  box-sizing: border-box;
  font-size: 14px;
}
.expand-icon {
  text-decoration: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  text-decoration: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  text-align: center;
}
</style>

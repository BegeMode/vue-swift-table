<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import BasicDemo from './demos/BasicDemo.vue';
import RowDetailDemo from './demos/RowDetailDemo.vue';
import ColumnPinningDemo from './demos/ColumnPinningDemo.vue';
import TemplateDemo from './demos/TemplateDemo.vue';
import AllRowsAtOnceDemo from './demos/AllRowsAtOnce.vue';
import RowsLoadedPageByPageDemo from './demos/RowsLoadedPageByPage.vue';

const tabs = [
  { name: 'Basic Features', component: BasicDemo },
  { name: 'All Rows At Once', component: AllRowsAtOnceDemo },
  { name: 'Rows Loaded Page By Page', component: RowsLoadedPageByPageDemo },
  { name: 'Row Detail & Responsive', component: RowDetailDemo },
  { name: 'Column Pinning', component: ColumnPinningDemo },
  { name: 'Templates / Slots', component: TemplateDemo },
];

const currentTab = shallowRef(tabs[0]!.component);
const activeIndex = ref(0);

const selectTab = (index: number) => {
  if (!tabs[index]) return;
  activeIndex.value = index;
  currentTab.value = tabs[index].component;
};
</script>

<template>
  <div class="app-shell">
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>Vue Swift Table</h3>
      </div>
      <ul class="nav">
        <li
          v-for="(tab, index) in tabs"
          :key="index"
          :class="{ active: activeIndex === index }"
          @click="selectTab(index)"
        >
          {{ tab.name }}
        </li>
      </ul>
    </div>
    <div class="main-content">
      <component :is="currentTab" />
    </div>
  </div>
</template>

<style lang="scss">
@use './styles/index.scss';

body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f5f7fa;
}

.app-shell {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .sidebar-header {
    padding: 20px;
    background: #1a252f;
    h3 {
      margin: 0;
      color: #42b983;
    }
  }

  .nav {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      padding: 15px 20px;
      cursor: pointer;
      border-bottom: 1px solid #34495e;
      transition: background 0.2s;

      &:hover {
        background: #34495e;
      }

      &.active {
        background: #42b983;
        color: white;
      }
    }
  }
}

.main-content {
  flex: 1;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
}
</style>

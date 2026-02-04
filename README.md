# vue-swift-table

A high-performance, lightweight, and flexible data table component for **Vue 3**, built with **TypeScript** and **Vite**. Engineered for speed, it efficiently handles large datasets using virtual scrolling.

[![npm version](https://img.shields.io/npm/v/vue-swift-table.svg)](https://www.npmjs.com/package/vue-swift-table)
[![license](https://img.shields.io/npm/l/vue-swift-table.svg)](https://github.com/BegeMode/vue-swift-table/blob/main/LICENSE)

## Features

- ⚡ **High Performance**: Smoothly handles 10,000+ rows using virtual scrolling.
- 🌲 **Tree View Support**: Display hierarchical data with ease.
- 📍 **Column Pinning**: Pin columns to the left or right.
- 🎨 **Theming**: Comes with Material, Dark, and Bootstrap themes.
- 🛠 **Customizable**: Extensive slot support for cells, headers, and footers.
- 🔢 **Sorting & Filtering**: Built-in support for single/multi-column sorting and client-side filtering.
- 🖱 **Selection**: Single, multiple, and checkbox-based row selection.
- 🏗 **TypeScript Support**: Fully typed for a great developer experience.

## Installation

```bash
npm install vue-swift-table
# or
pnpm add vue-swift-table
# or
yarn add vue-swift-table
```

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VueSwiftTable, type TableColumn } from 'vue-swift-table';
import 'vue-swift-table/style.css';

const columns = ref<TableColumn[]>([
  { prop: 'id', name: 'ID', width: 80 },
  { prop: 'name', name: 'Name', width: 200 },
  { prop: 'email', name: 'Email', width: 250 },
]);

// Example row loader (can be async)
const getPageRows = async (page: number) => {
  const rows = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    // ... more rows
  ];
  return {
    rows,
    isLast: true, // Set to false if more pages are available
  };
};
</script>

<template>
  <div style="height: 600px;">
    <vue-swift-table
      :columns="columns"
      :getPageRows="getPageRows"
      :rowHeight="50"
      :headerHeight="50"
      theme="material"
    />
  </div>
</template>
```

## Development

If you want to contribute or explore the demos:

1. **Clone the repo**:

   ```bash
   git clone https://github.com/BegeMode/vue-swift-table.git
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Run the demo app**:

   ```bash
   pnpm dev
   ```

4. **Build the library**:
   ```bash
   pnpm build:lib
   ```

## License

MIT © [BegeMode](https://github.com/BegeMode)

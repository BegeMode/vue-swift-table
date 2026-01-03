# Tasks for Next Development Phase

The following tasks are remaining for the `vue-swift-table` port.
Context: **Virtualization**, **Pagination**, **Selection**, and **Column Resizing** are fully implemented and verified.

## 1. Column Reordering (Completed)

**Goal**: Allow users to reorder columns by dragging headers.

**Details**:

- Implemented Drag'n'Drop API in `DataTableHeader.vue`.
- Added `reorder` event in `DataTable.vue`.
- visual marker and state management implemented.

## 2. Styles and Themes (Completed)

**Goal**: Polish styles and ensure theme support.

**Details**:

- Verified `dark` and `bootstrap` themes.
- Confirmed icon classes in `icons.css`.
- Added theme switcher to Demo (`App.vue`).

## Status Summary

- [x] **Pagination**: Implemented (Client/Server support, Footer component).
- [x] **Selection**: Implemented (Single, Multi, Checkbox, Select All).
- [x] **Column Resizing**: Implemented (Drag handles, Reactive state).
- [x] **Column Reordering**: Implemented.
- [x] **Styles**: Verified themes (Dark, Bootstrap, Material).

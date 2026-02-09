# Changelog

All notable changes to this project will be documented in this file.

## [0.2.5] - 2026-02-09

### Added

- Horizontal scrolling support for the table body, including synchronization for group headers and summary rows.

### Fixed

- Horizontal scroll synchronization between header, body, and summary rows.
- Pagination controls reactivity: ensure `next` and `last` buttons correctly update their state when data changes.

### Refactored

- Isolated internal column properties into `InternalTableColumn`, refining the public `TableColumn` interface.
- Improved path aliases usage for internal type imports.

## [0.2.4] - 2026-02-08

### Fixed

- Text truncation (ellipsis) in header and body cells.
- CSS consistency across different themes (Material, Bootstrap, Dark).

### Refactored

- Consolidated structural table styles into a single source of truth (`datatable.component.scss`).
- Removed redundant scoped styles from Vue components for better maintainability.

## [0.2.0] - 2026-02-06

### Added

- Progress bars when loading data.

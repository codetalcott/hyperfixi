# Changelog

All notable changes to @lokascript/core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Superseded by the root changelog.** Every package in this monorepo publishes
> in lockstep at the root version, and the entries below use an older
> per-package numbering that no published version ever matched. They are kept
> for the migration notes they carry; they are not a record of recent releases.
> **For anything since, see
> [the monorepo CHANGELOG](https://github.com/codetalcott/hyperfixi/blob/main/CHANGELOG.md)**
> and [GitHub Releases](https://github.com/codetalcott/hyperfixi/releases).

## [2.1.0] - 2025-01-25

### Added

- **Fixi.js compatibility** in hybrid-hx bundle
  - `fx-action`, `fx-method`, `fx-trigger`, `fx-target`, `fx-swap`, `fx-ignore` attributes
  - Full fixi event lifecycle: `fx:init`, `fx:config`, `fx:before`, `fx:after`, `fx:error`, `fx:finally`, `fx:swapped`
  - Request dropping (anti-double-submit) - new requests dropped while one is pending
  - `fx-ignore` attribute to exclude elements from processing

## [2.0.0] - 2025-01-19

### Added

- Complete hyperscript runtime with 43 command implementations
- Full AST parser with ~3800 lines of parsing logic
- Multilingual support via semantic parser integration
- TypeScript-first API with comprehensive type safety
- Multiple bundle options: lite (8KB), hybrid-complete (28KB), full (912KB)
- Custom bundle generator for tree-shaking
- Command pattern architecture for extensibility
- Expression system with 6 categories (references, logical, conversion, positional, properties, special)
- Unified `MultilingualHyperscript` API for 23 languages
- Debug control system with persistent localStorage
- Event metadata tracking and debugging tools
- htmx compatibility layer with lifecycle events
- Comprehensive test suite (4045+ tests passing)

### Changed

- Refactored from version 1.x to 2.0 with breaking API changes
- Improved parser performance and error messages
- Enhanced TypeScript types with conditional environment types
- Updated bundle generation strategy for better tree-shaking

### Fixed

- Event handler binding with correct addEventListener signature
- Expression evaluation in various contexts
- Memory leaks in event listeners
- Edge cases in command execution

## [1.x] - Previous Versions

See git history for changes in 1.x versions.

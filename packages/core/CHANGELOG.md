# Changelog

All notable changes to @hyperfixi/core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## 🚀 Current Development Status

**Phase 3 Complete**: Expression System Implementation ✅\
**Overall Progress**: 75% Complete\
**Test Results**: 388 tests passing (100% success rate)

📋 **For comprehensive project status and development context**: See
[Development Plan](roadmap/plan.md)

## Project Overview

**Current Focus**: HyperFixi has evolved from a simple _hyperscript + fixi.js
integration into a comprehensive **hyperscript expression evaluation engine**.
The project now implements a complete expression system that handles all
documented hyperscript patterns with full TypeScript type safety and
comprehensive testing.

**Original Vision**: Bridge between _hyperscript and fixi.js - two minimalist
web development libraries\
**Current Reality**: Production-ready hyperscript expression system with 388
passing tests

## Current Architecture (Phase 3)

### Expression System Components

- **src/expressions/** - Complete hyperscript expression evaluation system
  - **references/** - `me`, `you`, `it`, CSS selectors, DOM querying (44 tests)
  - **logical/** - Comparisons, boolean logic, pattern matching (64 tests)
  - **conversion/** - `as` keyword, type conversions, form processing (40 tests)
  - **positional/** - `first`, `last`, array/DOM navigation (52 tests)
  - **properties/** - Possessive syntax, attribute access (59 tests)
  - **special/** - Literals, mathematical operations (66 tests)
  - **integration tests** - Real-world usage patterns (63 tests)

### Core Infrastructure

- **src/types/core.ts** - TypeScript type definitions for expression system
- **src/test-setup.ts** - Vitest testing infrastructure with Happy-DOM
- **rollup.config.mjs** - Build configuration for dual ES/UMD output

### Build System

The project uses Rollup with TypeScript to create two output formats:

- **dist/hyperscript-fixi.mjs** - ES module for modern bundlers
- **dist/hyperscript-fixi.min.js** - UMD bundle for script tags (with global
  `hyperscriptFixi`)

Both outputs include source maps and the UMD version is minified with Terser.

### Expression System Pattern

The project implements a complete hyperscript expression evaluation system with
6 categories of expressions:

1. **Reference Expressions** - Context and DOM element access:

   ```hyperscript
   me                    # Current element
   my data-value        # Element attributes  
   closest <form/>      # DOM traversal
   <button/>            # CSS selector queries
   ```

2. **Property Access** - Possessive syntax and attribute handling:

   ```hyperscript
   element's property   # Possessive syntax
   my className        # Element properties
   @data-value         # Attribute access
   ```

3. **Type Conversion** - The `as` keyword with comprehensive conversions:

   ```hyperscript
   "123" as Int        # Type conversion
   form as Values      # Form processing
   data as JSON        # JSON handling
   ```

4. **Logical Operations** - Comparisons and boolean logic:

   ```hyperscript
   value > 5           # Comparisons
   element matches .class  # CSS matching
   collection contains item  # Membership
   ```

5. **Mathematical Operations** - Arithmetic with proper precedence:

   ```hyperscript
   (value + 5) * 2     # Mathematical expressions
   array.length mod 3  # Modulo operations
   ```

## Development Commands

### Testing (Current Primary Development Activity)

```bash
npm test                                    # Run all 388 tests
npm test src/expressions/                  # Run expression system tests
npm test src/expressions/integration.test.ts  # Run integration tests
npm run test:watch                         # Watch mode for development
npm run test:coverage                      # Generate coverage reports
```

### Build

```bash
npm run build          # Build ES + UMD outputs
npm run typecheck      # TypeScript validation  
npm run lint           # Code quality checks
npm run lint:fix       # Auto-fix linting issues
```

### Development Workflow

```bash
# Current development pattern (Phase 3 Complete)
1. Write comprehensive tests first (TDD approach)
2. Implement expression logic to pass tests  
3. Validate with integration tests
4. Ensure 100% TypeScript compliance
```

## Current Project Philosophy (Phase 3)

The project has evolved to focus on **robust, comprehensive hyperscript
expression evaluation**:

- **Type Safety First** - Strict TypeScript with comprehensive type definitions
- **Test-Driven Development** - 388 tests ensuring reliability and correctness
- **Modular Architecture** - Tree-shakable expression categories for optimal
  bundle size
- **LSP Compliance** - All documented hyperscript patterns implemented and
  validated
- **Production Ready** - 100% test pass rate with real-world usage validation

## Key Files for Current Development

### Core Implementation

- **src/types/core.ts** - Expression system type definitions
- **src/expressions/\*/index.ts** - Expression category implementations
- **src/test-setup.ts** - Testing infrastructure and utilities

### Documentation & Planning

- **[roadmap/plan.md](roadmap/plan.md)** - 📋 **Dynamic context memory store for
  development**
- **PHASE_3_SUMMARY.md** - Comprehensive implementation summary
- **INTEGRATION_TESTS_SUMMARY.md** - Integration testing results and patterns

### Testing & Validation

- **src/expressions/\*/index.test.ts** - Unit tests for each expression category
- **src/expressions/integration\*.test.ts** - Real-world usage pattern tests

## Current Testing Infrastructure

The project uses modern testing practices:

- **Vitest** - Fast, modern test runner with TypeScript support
- **Happy-DOM** - Browser environment simulation for DOM testing
- **388 comprehensive tests** - 100% pass rate across all expression categories
- **Integration testing** - Real-world hyperscript usage patterns validated
- **Performance testing** - Large dataset handling (1000+ elements tested)

## Expression System Integration Notes

- **Async-first architecture** - All expressions return Promises for consistency
- **Modular design** - Each expression category independently importable
- **Comprehensive validation** - Runtime argument checking with descriptive
  errors
- **Context-aware evaluation** - Proper handling of `me`, `you`, `it` contexts
- **DOM integration** - Full CSS selector support and DOM manipulation
  capabilities
- **Form processing** - Complete form value extraction and type conversion

## Next Development Phase

**Phase 4 Priority**: Parser & Runtime Integration

- Hyperscript syntax parser (tokenization, AST generation)
- Runtime expression evaluator connecting parser to expression system
- Event system integration for `on click` style event handling
- DOM manipulation commands (`put`, `add`, `remove`, etc.)

For detailed development context and next steps, see
**[Development Plan](roadmap/plan.md)**.

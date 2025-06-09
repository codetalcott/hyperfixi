# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HyperFixi is a TypeScript-based project that creates a bridge between _hyperscript and fixi.js - two minimalist web development libraries. The project implements custom hyperscript commands that integrate with fixi's hypermedia control patterns, allowing for declarative AJAX interactions within hyperscript's event-driven syntax.

## Architecture

### Core Components

- **src/index.ts** - Main entry point that extends _hyperscript with custom `fetch` commands
- **hyperscript/** - Contains the _hyperscript library files and type definitions
- **fixi/** - Contains the fixi.js library (minimalist hypermedia controls)
- **rollup.config.mjs** - Build configuration for dual ES/UMD output

### Build System

The project uses Rollup with TypeScript to create two output formats:
- **dist/hyperscript-fixi.mjs** - ES module for modern bundlers
- **dist/hyperscript-fixi.min.js** - UMD bundle for script tags (with global `hyperscriptFixi`)

Both outputs include source maps and the UMD version is minified with Terser.

### Integration Pattern

The project extends _hyperscript's command system by adding custom `fetch` commands that follow hyperscript's natural language syntax. The integration allows for:

1. **Shorthand Syntax** for simple GET requests:
   ```
   fetch /url and replace #target
   fetch /url and put into #container
   ```

2. **Extended Syntax** for complex requests:
   ```
   fetch /url with method: 'POST', body: formData, headers: {...}
   ```

## Development Commands

### Build
```bash
npm run build
# Uses rollup to compile TypeScript and generate both ES and UMD bundles
```

### Development
```bash
# No dev server configured - development done via direct file editing
# Test using fixi/test.html as reference for testing patterns
```

### Type Checking
```bash
npx tsc --noEmit
# Validates TypeScript without generating output
```

## Project Philosophy

This project follows the minimalist philosophy of both parent libraries:

- **fixi.js** maintains strict size constraints (under 4.6KB uncompressed)
- **_hyperscript** emphasizes declarative, readable syntax
- The integration preserves both libraries' core principles while enabling powerful combinations

## Key Files to Understand

- **fixi/README.md** - Comprehensive documentation of fixi.js patterns and examples
- **docs/README.md** - Integration patterns showing event-driven communication between fetch and hyperscript
- **roadmap/syntax.md** - Proposed syntax design for the fetch command integration
- **hyperscript/_hyperscript.d.ts** - Type definitions for hyperscript's extensible API

## Testing Approach

The project follows fixi's testing philosophy:
- **fixi/test.html** - Self-contained HTML file with visual testing infrastructure
- No external testing framework dependencies
- Tests run in browser using file:// protocol

## Library Integration Notes

- The project extends _hyperscript's command parser system
- Type definitions ensure proper integration with hyperscript's token-based parsing
- Custom commands follow hyperscript's natural language patterns
- Integration maintains fixi's event-driven architecture
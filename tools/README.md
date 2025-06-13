# Development Tools

This directory contains development utilities, build tools, and legacy files.

## Directory Structure

### Build Tools
- **build/** - Shared build utilities and configurations
- **testing/** - Shared testing utilities and helpers

### Debug Tools  
- **debug/** - Debugging utilities and test files used during development
  - Parser debugging scripts
  - Browser-based test files
  - Event handler debugging
  - Test failure analysis tools

### Legacy Files
- **legacy/** - Historical files from original development
  - Original _hyperscript library files
  - Database files with hyperscript patterns
  - JSON data files with commands and expressions

## Usage

### Development Workflow

```bash
# Build all packages (future)
npm run build:tools

# Run debug tools
node tools/debug/debug-parser.js
open tools/debug/test.html

# Testing utilities (future)
npm run test:tools
```

### Build Configuration

The build tools directory will contain shared configuration for:
- Rollup configurations
- TypeScript compilation settings
- ESLint and Prettier configurations
- Testing setup and utilities

### Testing Utilities

The testing directory will provide:
- Shared test utilities
- Mock data generators
- Cross-package integration test helpers
- Performance testing utilities

## Note

This tools directory is part of the monorepo organization to centralize development utilities and keep the main packages clean. Most tools are currently in the debug and legacy directories, with build and testing tools planned for future development phases.
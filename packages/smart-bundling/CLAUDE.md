# Smart Bundling - CLAUDE.md

This package provides intelligent bundling based on usage patterns and performance optimization for HyperFixi applications.

## Package Overview

- **UsageAnalyzer**: Analyzes code usage patterns to inform bundling decisions
- **BundleOptimizer**: Optimizes bundles with tree-shaking, splitting, and compression
- **SmartBundler**: Main bundler with intelligent defaults
- **Quick Start**: Utility functions for common bundling scenarios

## Key Commands

```bash
# Run tests
npm test --prefix packages/smart-bundling

# Type check
npm run typecheck --prefix packages/smart-bundling

# Build
npm run build --prefix packages/smart-bundling
```

## Main Files

| File | Purpose |
|------|---------|
| `src/analyzer.ts` | Usage pattern analysis (~25KB) |
| `src/optimizer.ts` | Bundle optimization (~16KB) |
| `src/bundler.ts` | Smart bundler implementation (~17KB) |
| `src/quick-start.ts` | Quick start utilities (~12KB) |
| `src/types.ts` | Type definitions |
| `src/index.ts` | Package exports |

## Usage

```typescript
import {
  UsageAnalyzer,
  SmartBundler,
  quickBundle,
  productionBundle
} from '@hyperfixi/smart-bundling';

// Analyze project usage
const analyzer = new UsageAnalyzer();
const analysis = await analyzer.analyzeProject('/path/to/project');

// Quick bundle for development
const result = await quickBundle('src/index.ts', 'dist/bundle.js');

// Production bundle with full optimization
const result = await productionBundle('src/index.ts', 'dist/bundle.js');

// Custom bundler
const bundler = new SmartBundler({
  entry: 'src/index.ts',
  output: 'dist',
  minify: true,
});
await bundler.bundle({ entry: 'src/index.ts', output: 'dist/bundle.js' });
```

## BundleOptimizer Configuration

```typescript
const optimizer = new BundleOptimizer({
  analysis: {
    enabled: true,
    threshold: 10000, // 10KB
  },
  treeshaking: {
    enabled: true,
    pureAnnotations: true,
    sideEffects: false,
  },
  splitting: {
    enabled: true,
    strategy: 'usage',
    threshold: 50000, // 50KB
  },
  compression: {
    enabled: true,
    algorithm: 'gzip',
    level: 6,
  },
  caching: {
    enabled: true,
    strategy: 'content-hash',
    maxAge: 86400000, // 24 hours
  },
});
```

## Dependencies

- `esbuild` - Fast JavaScript bundler
- `rollup` - Module bundler
- `terser` - JavaScript minifier
- `acorn` - JavaScript parser
- `fs-extra` - Enhanced file system operations
- `glob` - File pattern matching

## Testing Notes

- Tests use `vitest` with mocked dependencies
- Analyzer tests verify pattern detection
- Optimizer tests verify configuration defaults
- Some bundler tests fail due to missing `rollup-plugin-terser` import resolution

## Known Issues

- bundler.ts imports `rollup-plugin-terser` dynamically but package may not be installed
- Full integration tests require complex mocking of esbuild and rollup

# CLAUDE.md - Vite Plugin Package

This file provides guidance for working with the `@lokascript/vite-plugin` package.

## Package Purpose

Zero-config Vite plugin that automatically generates minimal LokaScript bundles based on detected hyperscript usage in your project.

## Essential Commands

```bash
# Run tests
npm test --prefix packages/vite-plugin

# Build
npm run build --prefix packages/vite-plugin

# TypeScript validation
npm run typecheck --prefix packages/vite-plugin

# Sync keywords from semantic package
npm run sync-keywords --prefix packages/vite-plugin
```

## How It Works

1. **Scanner** (`scanner.ts`): Detects `_="..."` attributes in HTML/Vue/Svelte/JSX files
2. **Aggregator** (`aggregator.ts`): Collects all detected commands, blocks, expressions across files
3. **Generator** (`generator.ts`): Creates minimal bundle with only the features used

## Architecture

```
src/
├── scanner.ts              # Hyperscript detection in templates
├── aggregator.ts           # Usage collection across files
├── generator.ts            # Minimal bundle generation (interpret mode)
├── compiled-generator.ts   # Compiled JS generation (compile mode)
├── compiler.ts             # Hyperscript → JS compilation
├── html-transformer.ts     # HTML attribute transformation
├── language-keywords.ts    # Multilingual keyword detection
├── semantic-integration.ts # Semantic parser integration
├── types.ts                # TypeScript types
└── index.ts                # Plugin entry point
```

## Key Features

### Two Modes

- **Interpret mode** (default): ~8 KB gzip, includes runtime parser
- **Compile mode**: ~500 bytes gzip, pre-compiles to JS at build time

### Multilingual Detection

The scanner detects keywords in 23 languages via `language-keywords.ts`.

```bash
# Regenerate language keywords from semantic package
npm run sync-keywords --prefix packages/vite-plugin
```

## Important Files

| File                       | Purpose                         |
| -------------------------- | ------------------------------- |
| `src/scanner.ts`           | Detect hyperscript in templates |
| `src/aggregator.ts`        | Collect usage across project    |
| `src/generator.ts`         | Generate runtime bundle         |
| `src/language-keywords.ts` | Multilingual keyword sets       |
| `src/index.ts`             | Plugin entry, options handling  |

## Testing

```bash
# All tests
npm test --prefix packages/vite-plugin

# Scanner tests
npm test --prefix packages/vite-plugin -- --run src/scanner.test.ts

# Aggregator tests
npm test --prefix packages/vite-plugin -- --run src/aggregator.test.ts
```

## Plugin Options

```javascript
lokascript({
  mode: 'interpret', // 'interpret' | 'compile'
  extraCommands: [], // Always include these commands
  extraBlocks: [], // Always include these blocks
  positional: false, // Include positional expressions
  htmx: false, // Enable htmx integration
  debug: false, // Verbose logging
  languages: ['en'], // Languages for semantic detection
});
```

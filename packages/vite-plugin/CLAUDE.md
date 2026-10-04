# CLAUDE.md - Vite Plugin Package

This file provides guidance for working with the `@hyperfixi/vite-plugin` package.

## Package Purpose

Zero-config Vite plugin that emits a bundle on `@hyperfixi/engine` registering only the grammar modules the project's hyperscript uses. A bundle on the engine is the list passed to `register()`; the plugin's job is choosing that list.

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
3. **Generator** (`generator.ts`): Emits the virtual module — one `@hyperfixi/engine` import, `register(...)`, `boot()`; the multilingual path is the engine's source transform
4. **Module map** (`engine-modules.ts`): keyword → engine module, DERIVED from the engine at load (every module in `everything` run against a fresh grammar) — never a hand-copied list

## Architecture

```
src/
├── scanner.ts              # Hyperscript detection in templates
├── aggregator.ts           # Usage collection across files
├── generator.ts            # The emitted module-list bundle on the engine (interpret mode)
├── engine-modules.ts       # Keyword → module map, derived from @hyperfixi/engine
├── language-keywords.ts    # Multilingual keyword detection
├── semantic-integration.ts # Semantic parser integration
├── types.ts                # TypeScript types
└── index.ts                # Plugin entry point
```

## Key Features

### One tier (since the engine cutover, 2026-10-03)

- **Interpret mode** (default): a bundle on `@hyperfixi/engine`; measured gzipped 17.9 KB
  (3 commands) → 34.4 KB (everything). The engine's fixed core is 13.8 KB: there is no
  sub-5 KB tier. The 3.x generator's regex "lite" (3.9 KB) and hybrid (12–16 KB) parsers
  and its 352 KB fallback are gone; one grammar, gated by upstream's suite.
- **Compile mode**: removed in 4.0 (Phase C4) with core's parser, which it compiled with;
  selecting it warns and builds the engine-module bundle.

Gates: `generator.test.ts` (emitted text), `engine-modules.test.ts` (the derived map),
`generated-bundle.test.ts` (the emitted bundle RUN in jsdom, English and Spanish),
`generated-bundle-size.test.ts` (esbuild-bundled sizes; language registrations survive
tree-shaking). The engine must be built (`pretest` runs ensure-fresh).

### Multilingual Detection

The scanner detects keywords in 24 languages via `language-keywords.ts`.

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
hyperfixi({
  mode: 'interpret', // 'compile' was removed in 4.0 (warns, builds the bundle)
  extraCommands: [], // Always include these commands
  extraBlocks: [], // Always include these blocks
  positional: false, // Include positional expressions
  htmx: false, // Enable htmx integration
  debug: false, // Verbose logging
  languages: ['en'], // Languages for semantic detection
});
```

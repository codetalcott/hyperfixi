# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HyperFixi** is a complete _hyperscript ecosystem with server-side compilation, multi-language i18n (13 languages including SOV/VSO grammar transformation), semantic-first multilingual parsing, and comprehensive developer tooling.

- **2838+ tests** passing across all suites
- **224 KB** browser bundle (39% reduction from original)
- **~85%** compatibility with official _hyperscript

## Monorepo Structure

```
packages/
├── core/           # Main hyperscript runtime, parser, commands (primary development)
│   ├── src/
│   │   ├── parser/           # Hyperscript parser with CommandNodeBuilder pattern
│   │   ├── runtime/          # Runtime execution engine
│   │   ├── commands/         # 43 command implementations
│   │   ├── commands-v2/      # Standalone command modules (tree-shakeable)
│   │   └── expressions/      # 6 expression categories (references, logical, etc.)
│   └── dist/                 # Built bundles (hyperfixi-browser.js)
│
├── i18n/           # Internationalization (13 languages + grammar transformation)
│   ├── src/
│   │   ├── grammar/          # SOV/VSO word order transformation
│   │   ├── dictionaries/     # Per-language keyword dictionaries
│   │   └── parser/           # Multilingual keyword providers
│   └── dist/                 # Built bundles (hyperfixi-i18n.min.js)
│
├── semantic/       # Semantic-first multilingual parsing (13 languages)
│   ├── src/
│   │   ├── tokenizers/       # Language-specific tokenizers (en, ja, ar, es, ko, tr, zh, pt, fr, de, id, qu, sw)
│   │   ├── generators/       # Pattern generation from command schemas
│   │   ├── parser/           # Semantic parser with confidence scoring
│   │   └── explicit/         # Language-agnostic intermediate representation
│   └── dist/                 # Built bundles (hyperfixi-semantic.browser.global.js)
│
├── vite-plugin/    # Zero-config Vite plugin for automatic bundle generation
│   └── src/
│       ├── scanner.ts        # Hyperscript detection in HTML/Vue/Svelte/JSX
│       ├── aggregator.ts     # Usage collection across files
│       └── generator.ts      # Minimal bundle generation
│
└── [other packages: smart-bundling, developer-tools, testing-framework, etc.]

examples/
├── multilingual/   # Live grammar transformation demo
└── gallery/        # Feature showcase
```

## Essential Commands

### Core Package (Primary Development)

```bash
# Quick validation (recommended after changes)
npm run test:quick --prefix packages/core           # Build + test (<10 sec)
npm run test:comprehensive --prefix packages/core   # Full browser suite

# Unit tests
npm test --prefix packages/core                     # Run vitest (2700+ tests)
npm test --prefix packages/core -- --run src/expressions/  # Test specific module

# Build
npm run build:browser --prefix packages/core        # Build browser bundle
npm run typecheck --prefix packages/core            # TypeScript validation

# Browser testing (Playwright) - MUST run from packages/core directory
cd packages/core && npx playwright test src/compatibility/
```

### i18n Package

```bash
# Tests
npm test --prefix packages/i18n                     # Run vitest (90+ grammar tests)
npx vitest run src/grammar/grammar.test.ts          # Grammar transformation tests

# Build
npm run build:browser --prefix packages/i18n        # Build browser bundle

# TypeScript
npm run typecheck --prefix packages/i18n
```

### Semantic Package

```bash
# Tests
npm test --prefix packages/semantic                     # Run vitest (730+ tests)
npm test --prefix packages/semantic -- --run            # Single run

# Build
npm run build --prefix packages/semantic                # Build all bundles
npm run build:browser --prefix packages/semantic        # Browser bundle

# TypeScript
npm run typecheck --prefix packages/semantic
```

### Live Testing

```bash
# Start HTTP server (from project root)
npx http-server . -p 3000 -c-1

# Test pages:
# http://127.0.0.1:3000/packages/core/test-dashboard.html       # Auto-running tests
# http://127.0.0.1:3000/examples/multilingual/index.html        # Grammar demo (i18n)
# http://127.0.0.1:3000/examples/multilingual/semantic-demo.html # Semantic parser demo (13 languages)
# http://127.0.0.1:3000/packages/core/compatibility-test.html   # Side-by-side comparison
```

## Architecture

### Command Pattern

All 43 commands use `CommandImplementation<TInput, TOutput, TypedExecutionContext>`:

```typescript
// packages/core/src/commands-v2/increment.ts
export class IncrementCommand implements CommandImplementation<IncrementInput, void, TypedExecutionContext> {
  parseInput(node: CommandNode, ctx: TypedExecutionContext): IncrementInput { ... }
  async execute(input: IncrementInput, ctx: TypedExecutionContext): Promise<void> { ... }
}
```

### Grammar Transformation (i18n)

The i18n package transforms hyperscript to native word order:

- **SVO** (English, Chinese, Spanish): `on click increment #count`
- **SOV** (Japanese, Korean, Turkish): `#count を クリック で 増加`
- **VSO** (Arabic): `زِد #count عند النقر`

Key files:
- `packages/i18n/src/grammar/transformer.ts` - GrammarTransformer class
- `packages/i18n/src/grammar/profiles/` - Language profiles with word order rules
- `packages/i18n/src/grammar/types.ts` - Semantic roles, joinTokens for agglutinative suffixes

### Unified Multilingual API

The `MultilingualHyperscript` class provides a unified API that integrates semantic parsing with grammar transformation:

```typescript
import { MultilingualHyperscript } from '@hyperfixi/core';

const ml = new MultilingualHyperscript();
await ml.initialize();

// Parse from any of 13 languages
const node = await ml.parse('#button の .active を 切り替え', 'ja');

// Translate between any languages
const arabic = await ml.translate('toggle .active', 'en', 'ar');
```

Key files:

- `packages/core/src/multilingual/index.ts` - `MultilingualHyperscript` unified API
- `packages/core/src/multilingual/bridge.ts` - `SemanticGrammarBridge` integration layer
- `packages/semantic/src/tokenizers/` - 13 language tokenizers
- `packages/semantic/src/parser/semantic-parser.ts` - Main semantic parser
- `packages/semantic/CLAUDE.md` - Package-specific documentation

### Expression System

Six categories in `packages/core/src/expressions/`:
- **references/** - `me`, `you`, `it`, CSS selectors
- **logical/** - Comparisons, boolean logic
- **conversion/** - `as` keyword, type conversion
- **positional/** - `first`, `last`, array navigation
- **properties/** - Possessive syntax (`element's property`)
- **special/** - Literals, mathematical operations

### Parser Context

The parser uses dependency injection via `ParserContext` interface:
- 48 methods exposed through `.bind(this)` delegation
- Command parsers in `packages/core/src/parser/commands/` are pure functions
- AST helpers in `packages/core/src/parser/ast-helpers.ts`

## Key Patterns

### Testing

```bash
# Fast iteration cycle
npm run test:quick --prefix packages/core  # Exit 0 = pass, 1 = fail

# Run single test file
npm test --prefix packages/core -- --run src/expressions/logical.test.ts

# Playwright for browser tests - MUST run from packages/core directory
cd packages/core && npx playwright test --grep "Grammar Transformation"
```

### Adding a New Command

1. Create implementation in `packages/core/src/commands-v2/`
2. Register in `packages/core/src/commands-v2/index.ts`
3. Add parser support in `packages/core/src/parser/commands/`
4. Write tests in `packages/core/src/commands-v2/*.test.ts`

### Adding i18n Language Support

1. Create dictionary in `packages/i18n/src/dictionaries/`
2. Add language profile in `packages/i18n/src/grammar/profiles/`
3. Create keyword provider in `packages/i18n/src/parser/`
4. Export from `packages/i18n/src/browser.ts`
5. Add tests in `packages/i18n/src/grammar/grammar.test.ts`

## Debugging Tools

### Compilation Metadata

Every compilation returns metadata about which parser was used and any warnings:

```javascript
const result = hyperfixi.compile('toggle .active');
console.log(result.metadata);
// {
//   parserUsed: 'semantic',
//   semanticConfidence: 0.98,
//   semanticLanguage: 'en',
//   warnings: []
// }
```

This helps identify:
- Which parser processed the code (semantic vs traditional)
- Confidence score if semantic parser was used
- Any warnings about ambiguous type conversions or potential issues

### Enable Debug Logging

In browser console:
```javascript
hyperfixi.debugControl.enable();   // Enable detailed logging
hyperfixi.debugControl.disable();  // Disable logging
hyperfixi.debugControl.isEnabled(); // Check status
hyperfixi.debugControl.status();   // Get detailed status
```

Or set localStorage directly:
```javascript
localStorage.setItem('hyperfixi:debug', '*');
// Then reload page
```

Debug logging persists across page reloads via localStorage and works in production builds.

### Debug Events

Listen to semantic parse events to understand parser decisions:

```javascript
window.addEventListener('hyperfixi:semantic-parse', (e) => {
  console.log('Semantic parse:', e.detail);
  // {
  //   input: 'toggle .active',
  //   language: 'en',
  //   confidence: 0.95,
  //   semanticSuccess: true,
  //   command: 'toggle',
  //   roles: { patient: '.active' }
  // }
});
```

### Debug Statistics

Get parsing statistics:
```javascript
const stats = hyperfixi.semanticDebug.getStats();
console.log(stats);
// {
//   totalParses: 42,
//   semanticSuccesses: 38,
//   semanticFallbacks: 4,
//   traditionalParses: 0,
//   averageConfidence: 0.91
// }
```

### Compilation Options

Disable semantic parsing for specific code:
```javascript
// Use traditional parser only (useful for complex behaviors)
const result = hyperfixi.compile(code, { disableSemanticParsing: true });
```

## Important Files

| File | Purpose |
|------|---------|
| `packages/core/src/runtime/runtime.ts` | Main runtime (extends RuntimeBase) |
| `packages/core/src/parser/parser.ts` | Hyperscript parser (~3000 lines) |
| `packages/core/src/commands-v2/` | All 43 command implementations |
| `packages/i18n/src/grammar/transformer.ts` | GrammarTransformer class |
| `packages/i18n/src/browser.ts` | Browser bundle exports |
| `packages/semantic/src/parser/semantic-parser.ts` | Semantic parser |
| `packages/semantic/src/tokenizers/` | 13 language tokenizers |
| `roadmap/plan.md` | Development context and status |

## Vite Plugin (Recommended)

For Vite projects, use `@hyperfixi/vite-plugin` for automatic minimal bundles:

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [hyperfixi()]
};
```

```javascript
// app.js - just import, plugin handles the rest
import 'hyperfixi';
```

The plugin automatically scans your files for `_="..."` attributes and generates a bundle with only the commands you use. Options:

```javascript
hyperfixi({
  extraCommands: ['fetch'],  // Always include these commands
  extraBlocks: ['if'],       // Always include these blocks
  positional: true,          // Include positional expressions
  htmx: true,                // Enable htmx integration
  debug: true,               // Verbose logging
})
```

## Browser Bundles

### Core Bundles

| Bundle | Global | Size | Use Case |
|--------|--------|------|----------|
| `packages/core/dist/hyperfixi-browser.js` | `window.hyperfixi` | 663 KB | Full bundle with parser |
| `packages/core/dist/hyperfixi-multilingual.js` | `window.hyperfixi` | 250 KB | Multilingual (no parser) |
| `packages/i18n/dist/hyperfixi-i18n.min.js` | `window.HyperFixiI18n` | 68 KB | Grammar transformation |

### Lite Bundles (Size-Optimized)

For projects prioritizing bundle size over features:

| Bundle | Size (gzip) | Commands | Features |
|--------|-------------|----------|----------|
| `hyperfixi-lite.js` | 1.9 KB | 8 | Regex parser, basic commands |
| `hyperfixi-lite-plus.js` | 2.6 KB | 14 | Regex parser, more commands, i18n aliases |
| `hyperfixi-hybrid-complete.js` | 6.7 KB | 21+blocks | Full AST parser, expressions, event modifiers |
| `hyperfixi-hybrid-hx.js` | 9.7 KB | 21+blocks | hybrid-complete + htmx attribute support |

**Hybrid Complete** (~85% hyperscript coverage) is recommended - it supports:

- Full expression parser with operator precedence
- Block commands: `repeat N times`, `for each`, `if/else/else if`, `unless`, `fetch`, `while`, `async`
- Event modifiers: `.once`, `.prevent`, `.stop`, `.debounce(N)`, `.throttle(N)`
- Positional expressions: `first`, `last`, `next`, `previous`, `closest`, `parent`
- Function calls and method chaining: `str.toUpperCase()`, `arr.join('-')`
- HTML selectors: `<button.class#id/>`
- i18n keyword aliases

```html
<!-- Example: Hybrid Complete with expressions and blocks -->
<button _="on click
  set :total to #price's textContent then
  set :tax to :total * 0.1 then
  put :total + :tax into #grand-total">
  Calculate Total
</button>

<button _="on click.debounce(300)
  if me has .loading
    return
  end then
  add .loading then
  fetch /api/data as json then
  for each item in result
    append item.name to #results
  end then
  remove .loading">
  Load Data
</button>
```

**Hybrid-HX** adds htmx attribute compatibility for declarative AJAX:

```html
<!-- htmx-style attributes (hybrid-hx bundle) -->
<button hx-get="/api/users" hx-target="#users-list" hx-swap="innerHTML">
  Load Users
</button>

<!-- hx-on:* for inline hyperscript -->
<button hx-on:click="toggle .active on me">Toggle</button>
```

### Custom Bundle Generator

Generate minimal bundles with only the commands you need:

```bash
cd packages/core

# Generate from config file
npm run generate:bundle -- --config bundle-configs/textshelf.config.json

# Generate from command line with blocks and positional expressions
npm run generate:bundle -- --commands toggle,add,set --blocks if,repeat --positional --output src/my-bundle.ts
```

See [bundle-configs/README.md](packages/core/bundle-configs/README.md) for full documentation.

### Semantic Bundles (Regional Options)

| Bundle | Global | Size (gzip) | Languages |
|--------|--------|-------------|-----------|
| `browser.global.js` | `HyperFixiSemantic` | 61 KB | All 13 |
| `browser-priority.priority.global.js` | `HyperFixiSemanticPriority` | 48 KB | 11 priority |
| `browser-western.western.global.js` | `HyperFixiSemanticWestern` | 30 KB | en, es, pt, fr, de |
| `browser-east-asian.east-asian.global.js` | `HyperFixiSemanticEastAsian` | 24 KB | ja, zh, ko |
| `browser-es-en.es-en.global.js` | `HyperFixiSemanticEsEn` | 25 KB | en, es |
| `browser-en.en.global.js` | `HyperFixiSemanticEn` | 20 KB | en only |
| `browser-es.es.global.js` | `HyperFixiSemanticEs` | 16 KB | es only |

Choose the smallest bundle that covers your target languages. See `packages/semantic/README.md` for details.

### Multilingual Bundle (Recommended for i18n)

For developers writing hyperscript in their native language:

```html
<!-- Load both bundles -->
<script src="hyperfixi-semantic.browser.global.js"></script>
<script src="hyperfixi-multilingual.js"></script>
<script>
  // Execute in any of 13 supported languages
  await hyperfixi.execute('토글 .active', 'ko');      // Korean
  await hyperfixi.execute('トグル .active', 'ja');    // Japanese
  await hyperfixi.execute('alternar .active', 'es');  // Spanish

  // Translate between languages
  const korean = await hyperfixi.translate('toggle .active', 'en', 'ko');
</script>
```

**Total size:** ~511 KB (250 KB + 261 KB) vs 924 KB with full bundle

### Full Bundle Usage

```html
<script src="hyperfixi-browser.js"></script>
<script src="hyperfixi-i18n.min.js"></script>
<script src="hyperfixi-semantic.browser.global.js"></script>
<script>
  // Grammar transformation (i18n)
  const result = HyperFixiI18n.translate('on click toggle .active', 'en', 'ja');

  // Semantic parsing (13 languages)
  const parsed = HyperFixiSemantic.parse('トグル .active', 'ja');
  const translations = HyperFixiSemantic.getAllTranslations('toggle .active', 'en');
</script>
```

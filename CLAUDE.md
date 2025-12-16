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

# Browser testing (Playwright)
npx playwright test packages/core/src/compatibility/
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

# Playwright for browser tests
npx playwright test --grep "Grammar Transformation"
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

## Browser Bundles

| Bundle | Global | Size | Use Case |
|--------|--------|------|----------|
| `packages/core/dist/hyperfixi-browser.js` | `window.hyperfixi` | 663 KB | Full bundle with parser |
| `packages/core/dist/hyperfixi-multilingual.js` | `window.hyperfixi` | 250 KB | Multilingual (no parser) |
| `packages/semantic/dist/hyperfixi-semantic.browser.global.js` | `window.HyperFixiSemantic` | 261 KB | Semantic parsing |
| `packages/i18n/dist/hyperfixi-i18n.min.js` | `window.HyperFixiI18n` | 68 KB | Grammar transformation |

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

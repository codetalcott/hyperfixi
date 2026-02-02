# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LokaScript** is a complete \_hyperscript ecosystem with server-side compilation, multi-language i18n (24 languages including SOV/VSO grammar transformation), semantic-first multilingual parsing, and comprehensive developer tooling.

- **8100+ tests** passing across all suites
- **203 KB** browser bundle (gzipped, 39% reduction from original)
- **~85%** compatibility with official \_hyperscript

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
│   └── dist/                 # Built bundles (lokascript-browser.js)
│
├── i18n/           # Internationalization (24 languages + grammar transformation)
│   ├── src/
│   │   ├── grammar/          # SOV/VSO word order transformation
│   │   ├── dictionaries/     # Per-language keyword dictionaries
│   │   └── parser/           # Multilingual keyword providers
│   └── dist/                 # Built bundles (lokascript-i18n.min.js)
│
├── semantic/       # Semantic-first multilingual parsing (24 languages)
│   ├── src/
│   │   ├── tokenizers/       # Language-specific tokenizers (ar, bn, de, en, es, fr, he, hi, id, it, ja, ko, ms, pl, pt, qu, ru, sw, th, tl, tr, uk, vi, zh)
│   │   ├── generators/       # Pattern generation from command schemas
│   │   ├── parser/           # Semantic parser with confidence scoring
│   │   └── explicit/         # Language-agnostic intermediate representation
│   └── dist/                 # Built bundles (lokascript-semantic.browser.global.js)
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
npm test --prefix packages/core                     # Run vitest (5700+ tests)
npm test --prefix packages/core -- --run src/expressions/  # Test specific module

# Build
npm run build:browser --prefix packages/core        # Build browser bundle
npm run typecheck --prefix packages/core            # TypeScript validation

# Browser testing (Playwright) - MUST run from packages/core directory
cd packages/core && npx playwright test src/compatibility/
```

> **Known issue: esbuild daemon hang.** Core vitest tests complete successfully but the
> Node process hangs indefinitely because esbuild's daemon keeps the event loop alive.
> The `test` and `test:quick` scripts wrap vitest with `timeout` and treat exit code 124
> (killed by timeout) as success. CI uses the same pattern. If running vitest directly,
> use: `timeout 120 vitest run || [ $? -eq 124 ]`

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
npm test --prefix packages/semantic                     # Run vitest (3100+ tests)
npm test --prefix packages/semantic -- --run            # Single run

# Build
npm run build --prefix packages/semantic                # Build all bundles
npm run build:browser --prefix packages/semantic        # Browser bundle

# TypeScript
npm run typecheck --prefix packages/semantic
```

### Test Output Management

```bash
# Clean all test outputs (coverage, HTML reports, playwright reports)
npm run clean:test

# Generate HTML test reports (optional, disabled by default to reduce disk usage)
VITEST_HTML=1 npm test --prefix packages/core
```

### Quick Test Validation (Compact Output)

For agent/CI contexts where verbose output is too large, use `test:check` for summary-only output (~5 lines per package):

```bash
# All packages — summary only
npm run test:check

# Per-package compact output
npm run test:check --prefix packages/core
npm run test:check --prefix packages/semantic
npm run test:check --prefix packages/i18n
```

> **Agent/CI tip:** Use `npm run test:check` for compact pass/fail output.
> Use `npm test` for full verbose output during debugging.

### Live Testing

```bash
# Start HTTP server (from project root)
npx http-server . -p 3000 -c-1

# Test pages:
# http://127.0.0.1:3000/examples/multilingual/index.html        # Grammar demo (i18n)
# http://127.0.0.1:3000/examples/multilingual/semantic-demo.html # Semantic parser demo (24 languages)
# http://127.0.0.1:3000/packages/core/compatibility-test.html   # Side-by-side comparison
```

## CI/CD Workflows

### Consolidated CI Workflow

As of 2026-01-23, all CI testing has been consolidated into a single `.github/workflows/ci.yml` workflow for efficiency.

**Key features:**

- **Shared build artifacts**: Packages are built once and shared across all jobs (40% faster)
- **Parallel execution**: 8 jobs run in parallel after build completes
- **Node 24 LTS**: Active LTS release (EOL April 2028)
- **Smart failure handling**: Known failures (behaviors, SOV/VSO languages) marked with `continue-on-error`

**Jobs:**

1. `build` - Build all packages once, upload artifacts
2. `lint-typecheck` - ESLint + TypeScript checks
3. `unit-tests` - Vitest tests on Node 24
4. `coverage` - Code coverage reports (Codecov)
5. `browser-tests` - Playwright browser tests
6. `multilingual-validation` - Test 20 languages (23 total, 3 experimental)
7. `bundle-size` - Analyze and check bundle size limits
8. `benchmarks` - Performance benchmarks (main branch only)

**Triggers:**

- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Concurrency: Cancels in-progress runs on new push

**Known Issues:**

- Behavior tests: Draggable, Sortable, Resizable not fully implemented (continue-on-error)
- SOV/VSO languages: Japanese (11%), Korean (7%), Turkish (2%) have low pass rates (continue-on-error)

**Other Workflows:**

- `.github/workflows/publish.yml` - Manual npm publishing (workflow_dispatch)
- `.github/workflows/pre-publish-check.yml` - Pre-publish validation (workflow_dispatch)

**Archived Workflows:**

- See `.github/workflows/archive/README.md` for previously consolidated workflows

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
import { MultilingualHyperscript } from '@lokascript/core';

const ml = new MultilingualHyperscript();
await ml.initialize();

// Parse from any of 24 languages
const node = await ml.parse('#button の .active を 切り替え', 'ja');

// Translate between any languages
const arabic = await ml.translate('toggle .active', 'en', 'ar');
```

Key files:

- `packages/core/src/multilingual/index.ts` - `MultilingualHyperscript` unified API
- `packages/core/src/multilingual/bridge.ts` - `SemanticGrammarBridge` integration layer
- `packages/semantic/src/tokenizers/` - 24 language tokenizers
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

# Bundle compatibility matrix - tests all bundles against gallery examples
cd packages/core && npx playwright test src/compatibility/browser-tests/bundle-compatibility.spec.ts
```

**Bundle Test Matrix:**

The bundle compatibility test suite automatically tests all 7 bundles against gallery examples to verify which features work with each bundle size. Tests run in "discovery mode" - bundles are tested against examples they're not expected to support, logging any unexpected successes.

- Location: `packages/core/src/compatibility/browser-tests/bundle-compatibility.spec.ts`
- Tests: Toggle, show/hide, input mirroring, counter, modals, fetch, tabs, blocks, event modifiers
- Bundles: lite (1.9 KB), lite-plus (2.6 KB), hybrid-complete (7.3 KB), hybrid-hx (9.5 KB), minimal (58 KB), standard (63 KB), browser (203 KB)
- Prints ASCII compatibility matrix showing feature support across all bundles

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

### Adding Semantic Language Support

Use the CLI tool to scaffold a new language. It automatically generates all files and updates:

- `src/languages/_all.ts` - language registration
- `src/tokenizers/index.ts` - tokenizer export
- `src/generators/profiles/index.ts` - profile export
- `src/generators/language-profiles.ts` - profile mapping
- `src/patterns/*/index.ts` - pattern indexes
- `src/patterns/builders.ts` - handcraftedLanguages array
- `src/language-building-schema.ts` - SUPPORTED_LANGUAGES array
- `packages/vite-plugin/src/language-keywords.ts` - keyword detection

```bash
cd packages/semantic
npm run add-language -- --code=xx --name=LanguageName --native=NativeName \
  --wordOrder=SVO --direction=ltr --marking=preposition --usesSpaces=true
```

Then follow the post-scaffold steps:

1. **Fill in keyword translations** in `src/generators/profiles/{code}.ts`
2. **Add character classification** in `src/tokenizers/{code}.ts` (for non-Latin scripts)
3. **Sync keywords to vite-plugin** (after filling in profile):

   ```bash
   npm run sync-keywords --prefix packages/vite-plugin
   # Options: --dry-run (preview), --language=xx (single language)
   ```

4. **Run TypeScript checks**:

   ```bash
   npm run typecheck --prefix packages/semantic
   npm run typecheck --prefix packages/vite-plugin
   ```

5. **Run tests**: `npm test --prefix packages/semantic`

### Custom Language Keywords (Vite Plugin)

The vite-plugin exports utilities for customizing language detection:

```javascript
import {
  registerCustomKeywords, // Add custom keywords for a language
  getKeywordsForLanguage, // Get keyword set for a language
  isNonLatinLanguage, // Check if language uses non-Latin script
  getAllLanguageCodes, // Get all supported language codes
  clearCustomKeywords, // Clear custom keywords
} from '@lokascript/vite-plugin';

// Register custom keywords for detection
registerCustomKeywords('my-lang', {
  keywords: ['myToggle', 'myAdd', 'myRemove'],
  isNonLatin: false,
});
```

## Debugging Tools

### Compilation Metadata

Every compilation returns metadata about which parser was used and any warnings:

```javascript
const result = lokascript.compile('toggle .active');
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
lokascript.debugControl.enable(); // Enable detailed logging
lokascript.debugControl.disable(); // Disable logging
lokascript.debugControl.isEnabled(); // Check status
lokascript.debugControl.status(); // Get detailed status
```

Or set localStorage directly:

```javascript
localStorage.setItem('lokascript:debug', '*');
// Then reload page
```

Debug logging persists across page reloads via localStorage and works in production builds.

**Debug Log Categories:**

| Prefix    | Module              | Description                      |
| --------- | ------------------- | -------------------------------- |
| `ATTR:`   | attribute-processor | DOM scanning, element processing |
| `SCRIPT:` | attribute-processor | Script tag compilation           |
| `SCAN:`   | attribute-processor | Document scanning                |
| `PARSE:`  | parser              | Tokenization, AST building       |
| `CMD:`    | commands            | Command execution                |
| `EXPR:`   | expressions         | Expression evaluation            |

### Debug Events

Listen to semantic parse events to understand parser decisions:

```javascript
window.addEventListener('lokascript:semantic-parse', e => {
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
const stats = lokascript.semanticDebug.getStats();
console.log(stats);
// {
//   totalParses: 42,
//   semanticSuccesses: 38,
//   semanticFallbacks: 4,
//   traditionalParses: 0,
//   averageConfidence: 0.91
// }
```

### API v2 (Recommended)

The new API provides cleaner methods with structured results:

```javascript
import { hyperscript } from 'lokascript';

// Compile (sync) - returns CompileResult with ok/errors/meta
const result = hyperscript.compileSync('toggle .active');
if (result.ok) {
  console.log('Parser:', result.meta.parser); // 'semantic' or 'traditional'
}

// Compile + execute in one call
await hyperscript.eval('add .clicked to me', element);

// Async compilation (for language loading)
const asyncResult = await hyperscript.compileAsync(code, { language: 'ja' });

// Validation
const validation = await hyperscript.validate('toggle .active');
if (!validation.valid) {
  console.error(validation.errors);
}

// Context with parent inheritance
const parent = hyperscript.createContext();
const child = hyperscript.createContext(element, parent);
```

**Options:**

- `language?: string` - Language code (e.g., 'en', 'ja', 'es')
- `confidenceThreshold?: number` - Min confidence for semantic parsing (0-1)
- `traditional?: boolean` - Force traditional parser

See [packages/core/docs/API.md](packages/core/docs/API.md) for complete documentation.

> **Note:** Legacy methods (`compile()`, `run()`, `evaluate()`) still work but show deprecation warnings. Migrate to `compileSync()`, `eval()`, `validate()` for new code.

## Type Safety: Environment-Specific Conditional Types

LokaScript uses TypeScript conditional types for zero-cost type safety across browser and server environments:

**Browser code** (full DOM type safety):

```typescript
import type { BrowserEventPayload } from '@lokascript/core/registry/browser';

const payload: BrowserEventPayload = {
  type: 'click',
  target: element, // ✅ Must be Element
  nativeEvent: event, // ✅ Must be Event
};
```

**Server code** (prevents DOM API misuse):

```typescript
import type { ServerEventPayload } from '@lokascript/server-integration';

const payload: ServerEventPayload = {
  type: 'request',
  data: { request, response },
  target: null, // ✅ Generic object
  // nativeEvent        // ❌ TypeScript error - not available in Node.js
};
```

**Universal code** (works in both):

```typescript
import type { UniversalEventPayload } from '@lokascript/core/registry/universal';

function handle(payload: UniversalEventPayload) {
  if (payload.target instanceof Element) {
    payload.target.classList.add('active'); // ✅ Type-safe
  }
}
```

See [TYPE_SAFETY_DESIGN.md](docs-internal/analysis/TYPE_SAFETY_DESIGN.md) for implementation details.

## Important Files

| File                                              | Purpose                                     |
| ------------------------------------------------- | ------------------------------------------- |
| `packages/core/src/runtime/runtime.ts`            | Main runtime (extends RuntimeBase)          |
| `packages/core/src/parser/parser.ts`              | Hyperscript parser (~3000 lines)            |
| `packages/core/src/commands-v2/`                  | All 43 command implementations              |
| `packages/core/src/registry/`                     | Registry system (commands, events, context) |
| `packages/core/src/registry/browser-types.ts`     | Browser-specific types                      |
| `packages/server-integration/src/types/`          | Server-specific types                       |
| `packages/i18n/src/grammar/transformer.ts`        | GrammarTransformer class                    |
| `packages/i18n/src/browser.ts`                    | Browser bundle exports                      |
| `packages/semantic/src/parser/semantic-parser.ts` | Semantic parser                             |
| `packages/semantic/src/tokenizers/`               | 24 language tokenizers                      |
| `packages/core/src/api/hyperscript-api.ts`        | Main API implementation (v2)                |
| `packages/core/docs/API.md`                       | API documentation                           |
| `roadmap/plan.md`                                 | Development context and status              |

## Vite Plugin (Recommended)

For Vite projects, use `@lokascript/vite-plugin` for automatic minimal bundles:

```javascript
// vite.config.js
import { lokascript } from '@lokascript/vite-plugin';

export default {
  plugins: [lokascript()],
};
```

```javascript
// app.js - just import, plugin handles the rest
import 'lokascript';
```

The plugin automatically scans your files for `_="..."` attributes and generates a bundle with only the commands you use. Options:

```javascript
lokascript({
  extraCommands: ['fetch'], // Always include these commands
  extraBlocks: ['if'], // Always include these blocks
  positional: true, // Include positional expressions
  htmx: true, // Enable htmx integration
  debug: true, // Verbose logging
});
```

## Browser Bundles

### Core Bundles

| Bundle                                          | Global                  | Size (gzip) | Use Case                 |
| ----------------------------------------------- | ----------------------- | ----------- | ------------------------ |
| `packages/core/dist/lokascript-browser.js`      | `window.lokascript`     | 203.5 KB    | Full bundle with parser  |
| `packages/core/dist/lokascript-multilingual.js` | `window.lokascript`     | 64.3 KB     | Multilingual (no parser) |
| `packages/i18n/dist/lokascript-i18n.min.js`     | `window.LokaScriptI18n` | 35.0 KB     | Grammar transformation   |

> **Note**: Backward-compatible aliases (`hyperfixi-*.js`) are available in v1.1.0 but will be removed in v2.0.0. See [MIGRATION.md](MIGRATION.md).

### Lite Bundles (Size-Optimized)

For projects prioritizing bundle size over features:

| Bundle                          | Size (gzip) | Commands  | Features                                      |
| ------------------------------- | ----------- | --------- | --------------------------------------------- |
| `lokascript-lite.js`            | 1.9 KB      | 8         | Regex parser, basic commands                  |
| `lokascript-lite-plus.js`       | 2.6 KB      | 14        | Regex parser, more commands, i18n aliases     |
| `lokascript-hybrid-complete.js` | 7.3 KB      | 21+blocks | Full AST parser, expressions, event modifiers |
| `lokascript-hybrid-hx.js`       | 9.7 KB      | 21+blocks | hybrid-complete + htmx/fixi attribute support |

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
<button
  _="on click
  set :total to #price's textContent then
  set :tax to :total * 0.1 then
  put :total + :tax into #grand-total"
>
  Calculate Total
</button>

<button
  _="on click.debounce(300)
  if me has .loading
    return
  end then
  add .loading then
  fetch /api/data as json then
  for each item in result
    append item.name to #results
  end then
  remove .loading"
>
  Load Data
</button>
```

**Hybrid-HX** adds htmx and fixi attribute compatibility for declarative AJAX:

```html
<!-- htmx-style attributes (hybrid-hx bundle) -->
<button hx-get="/api/users" hx-target="#users-list" hx-swap="innerHTML">Load Users</button>

<!-- fixi-style attributes (also supported) -->
<button fx-action="/api/users" fx-target="#users-list" fx-swap="innerHTML">Load Users</button>

<!-- hx-on:* for inline hyperscript -->
<button hx-on:click="toggle .active on me">Toggle</button>
```

Fixi features include request dropping (anti-double-submit), `fx-ignore` attribute, and a rich event lifecycle (`fx:init`, `fx:config`, `fx:before`, `fx:after`, `fx:error`, `fx:finally`, `fx:swapped`).

### htmx Lifecycle Events

The htmx compatibility layer dispatches CustomEvents at key points in the request lifecycle:

| Event                | When                                           | Cancelable | Detail                     |
| -------------------- | ---------------------------------------------- | ---------- | -------------------------- |
| `htmx:configuring`   | After attributes collected, before translation | Yes        | `{ config, element }`      |
| `htmx:beforeRequest` | Before hyperscript execution                   | Yes        | `{ element, url, method }` |
| `htmx:afterSettle`   | After successful execution                     | No         | `{ element, target }`      |
| `htmx:error`         | On execution failure                           | No         | `{ element, error }`       |

**Example usage:**

```javascript
// Intercept and modify config before processing
document.addEventListener('htmx:configuring', e => {
  e.detail.config.headers = { 'X-Custom': 'value' };
});

// Cancel request based on condition
document.addEventListener('htmx:beforeRequest', e => {
  if (someCondition) {
    e.preventDefault(); // Cancels execution
  }
});

// React to successful completion
document.addEventListener('htmx:afterSettle', e => {
  console.log('Request completed for:', e.detail.url);
});

// Handle errors
document.addEventListener('htmx:error', e => {
  showErrorNotification(e.detail.error.message);
});
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

| Bundle                                    | Global                        | Size (gzip) | Languages          |
| ----------------------------------------- | ----------------------------- | ----------- | ------------------ |
| `browser.global.js`                       | `LokaScriptSemantic`          | 90 KB       | All 24             |
| `browser-priority.priority.global.js`     | `LokaScriptSemanticPriority`  | 48 KB       | 11 priority        |
| `browser-western.western.global.js`       | `LokaScriptSemanticWestern`   | 30 KB       | en, es, pt, fr, de |
| `browser-east-asian.east-asian.global.js` | `LokaScriptSemanticEastAsian` | 24 KB       | ja, zh, ko         |
| `browser-es-en.es-en.global.js`           | `LokaScriptSemanticEsEn`      | 25 KB       | en, es             |
| `browser-en.en.global.js`                 | `LokaScriptSemanticEn`        | 20 KB       | en only            |
| `browser-es.es.global.js`                 | `LokaScriptSemanticEs`        | 16 KB       | es only            |

Choose the smallest bundle that covers your target languages. See `packages/semantic/README.md` for details.

### Multilingual Bundle (Recommended for i18n)

For developers writing hyperscript in their native language:

```html
<!-- Load both bundles -->
<script src="lokascript-semantic.browser.global.js"></script>
<script src="lokascript-multilingual.js"></script>
<script>
  // Execute in any of 24 supported languages
  await lokascript.execute('토글 .active', 'ko');      // Korean
  await lokascript.execute('トグル .active', 'ja');    // Japanese
  await lokascript.execute('alternar .active', 'es');  // Spanish

  // Translate between languages
  const korean = await lokascript.translate('toggle .active', 'en', 'ko');
</script>
```

**Total size:** ~511 KB (250 KB + 261 KB) vs 924 KB with full bundle

### Full Bundle Usage

```html
<script src="lokascript-browser.js"></script>
<script src="lokascript-i18n.min.js"></script>
<script src="lokascript-semantic.browser.global.js"></script>
<script>
  // Grammar transformation (i18n)
  const result = LokaScriptI18n.translate('on click toggle .active', 'en', 'ja');

  // Semantic parsing (24 languages)
  const parsed = LokaScriptSemantic.parse('トグル .active', 'ja');
  const translations = LokaScriptSemantic.getAllTranslations('toggle .active', 'en');
</script>
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HyperFixi** is a complete \_hyperscript ecosystem with server-side compilation, multi-language i18n (24 languages including SOV/VSO grammar transformation), semantic-first multilingual parsing, and comprehensive developer tooling. Engine packages are published under `@hyperfixi/*`, multilingual packages under `@lokascript/*`.

- **8100+ tests** passing across all suites
- **203 KB** browser bundle (gzipped, 39% reduction from original)
- **\_hyperscript compatible** — tested via gallery examples, bundle compatibility matrix, and command/expression browser tests (Playwright)

## Monorepo Structure

```
packages/
├── core/           # Main hyperscript runtime, parser, commands (primary development)
│   ├── src/
│   │   ├── parser/           # Hyperscript parser with CommandNodeBuilder pattern
│   │   ├── runtime/          # Runtime execution engine
│   │   ├── commands/         # All command implementations (tree-shakeable factories)
│   │   └── expressions/      # 6 expression categories (references, logical, etc.)
│   └── dist/                 # Built bundles (hyperfixi.js)
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
├── hyperscript-adapter/  # Multilingual plugin for original _hyperscript (preprocessor)
│   └── src/              # See packages/hyperscript-adapter/CLAUDE.md
│
├── framework/       # Shared DSL framework (createMultilingualDSL, DomainRegistry, CrossDomainDispatcher)
├── compilation-service/  # Multi-target codegen (React, Vue, Svelte components; Playwright tests)
├── mcp-server/      # MCP server exposing all tools (hyperscript + domain DSLs)
├── aot-compiler/    # Ahead-of-time compiler (hyperscript → JS, semantic → JS)
├── server-bridge/   # Server-side route extraction from HTML
│
├── domain-sql/      # SQL DSL (8 languages: en, es, ja, ar, ko, zh, tr, fr)
├── domain-bdd/      # BDD/Gherkin DSL (8 languages)
├── domain-behaviorspec/  # Interaction testing DSL (8 languages)
├── domain-jsx/      # JSX/React DSL (8 languages)
├── domain-llm/      # LLM prompt DSL (8 languages)
├── domain-todo/     # Todo management DSL (8 languages)
├── domain-flow/     # Reactive data flow DSL (8 languages)
├── domain-voice/    # Voice/accessibility commands DSL (8 languages)
├── domain-learn/    # Language learning DSL (10 languages)
│
├── patterns-reference/  # Queryable patterns database with multilingual translations
├── language-server/     # LSP implementation for LokaScript/hyperscript (21 languages)
├── behaviors/           # Reusable hyperscript behaviors (draggable, sortable, etc.)
├── types-browser/       # TypeScript type definitions for browser globals
│
├── mcp-server-hyperscript/      # MCP server for original _hyperscript (zero HyperFixi deps)
├── language-server-hyperscript/ # LSP for original _hyperscript
├── multilingual-hyperscript/    # Multilingual plugin for original _hyperscript (24 languages)
├── vscode-extension/            # VSCode extension for LokaScript
├── vscode-extension-hyperscript/ # VSCode extension for original _hyperscript
│
└── [other packages: smart-bundling, developer-tools, testing-framework, ast-toolkit, etc.]

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

#### Stale-dist auto-rebuild

Both `npm test --prefix packages/<X>` and `npm run test:check` auto-rebuild any workspace dependency whose `src/` is newer than its `dist/` (via [scripts/ensure-fresh.sh](scripts/ensure-fresh.sh)). Per-package `pretest` hooks cover the first path; [scripts/test-check-all.sh](scripts/test-check-all.sh) runs `ensure-fresh` upfront for the second (npm pre/post hooks don't fire for `:check` variants). Manual escape hatch: `npm run check:fresh`.

When you add a new internal-dep relationship between workspace packages, add the dep to the consumer's `pretest` in its `package.json` so its `dist/` stays fresh during tests.

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
- **Parallel execution**: jobs run in parallel after build completes
- **Two-tier job set**: full matrix on `pull_request`, slim skew-detector set on `push` to main/develop
- **Node 24 LTS**: Active LTS release (EOL April 2028)
- **Smart failure handling**: Known failures (behaviors, SOV/VSO languages) marked with `continue-on-error`

**Jobs:**

| #   | Job                       | PR  | push main/develop | Notes                                            |
| --- | ------------------------- | --- | ----------------- | ------------------------------------------------ |
| 1   | `build`                   | ✓   | ✓                 | Build all packages once, upload artifacts        |
| 2   | `export-validation`       | ✓   | ✓                 | Verify package.json exports resolve to dist      |
| 3   | `lint-typecheck`          | ✓   | ✓                 | ESLint + TypeScript checks                       |
| 4   | `unit-tests`              | ✓   | ✓                 | Vitest tests on Node 24                          |
| 5   | `coverage`                | —   | main only         | Codecov upload (already gated to push+main)      |
| 6   | `browser-tests`           | ✓   | —                 | Playwright; PR-only (slim post-merge)            |
| 7   | `multilingual-validation` | ✓   | —                 | 20-language sweep; PR-only (slim post-merge)     |
| 8   | `bundle-size`             | ✓   | —                 | Size report; PR-only (slim post-merge)           |
| 9   | `mcp-demos`               | ✓   | —                 | Demo capture + drift check; PR-only              |
| 10  | `benchmarks`              | —   | main only         | Perf trend tracking (already gated to push+main) |

The four PR-only jobs already ran against the merged-as-PR code, so re-running them on the post-merge push to main wastes ~60 min runner-time per merge. Merge-skew is caught by `build` + `lint-typecheck` + `unit-tests` (still run on push). For perfect skew detection without duplication, see the merge-queue note in `.github/workflows/ci.yml`.

**Triggers:**

- Push to `main` or `develop` (slim job set — see table)
- Pull requests to `main` or `develop` (full job set)
- Concurrency: Cancels in-progress runs on new push (per `${{ github.workflow }}-${{ github.ref }}`; pre-merge and post-merge runs are on different refs so the post-merge run is NOT cancelled)

**Known Issues:**

- Behavior tests: Draggable, Sortable, Resizable not fully implemented (continue-on-error)
- SOV/VSO languages: Japanese, Korean, Turkish have lower pass rates than SVO languages (continue-on-error)

### Multilingual parse rate ≠ fidelity

The `multilingual-validation` parse rate counts a translation as passing when the
semantic parser returns a **non-null** node — **not** when that node is a faithful
translation. A complex pattern can parse non-null while dropping most of the
source's commands (e.g. an `if/focus/halt` body collapsing to a bare `if`). So a
"100% / 99%" parse rate means "parses", not "parses correctly".

The harness computes a structural **fidelity** signal (`packages/testing-framework/src/multilingual/fidelity.ts`):
the fraction of the English reference parse's command actions present in each
translation. Passes below 50% fidelity are reported as **degenerate passes** (the
console run prints a `⚠ Degenerate passes` section), and per-language
`avgFidelity` / `degeneratePasses` are tracked in the committed baseline.

The `--regression` gate ratchets on this: a **faithful** baseline pass that becomes
a **degenerate** pass fails CI (tolerance 3, to absorb baseline noise — same spirit
as the parse-rate ±2pt tolerance). This prevents fidelity backsliding without
demanding the ~232 existing degenerate passes be fixed at once. After an
_intentional_ fidelity change, regenerate the baseline (`--save-baseline`). The
remaining degenerate passes (mostly block-body translation — `if-*`, `fetch-*`
states, `async-block`) are tracked in `docs-internal/MULTILINGUAL_ROADMAP.md`.

**Other Workflows:**

- `.github/workflows/publish.yml` - Manual npm publishing (workflow_dispatch)
- `.github/workflows/pre-publish-check.yml` - Pre-publish validation (workflow_dispatch)

**Archived Workflows:**

- See `.github/workflows/archive/README.md` for previously consolidated workflows

## Architecture

### Command Pattern

All 57 commands use `CommandImplementation<TInput, TOutput, TypedExecutionContext>`:

```typescript
// packages/core/src/commands/data/increment.ts
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
- Bundles: lite (1.9 KB), lite-plus (2.6 KB), hybrid-complete (7.3 KB), hybrid-hx (9.5 KB), hybrid-hx-v4 (~257 KB), minimal (58 KB), standard (63 KB), browser (203 KB)
- Prints ASCII compatibility matrix showing feature support across all bundles

### Using Behaviors (Browser)

Include the resolver bundle after core — all standard behaviors resolve on demand:

```html
<script src="hyperfixi.js"></script>
<script src="resolver.browser.global.js"></script>
<!-- install Toggleable, Draggable, etc. just work -->
<button _="install Toggleable(cls: 'highlighted')">Toggle</button>
```

Behaviors are hyperscript source strings compiled on first use. The resolver bundle is 3.8 KB gzipped.

### Dynamic Class Selectors

`.{varName}` resolves a variable as a CSS class name in `toggle`, `add`, and `remove`:

```hyperscript
behavior MyBehavior(cls)
  on click toggle .{cls} on me
end
```

### Behavior Resolver Hook

External code can register a resolver for custom behaviors:

```javascript
window._hyperscript.behaviors.resolve = name => {
  /* compile & register, return true */
};
window._hyperscript.behaviors.set(name, { name, parameters, eventHandlers, initBlock });
```

### Adding a New Command

1. Create implementation in `packages/core/src/commands/{category}/{name}.ts`
2. Register a factory export in `packages/core/src/commands/index.ts` and add the command name to the `COMMANDS` set in `packages/core/src/parser/parser-constants.ts`
3. Register the factory in the runtime entry points that should include it (`packages/core/src/runtime/runtime.ts` and any relevant `packages/core/src/compatibility/browser-bundle-*.ts`)
4. Add parser support in `packages/core/src/parser/command-parsers/` (only if the command needs a non-generic parser — simple commands use the default identifier-plus-args parser)
5. For lite/hybrid bundle coverage, add cases to `packages/core/src/bundle-generator/templates.ts`, `parser-templates.ts`, and `template-capabilities.ts`
6. Add reference/LSP entries in `packages/core/src/reference/index.ts` and `packages/core/src/lsp-metadata.ts`
7. Write tests in `packages/core/src/commands/{category}/__tests__/{name}.test.ts`

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
} from '@hyperfixi/vite-plugin';

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
hyperfixi.debugControl.enable(); // Enable detailed logging
hyperfixi.debugControl.disable(); // Disable logging
hyperfixi.debugControl.isEnabled(); // Check status
hyperfixi.debugControl.status(); // Get detailed status
```

Or set localStorage directly:

```javascript
localStorage.setItem('hyperfixi:debug', '*');
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
window.addEventListener('hyperfixi:semantic-parse', e => {
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

### API v2 (Recommended)

The new API provides cleaner methods with structured results:

```javascript
import { hyperscript } from 'hyperfixi';

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

HyperFixi uses TypeScript conditional types for zero-cost type safety across browser and server environments:

**Browser code** (full DOM type safety):

```typescript
import type { BrowserEventPayload } from '@hyperfixi/core/registry/browser';

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
import type { UniversalEventPayload } from '@hyperfixi/core/registry/universal';

function handle(payload: UniversalEventPayload) {
  if (payload.target instanceof Element) {
    payload.target.classList.add('active'); // ✅ Type-safe
  }
}
```

See [TYPE_SAFETY_DESIGN.md](docs-internal/analysis/TYPE_SAFETY_DESIGN.md) for implementation details.

## Important Files

| File                                                     | Purpose                                      |
| -------------------------------------------------------- | -------------------------------------------- |
| `packages/core/src/runtime/runtime.ts`                   | Main runtime (extends RuntimeBase)           |
| `packages/core/src/parser/parser.ts`                     | Hyperscript parser (~3000 lines)             |
| `packages/core/src/commands/`                            | All command implementations (by category)    |
| `packages/core/src/registry/`                            | Registry system (commands, events, context)  |
| `packages/core/src/registry/browser-types.ts`            | Browser-specific types                       |
| `packages/core/src/api/hyperscript-api.ts`               | Main API implementation (v2)                 |
| `packages/core/docs/API.md`                              | API documentation                            |
| `packages/server-integration/src/types/`                 | Server-specific types                        |
| `packages/i18n/src/grammar/transformer.ts`               | GrammarTransformer class                     |
| `packages/i18n/src/browser.ts`                           | Browser bundle exports                       |
| `packages/semantic/src/parser/semantic-parser.ts`        | Semantic parser                              |
| `packages/semantic/src/tokenizers/`                      | 24 language tokenizers                       |
| `packages/framework/src/api/create-dsl.ts`               | `createMultilingualDSL()` factory            |
| `packages/framework/src/api/domain-registry.ts`          | Domain registry + MCP tool generation        |
| `packages/framework/src/api/dispatcher.ts`               | `CrossDomainDispatcher` (auto-detect domain) |
| `packages/mcp-server/src/tools/domain-registry-setup.ts` | Domain registrations for MCP server          |
| `packages/domain-flow/src/index.ts`                      | FlowScript DSL entry point                   |
| `packages/compilation-service/src/`                      | Component renderers (React, Vue, Svelte)     |

## Vite Plugin (Recommended)

For Vite projects, use `@hyperfixi/vite-plugin` for automatic minimal bundles:

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [hyperfixi()],
};
```

```javascript
// app.js - just import, plugin handles the rest
import 'hyperfixi';
```

The plugin automatically scans your files for `_="..."` attributes and generates a bundle with only the commands you use. Options:

```javascript
hyperfixi({
  extraCommands: ['fetch'], // Always include these commands
  extraBlocks: ['if'], // Always include these blocks
  positional: true, // Include positional expressions
  htmx: true, // Enable htmx integration
  debug: true, // Verbose logging
});
```

## Browser Bundles

### Choosing your bundle

Decision tree for the most common cases:

1. **Using `@hyperfixi/vite-plugin`?** Don't pick a bundle by hand — the plugin scans your project and emits the right one (minimal handcrafted when possible, falls back to `hx-v4` when it spots htmx v4 features). See [vite plugin README](packages/vite-plugin/README.md).
2. **Need `hx-live`, `bind`, `when`, SSE, or WebSocket?** Use `hyperfixi-hx-v4.js` (~257 KB gz). Single script tag, everything auto-installed. The size cost buys correctness — the slim runtime can't satisfy these features (its `set` doesn't fire `notifyGlobalWrite`, the slim parser doesn't know reactive features, and SSE/WS modules aren't wired).
3. **Need only htmx v1/v2 attributes (`hx-get`/`hx-post`/etc.)?** Use `hyperfixi-hx.js` (~13 KB gz). Includes htmx-compat + the slim hybrid runtime for `_=` attributes. No reactivity, no streaming.
4. **Pure hyperscript (`_=` attributes), ~85% feature coverage, smallest realistic size?** Use `hyperfixi-hybrid-complete.js` (~7.3 KB gz). Full AST parser, expressions, event modifiers, block commands (`if`, `for`, `repeat`, `while`, `fetch`).
5. **Tiny static page (toggle / show / hide / put / set)?** Use `hyperfixi-lite.js` (~1.9 KB gz). Regex parser, 8 commands. Drops to `hyperfixi-lite-plus.js` (~2.6 KB gz) if you need a few more commands + i18n aliases.
6. **Authoring in multiple languages (Japanese, Korean, Arabic, etc.) or need the full semantic parser at runtime?** Use `hyperfixi.js` (full bundle, ~203 KB gz) or `hyperfixi-multilingual.js` (~64 KB, parser-free i18n via the semantic bundle loaded separately).

Rule of thumb: start as small as you can; upgrade when you hit a missing feature. The vite plugin removes this decision entirely for projects that use it.

### Core Bundles

| Bundle                                               | Global                  | Size (gzip) | Use Case                             |
| ---------------------------------------------------- | ----------------------- | ----------- | ------------------------------------ |
| `packages/core/dist/hyperfixi.js`                    | `window.hyperfixi`      | 203.5 KB    | Full bundle with parser              |
| `packages/behaviors/dist/resolver.browser.global.js` | `HyperFixiBehaviors`    | 3.8 KB      | Lazy behavior resolver (8 behaviors) |
| `packages/core/dist/hyperfixi-multilingual.js`       | `window.hyperfixi`      | 64.3 KB     | Multilingual (no parser)             |
| `packages/i18n/dist/lokascript-i18n.min.js`          | `window.LokaScriptI18n` | 35.0 KB     | Grammar transformation               |

> **Note**: As of v2.0.0, the primary bundles are `hyperfixi-*.js`. Backward-compatible aliases (`lokascript-*.js`) are provided but will be removed in v3.0.0. See [MIGRATION.md](MIGRATION.md).

### Lite Bundles (Size-Optimized)

For projects prioritizing bundle size over features:

| Bundle                         | Size (gzip) | Commands  | Features                                                      |
| ------------------------------ | ----------- | --------- | ------------------------------------------------------------- |
| `hyperfixi-lite.js`            | 1.9 KB      | 8         | Regex parser, basic commands                                  |
| `hyperfixi-lite-plus.js`       | 2.6 KB      | 14        | Regex parser, more commands, i18n aliases                     |
| `hyperfixi-hybrid-complete.js` | 7.3 KB      | 21+blocks | Full AST parser, expressions, event modifiers                 |
| `hyperfixi-hx.js`              | 9.7 KB      | 21+blocks | hybrid-complete + htmx/fixi attribute support                 |
| `hyperfixi-hx-v4.js`           | ~257 KB     | 40+blocks | Full runtime + htmx-compat + reactivity (hx-live, bind, when) |

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

### `hx-live` reactive expressions (htmx v4)

When `@hyperfixi/reactivity` is installed, the htmx-compat layer recognizes the htmx v4 `hx-live` attribute and translates it to a `live ... end` block. The body is hyperscript syntax (not JavaScript like upstream htmx v4) — it gets fine-grained dependency tracking and inherits hyperscript's multilingual support:

```html
<div hx-live="put $count into me"></div>
```

The expression re-runs only when its tracked dependencies actually change (not on every DOM mutation, which is the upstream htmx v4 approach). If reactivity isn't installed, the element is skipped with a clear console error pointing to the install command.

**Easiest path: use the `hyperfixi-hx-v4.js` bundle.** It ships the full runtime + `@hyperfixi/reactivity` auto-installed + the htmx-compat layer in a single script tag. Larger than `hyperfixi-hx.js` (~257 KB vs 13 KB gzipped) but no manual plugin wiring required. For size-tuned production builds, use `@hyperfixi/vite-plugin` instead.

```html
<script src="hyperfixi-hx-v4.js"></script>
<div hx-live="put $count into me"></div>
<button _="on click set $count to ($count or 0) + 1">+1</button>
```

See the working demos in [`examples/hx-v4/`](examples/hx-v4/).

### `sse-connect` / `sse-swap` (htmx v4)

The htmx-compat processor recognizes `sse-connect="<url>"` to open a long-lived `EventSource` against the URL, and `sse-swap="<event-name>[, <event-name>...]"` to route named events through the existing `hx-target` / `hx-swap` machinery.

```html
<!-- Stream incoming `tick` events into #notifications -->
<div sse-connect="/events" sse-swap="tick" hx-target="#notifications" hx-swap="beforeend"></div>

<!-- One connection, multiple named events -->
<div
  sse-connect="/feed"
  sse-swap="post, like, comment"
  hx-target="#timeline"
  hx-swap="afterbegin"
></div>
```

The connection auto-reconnects on transient errors with exponential backoff (1s → 2s → 4s …, capped at 30s, 5 retries before giving up). On element removal from the DOM, the connection is closed automatically via MutationObserver — no leaks. Custom lifecycle events fire on the element: `htmx:sseOpen`, `htmx:sseMessage`, `htmx:sseError`, `htmx:sseClose`.

The `hyperfixi-hx-v4.js` bundle bundles this support; the slim `hyperfixi-hx.js` doesn't ship the SSE module (size budget).

### `ws-connect` / `ws-send` (htmx v4)

WebSocket support follows the same shape as SSE but is bidirectional. `ws-connect="<url>"` on an element opens a per-element WebSocket; `ws-send` on a descendant form or button forwards a JSON-serialized payload over the socket on submit/click.

```html
<div ws-connect="wss://example/api">
  <form ws-send>
    <input name="msg" />
    <button type="submit">Send</button>
  </form>
</div>
```

Incoming messages are routed two ways:

- **JSON envelope** `{ target, swap?, data }` → applies through the existing `hx-target`/`hx-swap` machinery, letting the server drive surgical updates without the client knowing the layout up front.
- **Anything else** → dispatched as `htmx:wsMessage` with the raw text; consumers can subscribe and route however they like.

Reconnect on unclean close uses the same bounded exponential backoff as SSE (1s → 2s → 4s … capped at 30s, 5 retries). Outbound sends queue while the socket is connecting and flush on `htmx:wsOpen`. Lifecycle events: `htmx:wsOpen`, `htmx:wsMessage`, `htmx:wsError`, `htmx:wsClose`.

> **When to use SSE vs WS:** prefer SSE for server-push streams (notifications, telemetry, live feeds) — it's HTTP-native, plays nice with proxies and HTTP/2, and the browser handles reconnect. Reach for WebSockets when you genuinely need a low-latency bidirectional channel (chat, collaborative editing, control planes). SSE is the documented default for that reason.

The `hyperfixi-hx-v4.js` bundle bundles this support; the slim `hyperfixi-hx.js` doesn't.

### Localized htmx attribute names (Phase 8)

The htmx-compat layer in `hyperfixi-hx-v4.js` recognizes localized attribute names per-element based on the nearest `lang=` ancestor. Spanish authors can write `hx-obtener` / `hx-objetivo` / `sse-conectar`; Japanese authors `hx-取得` / `hx-ターゲット`; Arabic `hx-احصل` / `hx-هدف`. The orchestrator translates them to canonical English (`hx-get` / `hx-target` / `sse-connect`) before they hit the existing processor paths.

```html
<script src="hyperfixi-hx-v4.js"></script>
<!-- Opt in to languages by loading their vocab modules. -->
<script src="packages/core/vocab/htmx/es.js"></script>
<script src="packages/core/vocab/htmx/ja.js"></script>

<section lang="es">
  <button hx-obtener="/api/usuarios" hx-objetivo="#out">Cargar</button>
</section>
<section lang="ja">
  <button hx-取得="/api/ユーザー" hx-ターゲット="#out">読み込む</button>
</section>
```

**Resolution order** for `langOf(element)`:

1. `data-hyperfixi-lang` on the element itself
2. `data-hyperfixi-lang` on any ancestor
3. `lang=` on any ancestor (HTML standard)
4. `'en'` fallback

Regional variants collapse to base codes (`es-MX` → `es`). Elements outside any lang scope use English literals — same behavior as before Phase 8. Missing-vocab langs log a one-time console warning per language and fall back to English.

**Bundled vocab modules** (`packages/core/vocab/htmx/`) cover 8 priority languages — en, es, fr, ja, zh, ar, ko, de. Each is a self-registering `<script>` tag (loka-js convention). To add another language: edit the keyword translations in `packages/semantic/src/generators/profiles/{lang}.ts` and run `npm run generate:htmx-vocab --prefix packages/core`.

**The `hx-` / `sse-` / `ws-` prefixes are preserved across languages** — only the suffix is localized. Spanish writes `hx-obtener`, not `xx-obtener`. The brand prefix doubles as a discovery anchor.

**Out of scope** for this arc: localizing the `_=` hyperscript attribute itself. The vocab orchestrator translates htmx-compat attribute names only.

See the live demos in [`examples/hx-v4-i18n/`](examples/hx-v4-i18n/).

### htmx Lifecycle Events

The htmx compatibility layer dispatches CustomEvents at key points in the request lifecycle:

| Event                | When                                                | Cancelable | Detail                     |
| -------------------- | --------------------------------------------------- | ---------- | -------------------------- |
| `htmx:configuring`   | After attributes collected, before translation      | Yes        | `{ config, element }`      |
| `htmx:beforeRequest` | Before hyperscript execution                        | Yes        | `{ element, url, method }` |
| `htmx:afterSettle`   | After successful execution                          | No         | `{ element, target }`      |
| `htmx:error`         | On execution failure                                | No         | `{ element, error }`       |
| `htmx:sseOpen`       | SSE connection opens                                | No         | `{ url }`                  |
| `htmx:sseMessage`    | SSE message received (any event)                    | No         | `{ url, event?, data }`    |
| `htmx:sseError`      | SSE error / connection lost                         | No         | `{ url, error or event }`  |
| `htmx:sseClose`      | SSE connection closed (manual or after retry limit) | No         | `{ url }`                  |
| `htmx:wsOpen`        | WS connection opens                                 | No         | `{ url }`                  |
| `htmx:wsMessage`     | WS message received (raw or envelope)               | No         | `{ url, envelope?, data }` |
| `htmx:wsError`       | WS error                                            | No         | `{ url, error or event }`  |
| `htmx:wsClose`       | WS connection closed                                | No         | `{ url, code, reason }`    |

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
<script src="hyperfixi-multilingual.js"></script>
<script>
  // Execute in any of 24 supported languages
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
<script src="hyperfixi.js"></script>
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

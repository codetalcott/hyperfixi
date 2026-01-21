# Export Strategies in LokaScript

This guide explains how to import and use LokaScript packages in different environments (Node.js, bundlers, browsers) with optimal tree-shaking and type safety.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Package (@lokascript/core)](#core-package-lokascriptcore)
- [Semantic Package (@lokascript/semantic)](#semantic-package-lokascriptsemantic)
- [I18n Package (@lokascript/i18n)](#i18n-package-lokascripti18n)
- [Tree-Shaking Optimization](#tree-shaking-optimization)
- [Migration Guide (v1 → v2)](#migration-guide-v1--v2)

---

## Quick Start

### Node.js / Bundlers (Recommended)

```typescript
// Core - Named imports (best tree-shaking)
import { hyperscript, compile, execute, parse } from '@lokascript/core';

// Semantic - Multilingual parsing
import { parse as semanticParse, translate } from '@lokascript/semantic';

// I18n - Grammar transformation
import { GrammarTransformer, translate as i18nTranslate } from '@lokascript/i18n';
```

### Browser (via CDN or local file)

```html
<!-- Core - Full bundle (668KB) -->
<script src="https://cdn.jsdelivr.net/npm/@lokascript/core/dist/lokascript-browser.js"></script>

<!-- Semantic - Browser bundle (261KB) -->
<script src="https://cdn.jsdelivr.net/npm/@lokascript/semantic/dist/lokascript-semantic.browser.global.js"></script>

<!-- I18n - Browser bundle (68KB) -->
<script src="https://cdn.jsdelivr.net/npm/@lokascript/i18n/dist/lokascript-i18n.min.js"></script>

<script>
  // Access via global variables
  window.lokascript.execute('toggle .active');
  window.LokaScriptSemantic.parse('トグル .active', 'ja');
  window.LokaScriptI18n.translate('on click toggle .active', 'en', 'ja');
</script>
```

---

## Core Package (@lokascript/core)

The main runtime and parser for LokaScript/hyperscript.

### Node.js / Bundlers

#### Main API (Named Imports)

```typescript
import { hyperscript } from '@lokascript/core';

// Use the API object
hyperscript.compile('on click toggle .active');
hyperscript.execute('toggle .active', element);
hyperscript.parse('set x to 5');
```

#### Individual Functions (Best Tree-Shaking)

```typescript
import { compile, execute, parse, createRuntime } from '@lokascript/core';

// Use functions directly
const ast = parse('toggle .active');
const runtime = createRuntime();
await execute('toggle .active', element);
```

#### Subpath Imports (Granular Control)

```typescript
// Parser only (no runtime)
import { parse } from '@lokascript/core/parser';

// Runtime only (no parser)
import { createRuntime } from '@lokascript/core/runtime';

// Specific commands
import { ToggleCommand, AddCommand } from '@lokascript/core/commands';

// Specific expressions
import { AsExpression, FirstExpression } from '@lokascript/core/expressions';

// Behaviors
import { BoostedBehavior } from '@lokascript/core/behaviors';

// Multilingual API
import { MultilingualHyperscript } from '@lokascript/core/multilingual';
```

### Browser

#### Full Bundle (with parser)

```html
<script src="node_modules/@lokascript/core/dist/lokascript-browser.js"></script>
<script>
  // Global: window.lokascript
  window.lokascript.execute('toggle .active');

  // Also available as: window._hyperscript (compatibility alias)
  window._hyperscript.compile('on click add .highlight');
</script>
```

**Size:** 668 KB (unminified)

#### Multilingual Bundle (without parser)

```html
<script src="node_modules/@lokascript/core/dist/lokascript-multilingual.js"></script>
<script>
  // Smaller bundle, execution only
  await window.lokascript.execute('토글 .active', 'ko')
  await window.lokascript.execute('トグル .active', 'ja')
</script>
```

**Size:** 256 KB (39% smaller than full bundle)

#### Minimal Bundle

```html
<script src="node_modules/@lokascript/core/dist/lokascript-browser-minimal.js"></script>
```

**Size:** 284 KB (core features only)

#### Standard Bundle

```html
<script src="node_modules/@lokascript/core/dist/lokascript-browser-standard.js"></script>
```

**Size:** 285 KB (balanced features)

### Package.json Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./parser": { "types": "./dist/parser/index.d.ts", "import": "./dist/parser/index.mjs" },
    "./runtime": { "types": "./dist/runtime/index.d.ts", "import": "./dist/runtime/index.mjs" },
    "./browser": { "default": "./dist/lokascript-browser.js" },
    "./browser/multilingual": { "default": "./dist/lokascript-multilingual.js" },
    "./browser/minimal": { "default": "./dist/lokascript-browser-minimal.js" },
    "./browser/standard": { "default": "./dist/lokascript-browser-standard.js" },
    "./commands": { "types": "./dist/commands/index.d.ts", "import": "./dist/commands/index.mjs" },
    "./expressions": {
      "types": "./dist/expressions/index.d.ts",
      "import": "./dist/expressions/index.mjs"
    },
    "./behaviors": {
      "types": "./dist/behaviors/index.d.ts",
      "import": "./dist/behaviors/index.mjs"
    },
    "./multilingual": {
      "types": "./dist/multilingual/index.d.ts",
      "import": "./dist/multilingual/index.mjs"
    }
  }
}
```

---

## Semantic Package (@lokascript/semantic)

Semantic-first multilingual parsing for 13 languages.

### Node.js / Bundlers

#### Complete API (All Exports)

```typescript
import { parse, translate, createSemanticAnalyzer } from '@lokascript/semantic';

// Parse in any of 13 languages
const result = parse('トグル .active', 'ja');
const result2 = parse('alternar .active', 'es');

// Translate between languages
const korean = translate('toggle .active', 'en', 'ko');

// Create custom analyzer
const analyzer = createSemanticAnalyzer();
```

#### Type Definitions

```typescript
import type { SemanticNode, SemanticValue, TranslationResult } from '@lokascript/semantic';
```

### Browser (IIFE Bundle)

```html
<script src="node_modules/@lokascript/semantic/dist/lokascript-semantic.browser.global.js"></script>
<script>
  // Global: window.LokaScriptSemantic
  const result = LokaScriptSemantic.parse('トグル .active', 'ja');

  // Get all translations
  const translations = LokaScriptSemantic.getAllTranslations('toggle .active', 'en');

  console.log(translations.ja); // 'トグル .active'
  console.log(translations.ko); // '토글 .active'
  console.log(translations.es); // 'alternar .active'
</script>
```

**Size:** 261 KB (IIFE format)

### Package.json Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./browser": {
      "default": "./dist/lokascript-semantic.browser.global.js"
    }
  }
}
```

### Supported Languages

The semantic parser supports 13 languages with native word order:

| Language   | Code | Example                                              |
| ---------- | ---- | ---------------------------------------------------- |
| English    | `en` | `toggle .active`                                     |
| Japanese   | `ja` | `トグル .active` or `#button の .active を 切り替え` |
| Spanish    | `es` | `alternar .active`                                   |
| Korean     | `ko` | `토글 .active`                                       |
| Arabic     | `ar` | `بدّل .active`                                       |
| Turkish    | `tr` | `değiştir .active`                                   |
| Chinese    | `zh` | `切换 .active`                                       |
| Portuguese | `pt` | `alternar .active`                                   |
| French     | `fr` | `basculer .active`                                   |
| German     | `de` | `umschalten .active`                                 |
| Indonesian | `id` | `alihkan .active`                                    |
| Quechua    | `qu` | `tikray .active`                                     |
| Swahili    | `sw` | `geuza .active`                                      |

---

## I18n Package (@lokascript/i18n)

Grammar transformation for natural language word order (SOV, VSO, SVO).

### Node.js / Bundlers

```typescript
import { GrammarTransformer, translate } from '@lokascript/i18n';

// Transform to Japanese (SOV word order)
const transformer = new GrammarTransformer();
const japanese = transformer.transform('on click toggle .active', 'en', 'ja');
// Result: '#button を クリック で 切り替え'

// Or use the convenience function
const result = translate('toggle .active', 'en', 'ja');
```

### Browser (UMD Bundle)

```html
<script src="node_modules/@lokascript/i18n/dist/lokascript-i18n.min.js"></script>
<script>
  // Global: window.LokaScriptI18n
  const japanese = LokaScriptI18n.translate('on click toggle .active', 'en', 'ja');

  console.log(japanese); // クリック で .active を 切り替え
</script>
```

**Size:** 68 KB (minified UMD)

### Package.json Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./browser": {
      "import": "./dist/browser.mjs",
      "require": "./dist/browser.js"
    }
  }
}
```

### Grammar Transformation Features

- **SOV Languages** (Japanese, Korean, Turkish): Subject-Object-Verb order
- **VSO Languages** (Arabic): Verb-Subject-Object order
- **SVO Languages** (English, Spanish, Chinese): Subject-Verb-Object order
- **Agglutinative Suffixes** (Japanese particles: を, で, に)
- **Semantic Role Mapping** (agent, patient, instrument, destination)

---

## Tree-Shaking Optimization

### Best Practices

#### ✅ Good - Explicit Named Imports

```typescript
// Bundlers can eliminate unused code
import { compile, execute } from '@lokascript/core';
import { parse } from '@lokascript/core/parser';
import { ToggleCommand } from '@lokascript/core/commands';
```

**Result:** Only the functions you use are included in your bundle.

#### ❌ Bad - Import Everything

```typescript
// Entire package gets bundled
import * as lokascript from '@lokascript/core';
```

**Result:** Your bundle includes code you don't use.

#### ❌ Bad - Deep Imports

```typescript
// May break with internal refactoring
import { parse } from '@lokascript/core/dist/parser/parser';
```

**Result:** Bypasses package.json exports, fragile imports.

### Bundle Size Comparison

Using `@lokascript/core` with different import strategies:

| Import Strategy                    | Bundle Size | Reduction   |
| ---------------------------------- | ----------- | ----------- |
| `import * from '@lokascript/core'` | 668 KB      | baseline    |
| Named imports (5 functions)        | ~350 KB     | 48% smaller |
| Subpath imports (`/parser` only)   | ~280 KB     | 58% smaller |
| Multilingual bundle (no parser)    | 256 KB      | 62% smaller |

### Recommended Import Patterns

```typescript
// For apps that compile hyperscript
import { compile, createRuntime } from '@lokascript/core';

// For apps that only execute pre-compiled scripts
import { execute, createRuntime } from '@lokascript/core/runtime';

// For tools that only parse (no execution)
import { parse } from '@lokascript/core/parser';

// For specific command usage
import { ToggleCommand, AddCommand, RemoveCommand } from '@lokascript/core/commands';
```

---

## Migration Guide (v1 → v2)

### Breaking Change: Default Export Removed

**v1 (Old):**

```typescript
import lokascript from '@lokascript/core'; // ❌ No longer works
import core from '@lokascript/core'; // ❌ No longer works
```

**v2 (New):**

```typescript
import { hyperscript } from '@lokascript/core'; // ✅ Required
import { hyperscript as lokascript } from '@lokascript/core'; // ✅ Alias
```

### Compatibility Alias

The `_hyperscript` export remains for backward compatibility:

```typescript
import { _hyperscript } from '@lokascript/core';
_hyperscript.compile('on click toggle .active');
```

### Browser Migration

**v1 (Old):**

```html
<script src="lokascript-core.js"></script>
<script>
  // Default export available
  const api = window.lokascript || window.default;
</script>
```

**v2 (New):**

```html
<script src="lokascript-browser.js"></script>
<script>
  // Named export only
  window.lokascript.execute('toggle .active');
  window._hyperscript.compile('...'); // Compatibility alias
</script>
```

### Why This Change?

**Benefits:**

- ✅ **Better tree-shaking:** Bundlers eliminate unused code more effectively
- ✅ **Explicit imports:** Clear what's being imported, better IDE autocomplete
- ✅ **Consistency:** Aligns with semantic and i18n packages
- ✅ **Bundle size:** ~15% reduction in typical usage scenarios

**Trade-off:**

- ⚠️ **One-time migration:** Existing code must update imports

### Automated Migration

Use a codemod to update imports automatically:

```bash
# Find all default imports
grep -r "import.*from '@lokascript/core'" src/ --include="*.ts"

# Replace with named imports (manual or via sed/awk)
sed -i '' 's/import lokascript from/import { hyperscript as lokascript } from/g' src/**/*.ts
```

---

## Advanced Usage

### Combining Multiple Packages

For full multilingual support with grammar transformation:

```typescript
// All three packages working together
import { hyperscript } from '@lokascript/core';
import { parse } from '@lokascript/semantic';
import { translate } from '@lokascript/i18n';

// Parse natural language input
const semanticNode = parse('#button の .active を 切り替え', 'ja');

// Transform to English
const english = translate(semanticNode.toString(), 'ja', 'en');

// Compile and execute
await hyperscript.execute(english, document.body);
```

### Browser Bundle Combination

```html
<!-- Load all three packages -->
<script src="lokascript-semantic.browser.global.js"></script>
<script src="lokascript-multilingual.js"></script>
<script src="lokascript-i18n.min.js"></script>

<script>
  // Use together
  const parsed = LokaScriptSemantic.parse('トグル .active', 'ja')
  const english = LokaScriptI18n.translate(parsed.toString(), 'ja', 'en')
  await lokascript.execute(english, document.body)
</script>
```

**Total size:** ~585 KB (261 + 256 + 68)

---

## TypeScript Support

All packages include TypeScript definitions.

### Importing Types

```typescript
// Core types
import type {
  HyperscriptAPI,
  CompilationResult,
  ParseResult,
  ExecutionContext,
  CommandNode,
  ASTNode,
} from '@lokascript/core';

// Semantic types
import type { SemanticNode, SemanticValue, TranslationResult } from '@lokascript/semantic';

// I18n types
import type { GrammarProfile, TranslatorOptions, SemanticRole } from '@lokascript/i18n';
```

### Browser Global Types

For TypeScript autocomplete in browser scripts, install type definitions:

```bash
npm install --save-dev @lokascript/types-browser
```

Then configure `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@lokascript/types-browser"]
  }
}
```

Now you get autocomplete for browser globals:

```typescript
// TypeScript knows about window.lokascript
window.lokascript.execute('toggle .active'); // ✓ Type-safe
window.LokaScriptSemantic.parse('...', 'ja'); // ✓ Type-safe
window.LokaScriptI18n.translate('...', 'en', 'ja'); // ✓ Type-safe
```

---

## FAQ

### Why named exports instead of default?

Better tree-shaking, explicit imports, IDE autocomplete, and consistency across all packages.

### Can I still use default exports?

No, default exports were removed in v2. Use `import { hyperscript } from '@lokascript/core'` instead.

### Which bundle should I use in the browser?

- **Full features:** `lokascript-browser.js` (668 KB)
- **Multilingual execution:** `lokascript-multilingual.js` (256 KB, 62% smaller)
- **Core features:** `lokascript-browser-minimal.js` (284 KB)

### How do I optimize bundle size?

Use subpath imports (`@lokascript/core/parser`, `@lokascript/core/runtime`) and named imports for only the functions you need.

### Are there TypeScript definitions for browser globals?

Yes, install `@lokascript/types-browser` for full IDE autocomplete in browser contexts.

### Can I use all three packages together?

Yes! Combine core (runtime), semantic (parsing), and i18n (grammar transformation) for full multilingual support.

---

## Support

- **Documentation:** [https://github.com/codetalcott/lokascript](https://github.com/codetalcott/lokascript)
- **Issues:** [https://github.com/codetalcott/lokascript/issues](https://github.com/codetalcott/lokascript/issues)
- **npm:** [@lokascript/core](https://npmjs.com/package/@lokascript/core)

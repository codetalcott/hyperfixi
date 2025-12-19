# Export Strategies in HyperFixi

This guide explains how to import and use HyperFixi packages in different environments (Node.js, bundlers, browsers) with optimal tree-shaking and type safety.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Package (@hyperfixi/core)](#core-package-hyperfixicore)
- [Semantic Package (@hyperfixi/semantic)](#semantic-package-hyperfixisemantic)
- [I18n Package (@hyperfixi/i18n)](#i18n-package-hyperfixii18n)
- [Tree-Shaking Optimization](#tree-shaking-optimization)
- [Migration Guide (v1 → v2)](#migration-guide-v1--v2)

---

## Quick Start

### Node.js / Bundlers (Recommended)

```typescript
// Core - Named imports (best tree-shaking)
import { hyperscript, compile, execute, parse } from '@hyperfixi/core'

// Semantic - Multilingual parsing
import { parse as semanticParse, translate } from '@hyperfixi/semantic'

// I18n - Grammar transformation
import { GrammarTransformer, translate as i18nTranslate } from '@hyperfixi/i18n'
```

### Browser (via CDN or local file)

```html
<!-- Core - Full bundle (668KB) -->
<script src="https://cdn.jsdelivr.net/npm/@hyperfixi/core/dist/hyperfixi-browser.js"></script>

<!-- Semantic - Browser bundle (261KB) -->
<script src="https://cdn.jsdelivr.net/npm/@hyperfixi/semantic/dist/hyperfixi-semantic.browser.global.js"></script>

<!-- I18n - Browser bundle (68KB) -->
<script src="https://cdn.jsdelivr.net/npm/@hyperfixi/i18n/dist/hyperfixi-i18n.min.js"></script>

<script>
  // Access via global variables
  window.hyperfixi.execute('toggle .active')
  window.HyperFixiSemantic.parse('トグル .active', 'ja')
  window.HyperFixiI18n.translate('on click toggle .active', 'en', 'ja')
</script>
```

---

## Core Package (@hyperfixi/core)

The main runtime and parser for HyperFixi/hyperscript.

### Node.js / Bundlers

#### Main API (Named Imports)

```typescript
import { hyperscript } from '@hyperfixi/core'

// Use the API object
hyperscript.compile('on click toggle .active')
hyperscript.execute('toggle .active', element)
hyperscript.parse('set x to 5')
```

#### Individual Functions (Best Tree-Shaking)

```typescript
import { compile, execute, parse, createRuntime } from '@hyperfixi/core'

// Use functions directly
const ast = parse('toggle .active')
const runtime = createRuntime()
await execute('toggle .active', element)
```

#### Subpath Imports (Granular Control)

```typescript
// Parser only (no runtime)
import { parse } from '@hyperfixi/core/parser'

// Runtime only (no parser)
import { createRuntime } from '@hyperfixi/core/runtime'

// Specific commands
import { ToggleCommand, AddCommand } from '@hyperfixi/core/commands'

// Specific expressions
import { AsExpression, FirstExpression } from '@hyperfixi/core/expressions'

// Behaviors
import { BoostedBehavior } from '@hyperfixi/core/behaviors'

// Multilingual API
import { MultilingualHyperscript } from '@hyperfixi/core/multilingual'
```

### Browser

#### Full Bundle (with parser)

```html
<script src="node_modules/@hyperfixi/core/dist/hyperfixi-browser.js"></script>
<script>
  // Global: window.hyperfixi
  window.hyperfixi.execute('toggle .active')

  // Also available as: window._hyperscript (compatibility alias)
  window._hyperscript.compile('on click add .highlight')
</script>
```

**Size:** 668 KB (unminified)

#### Multilingual Bundle (without parser)

```html
<script src="node_modules/@hyperfixi/core/dist/hyperfixi-multilingual.js"></script>
<script>
  // Smaller bundle, execution only
  await window.hyperfixi.execute('토글 .active', 'ko')
  await window.hyperfixi.execute('トグル .active', 'ja')
</script>
```

**Size:** 256 KB (39% smaller than full bundle)

#### Minimal Bundle

```html
<script src="node_modules/@hyperfixi/core/dist/hyperfixi-browser-minimal.js"></script>
```

**Size:** 284 KB (core features only)

#### Standard Bundle

```html
<script src="node_modules/@hyperfixi/core/dist/hyperfixi-browser-standard.js"></script>
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
    "./browser": { "default": "./dist/hyperfixi-browser.js" },
    "./browser/multilingual": { "default": "./dist/hyperfixi-multilingual.js" },
    "./browser/minimal": { "default": "./dist/hyperfixi-browser-minimal.js" },
    "./browser/standard": { "default": "./dist/hyperfixi-browser-standard.js" },
    "./commands": { "types": "./dist/commands/index.d.ts", "import": "./dist/commands/index.mjs" },
    "./expressions": { "types": "./dist/expressions/index.d.ts", "import": "./dist/expressions/index.mjs" },
    "./behaviors": { "types": "./dist/behaviors/index.d.ts", "import": "./dist/behaviors/index.mjs" },
    "./multilingual": { "types": "./dist/multilingual/index.d.ts", "import": "./dist/multilingual/index.mjs" }
  }
}
```

---

## Semantic Package (@hyperfixi/semantic)

Semantic-first multilingual parsing for 13 languages.

### Node.js / Bundlers

#### Complete API (All Exports)

```typescript
import { parse, translate, createSemanticAnalyzer } from '@hyperfixi/semantic'

// Parse in any of 13 languages
const result = parse('トグル .active', 'ja')
const result2 = parse('alternar .active', 'es')

// Translate between languages
const korean = translate('toggle .active', 'en', 'ko')

// Create custom analyzer
const analyzer = createSemanticAnalyzer()
```

#### Type Definitions

```typescript
import type {
  SemanticNode,
  SemanticValue,
  TranslationResult
} from '@hyperfixi/semantic'
```

### Browser (IIFE Bundle)

```html
<script src="node_modules/@hyperfixi/semantic/dist/hyperfixi-semantic.browser.global.js"></script>
<script>
  // Global: window.HyperFixiSemantic
  const result = HyperFixiSemantic.parse('トグル .active', 'ja')

  // Get all translations
  const translations = HyperFixiSemantic.getAllTranslations('toggle .active', 'en')

  console.log(translations.ja) // 'トグル .active'
  console.log(translations.ko) // '토글 .active'
  console.log(translations.es) // 'alternar .active'
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
      "default": "./dist/hyperfixi-semantic.browser.global.js"
    }
  }
}
```

### Supported Languages

The semantic parser supports 13 languages with native word order:

| Language | Code | Example |
|----------|------|---------|
| English | `en` | `toggle .active` |
| Japanese | `ja` | `トグル .active` or `#button の .active を 切り替え` |
| Spanish | `es` | `alternar .active` |
| Korean | `ko` | `토글 .active` |
| Arabic | `ar` | `بدّل .active` |
| Turkish | `tr` | `değiştir .active` |
| Chinese | `zh` | `切换 .active` |
| Portuguese | `pt` | `alternar .active` |
| French | `fr` | `basculer .active` |
| German | `de` | `umschalten .active` |
| Indonesian | `id` | `alihkan .active` |
| Quechua | `qu` | `tikray .active` |
| Swahili | `sw` | `geuza .active` |

---

## I18n Package (@hyperfixi/i18n)

Grammar transformation for natural language word order (SOV, VSO, SVO).

### Node.js / Bundlers

```typescript
import { GrammarTransformer, translate } from '@hyperfixi/i18n'

// Transform to Japanese (SOV word order)
const transformer = new GrammarTransformer()
const japanese = transformer.transform(
  'on click toggle .active',
  'en',
  'ja'
)
// Result: '#button を クリック で 切り替え'

// Or use the convenience function
const result = translate('toggle .active', 'en', 'ja')
```

### Browser (UMD Bundle)

```html
<script src="node_modules/@hyperfixi/i18n/dist/hyperfixi-i18n.min.js"></script>
<script>
  // Global: window.HyperFixiI18n
  const japanese = HyperFixiI18n.translate(
    'on click toggle .active',
    'en',
    'ja'
  )

  console.log(japanese) // クリック で .active を 切り替え
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
import { compile, execute } from '@hyperfixi/core'
import { parse } from '@hyperfixi/core/parser'
import { ToggleCommand } from '@hyperfixi/core/commands'
```

**Result:** Only the functions you use are included in your bundle.

#### ❌ Bad - Import Everything

```typescript
// Entire package gets bundled
import * as hyperfixi from '@hyperfixi/core'
```

**Result:** Your bundle includes code you don't use.

#### ❌ Bad - Deep Imports

```typescript
// May break with internal refactoring
import { parse } from '@hyperfixi/core/dist/parser/parser'
```

**Result:** Bypasses package.json exports, fragile imports.

### Bundle Size Comparison

Using `@hyperfixi/core` with different import strategies:

| Import Strategy | Bundle Size | Reduction |
|----------------|-------------|-----------|
| `import * from '@hyperfixi/core'` | 668 KB | baseline |
| Named imports (5 functions) | ~350 KB | 48% smaller |
| Subpath imports (`/parser` only) | ~280 KB | 58% smaller |
| Multilingual bundle (no parser) | 256 KB | 62% smaller |

### Recommended Import Patterns

```typescript
// For apps that compile hyperscript
import { compile, createRuntime } from '@hyperfixi/core'

// For apps that only execute pre-compiled scripts
import { execute, createRuntime } from '@hyperfixi/core/runtime'

// For tools that only parse (no execution)
import { parse } from '@hyperfixi/core/parser'

// For specific command usage
import { ToggleCommand, AddCommand, RemoveCommand } from '@hyperfixi/core/commands'
```

---

## Migration Guide (v1 → v2)

### Breaking Change: Default Export Removed

**v1 (Old):**

```typescript
import hyperfixi from '@hyperfixi/core'  // ❌ No longer works
import core from '@hyperfixi/core'       // ❌ No longer works
```

**v2 (New):**

```typescript
import { hyperscript } from '@hyperfixi/core'  // ✅ Required
import { hyperscript as hyperfixi } from '@hyperfixi/core'  // ✅ Alias
```

### Compatibility Alias

The `_hyperscript` export remains for backward compatibility:

```typescript
import { _hyperscript } from '@hyperfixi/core'
_hyperscript.compile('on click toggle .active')
```

### Browser Migration

**v1 (Old):**

```html
<script src="hyperfixi-core.js"></script>
<script>
  // Default export available
  const api = window.hyperfixi || window.default
</script>
```

**v2 (New):**

```html
<script src="hyperfixi-browser.js"></script>
<script>
  // Named export only
  window.hyperfixi.execute('toggle .active')
  window._hyperscript.compile('...')  // Compatibility alias
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
grep -r "import.*from '@hyperfixi/core'" src/ --include="*.ts"

# Replace with named imports (manual or via sed/awk)
sed -i '' 's/import hyperfixi from/import { hyperscript as hyperfixi } from/g' src/**/*.ts
```

---

## Advanced Usage

### Combining Multiple Packages

For full multilingual support with grammar transformation:

```typescript
// All three packages working together
import { hyperscript } from '@hyperfixi/core'
import { parse } from '@hyperfixi/semantic'
import { translate } from '@hyperfixi/i18n'

// Parse natural language input
const semanticNode = parse('#button の .active を 切り替え', 'ja')

// Transform to English
const english = translate(semanticNode.toString(), 'ja', 'en')

// Compile and execute
await hyperscript.execute(english, document.body)
```

### Browser Bundle Combination

```html
<!-- Load all three packages -->
<script src="hyperfixi-semantic.browser.global.js"></script>
<script src="hyperfixi-multilingual.js"></script>
<script src="hyperfixi-i18n.min.js"></script>

<script>
  // Use together
  const parsed = HyperFixiSemantic.parse('トグル .active', 'ja')
  const english = HyperFixiI18n.translate(parsed.toString(), 'ja', 'en')
  await hyperfixi.execute(english, document.body)
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
  ASTNode
} from '@hyperfixi/core'

// Semantic types
import type {
  SemanticNode,
  SemanticValue,
  TranslationResult
} from '@hyperfixi/semantic'

// I18n types
import type {
  GrammarProfile,
  TranslatorOptions,
  SemanticRole
} from '@hyperfixi/i18n'
```

### Browser Global Types

For TypeScript autocomplete in browser scripts, install type definitions:

```bash
npm install --save-dev @hyperfixi/types-browser
```

Then configure `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@hyperfixi/types-browser"]
  }
}
```

Now you get autocomplete for browser globals:

```typescript
// TypeScript knows about window.hyperfixi
window.hyperfixi.execute('toggle .active')  // ✓ Type-safe
window.HyperFixiSemantic.parse('...', 'ja')  // ✓ Type-safe
window.HyperFixiI18n.translate('...', 'en', 'ja')  // ✓ Type-safe
```

---

## FAQ

### Why named exports instead of default?

Better tree-shaking, explicit imports, IDE autocomplete, and consistency across all packages.

### Can I still use default exports?

No, default exports were removed in v2. Use `import { hyperscript } from '@hyperfixi/core'` instead.

### Which bundle should I use in the browser?

- **Full features:** `hyperfixi-browser.js` (668 KB)
- **Multilingual execution:** `hyperfixi-multilingual.js` (256 KB, 62% smaller)
- **Core features:** `hyperfixi-browser-minimal.js` (284 KB)

### How do I optimize bundle size?

Use subpath imports (`@hyperfixi/core/parser`, `@hyperfixi/core/runtime`) and named imports for only the functions you need.

### Are there TypeScript definitions for browser globals?

Yes, install `@hyperfixi/types-browser` for full IDE autocomplete in browser contexts.

### Can I use all three packages together?

Yes! Combine core (runtime), semantic (parsing), and i18n (grammar transformation) for full multilingual support.

---

## Support

- **Documentation:** [https://github.com/hyperfixi/hyperfixi](https://github.com/hyperfixi/hyperfixi)
- **Issues:** [https://github.com/hyperfixi/hyperfixi/issues](https://github.com/hyperfixi/hyperfixi/issues)
- **npm:** [@hyperfixi/core](https://npmjs.com/package/@hyperfixi/core)

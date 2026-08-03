# Migration Guide: v1.x → v2.0.0

## Overview

Version 2.0.0 splits the project into two npm scopes:

- **`@hyperfixi/*`** — Core hyperscript engine (runtime, parser, commands, vite-plugin, etc.)
- **`@lokascript/*`** — Multilingual packages (semantic parsing, i18n, language-server, etc.)

The primary window global is now `window.hyperfixi`. Bundle filenames changed from `lokascript-*.js` to `hyperfixi-*.js`.

**Backward compatibility:** Old `@lokascript/*` engine package names will be published as stub packages that re-export from `@hyperfixi/*`. Old bundle filenames (`lokascript-*.js`) are provided as aliases. `window.lokascript` still works with a deprecation warning.

**Timeline:**

- **v2.0.0** (Current): New names are primary, old names work with deprecation warnings
- **v3.0.0** (Future): Old names and aliases removed

## Quick Migration

### 1. Update npm Packages

```bash
# Before
npm install @lokascript/core @lokascript/vite-plugin

# After
npm install @hyperfixi/core @hyperfixi/vite-plugin
```

**Package name changes:**

| v1.x (Old)                      | v2.0.0 (New)                   |
| ------------------------------- | ------------------------------ |
| `@lokascript/core`              | `@hyperfixi/core`              |
| `@lokascript/behaviors`         | `@hyperfixi/behaviors`         |
| `@lokascript/vite-plugin`       | `@hyperfixi/vite-plugin`       |
| `@lokascript/types-browser`     | `@hyperfixi/types-browser`     |
| `@lokascript/testing-framework` | `@hyperfixi/testing-framework` |
| `@lokascript/developer-tools`   | `@hyperfixi/developer-tools`   |
| `@lokascript/smart-bundling`    | `@hyperfixi/smart-bundling`    |
| `@lokascript/aot-compiler`      | `@hyperfixi/aot-compiler`      |

**Unchanged packages** (stay under `@lokascript`):

- `@lokascript/semantic`
- `@lokascript/i18n`
- `@lokascript/language-server`
- `@lokascript/mcp-server`
- `@lokascript/hyperscript-adapter`
- `@lokascript/patterns-reference`

### 2. Update TypeScript Imports

```typescript
// Before
import { hyperscript } from '@lokascript/core';
import { hyperfixi } from '@lokascript/vite-plugin';
import type { BrowserEventPayload } from '@lokascript/core/registry/browser';

// After
import { hyperscript } from '@hyperfixi/core';
import { hyperfixi } from '@hyperfixi/vite-plugin';
import type { BrowserEventPayload } from '@hyperfixi/core/registry/browser';
```

### 3. Update Bundle References

```html
<!-- Before -->
<script src="lokascript-hybrid-complete.js"></script>

<!-- After -->
<script src="hyperfixi-hybrid-complete.js"></script>
```

**Bundle filename changes:**

| v1.x (Old)                       | v2.0.0 (New)                   |
| -------------------------------- | ------------------------------ |
| `lokascript-browser.js`          | `hyperfixi.js`                 |
| `lokascript-lite.js`             | `hyperfixi-lite.js`            |
| `lokascript-lite-plus.js`        | `hyperfixi-lite-plus.js`       |
| `lokascript-hybrid-complete.js`  | `hyperfixi-hybrid-complete.js` |
| `lokascript-hybrid-hx.js`        | `hyperfixi-hx.js`              |
| `lokascript-browser-minimal.js`  | `hyperfixi-minimal.js`         |
| `lokascript-browser-standard.js` | `hyperfixi-standard.js`        |
| `lokascript-multilingual.js`     | `hyperfixi-multilingual.js`    |

### 4. Update Window Global

```javascript
// Before
window.lokascript.execute('toggle .active', el);

// After
window.hyperfixi.execute('toggle .active', el);
```

### 5. Update Debug localStorage Key

```javascript
// Before
localStorage.setItem('lokascript:debug', '*');

// After
localStorage.setItem('hyperfixi:debug', '*');
```

(The old key still works as a fallback.)

### 6. Update CLI Commands

```bash
# Before
npx lokascript validate src/
npx lokascript-test
npx lokascript-aot compile src/

# After
npx hyperfixi validate src/
npx hyperfixi-test
npx hyperfixi-aot compile src/
```

## Automated Migration

Use find-and-replace across your project:

```bash
# Package imports (only rename engine packages, NOT @lokascript/semantic, @lokascript/i18n, etc.)
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" \) \
  -not -path "*/node_modules/*" \
  -exec perl -i -pe 's#\@lokascript/(core|behaviors|vite-plugin|types-browser|testing-framework|developer-tools|smart-bundling|aot-compiler)#\@hyperfixi/$1#g' {} +

# Bundle references in HTML
find . -type f -name "*.html" \
  -exec sed -i '' 's/lokascript-browser\.js/hyperfixi.js/g' {} + \
  -exec sed -i '' 's/lokascript-hybrid-complete\.js/hyperfixi-hybrid-complete.js/g' {} + \
  -exec sed -i '' 's/lokascript-hybrid-hx\.js/hyperfixi-hx.js/g' {} + \
  -exec sed -i '' 's/lokascript-lite-plus\.js/hyperfixi-lite-plus.js/g' {} + \
  -exec sed -i '' 's/lokascript-lite\.js/hyperfixi-lite.js/g' {} + \
  -exec sed -i '' 's/lokascript-browser-minimal\.js/hyperfixi-minimal.js/g' {} + \
  -exec sed -i '' 's/lokascript-browser-standard\.js/hyperfixi-standard.js/g' {} + \
  -exec sed -i '' 's/lokascript-multilingual\.js/hyperfixi-multilingual.js/g' {} +

# Window global
find . -type f \( -name "*.html" -o -name "*.js" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -exec sed -i '' 's/window\.lokascript/window.hyperfixi/g' {} +
```

## Backward Compatibility

### Bundle File Aliases

Old bundle names still work in v2.0.0 (they are copies of the new names):

```html
<!-- Both work -->
<script src="hyperfixi-hybrid-complete.js"></script>
<!-- New (primary) -->
<script src="lokascript-hybrid-complete.js"></script>
<!-- Old (alias, will be removed in v3.0.0) -->
```

### Window Global

`window.lokascript` still works but shows a console warning:

```javascript
window.lokascript.execute(...)  // Shows deprecation warning
window.hyperfixi.execute(...)   // No warning
```

### npm Stub Packages — retracted (2026-08-03)

Earlier revisions of this guide promised the old `@lokascript/*` engine package names would be republished as v2.0.0 stubs re-exporting from `@hyperfixi/*`. **That will not happen.** By the time the stubs could ship, the migration window had closed — the stranded names see only registry-scanner background traffic (~30 downloads/month, uniform across names) versus thousands on the `@hyperfixi/*` homes — and a silently-working wrapper would keep dead names accumulating new code forever, while forwarding only the main entry (none of `@hyperfixi/core`'s dozens of subpath exports).

Instead, the four `@lokascript/*` engine names that were ever published (`core`, `vite-plugin`, `mcp-server`, `patterns-reference`) are deprecated on npm with pointer messages naming their `@hyperfixi/*` replacement. If you still depend on one, switch the package name — the API at the time of the rename was identical. Full rationale: `stubs/README.md`.

## Why the Rename?

The project has two distinct audiences:

1. **Most users** want a modern hyperscript engine with fixi/htmx integration — "HyperFixi" communicates this immediately
2. **Multilingual users** want to write hyperscript in their native language — "LokaScript" (from Sanskrit "loka" = world) fits this

Having everything under `@lokascript/*` confused the messaging. The dual-scope split makes each product's purpose clear.

## Support

- **GitHub Issues:** https://github.com/codetalcott/hyperfixi/issues
- **Documentation:** https://github.com/codetalcott/hyperfixi#readme

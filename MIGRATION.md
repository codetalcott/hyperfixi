# Migration Guide: hyperfixi → lokascript (v1.1.0)

## Overview

Version 1.1.0 renames all bundles from `hyperfixi-*` to `lokascript-*` to align with the package name (`@lokascript/core`) and the primary window global (`window.lokascript`).

**Timeline:**

- **v1.1.0** (Current): New names, old names work with deprecation warnings
- **v2.0.0** (Future): Old names removed

##Quick Migration

### 1. Update Bundle References

**CDN Users:**

```html
<!-- Before -->
<script src="https://unpkg.com/@lokascript/core/dist/hyperfixi-browser.js"></script>

<!-- After -->
<script src="https://unpkg.com/@lokascript/core/dist/lokascript-browser.js"></script>
```

**NPM Users:**

```javascript
// Before
import '@lokascript/core/browser'; // loads hyperfixi-browser.js

// After
import '@lokascript/core/browser'; // now loads lokascript-browser.js
// (package.json exports updated automatically)
```

### 2. Update Window Global

```javascript
// Before
window.hyperfixi.execute('toggle .active', el);

// After
window.lokascript.execute('toggle .active', el);
```

### 3. Update Import Paths (if using direct paths)

```javascript
// Before
import { runtime } from '@lokascript/core/dist/hyperfixi-browser.js';

// After
import { runtime } from '@lokascript/core/dist/lokascript-browser.js';
```

## Bundle Name Changes

| Old Name                        | New Name                         | Size (gzipped) |
| ------------------------------- | -------------------------------- | -------------- |
| `hyperfixi-browser.js`          | `lokascript-browser.js`          | 203 KB         |
| `hyperfixi-lite.js`             | `lokascript-lite.js`             | 1.9 KB         |
| `hyperfixi-lite-plus.js`        | `lokascript-lite-plus.js`        | 2.6 KB         |
| `hyperfixi-hybrid-complete.js`  | `lokascript-hybrid-complete.js`  | 7.3 KB         |
| `hyperfixi-hybrid-hx.js`        | `lokascript-hybrid-hx.js`        | 9.7 KB         |
| `hyperfixi-browser-minimal.js`  | `lokascript-browser-minimal.js`  | 58 KB          |
| `hyperfixi-browser-standard.js` | `lokascript-browser-standard.js` | 63 KB          |

## Python Package

The Python package has been renamed from `hyperfixi` to `lokascript`:

```bash
# OLD
pip install hyperfixi

# NEW
pip install lokascript
```

**Django Settings:**

```python
# Before
INSTALLED_APPS = [
    'hyperfixi.django',
]

# After
INSTALLED_APPS = [
    'lokascript.django',
]
```

**Template Tags:**

```django
<!-- Both work (backward compatible) -->
{% load hyperfixi %}  <!-- Old (deprecated) -->
{% load lokascript %}  <!-- New (recommended) -->
```

**Management Commands:**

```bash
# Before
python manage.py hyperfixi_check

# After
python manage.py lokascript_check
python manage.py lokascript_bundle
```

## Automated Migration

Use find-and-replace across your project:

```bash
# Bundle references
find . -type f \( -name "*.html" -o -name "*.js" -o -name "*.ts" \) \
  -exec sed -i '' 's/hyperfixi-browser/lokascript-browser/g' {} +

find . -type f \( -name "*.html" -o -name "*.js" -o -name "*.ts" \) \
  -exec sed -i '' 's/hyperfixi-lite/lokascript-lite/g' {} +

# Window global
find . -type f \( -name "*.html" -o -name "*.js" -o -name "*.ts" \) \
  -exec sed -i '' 's/window\.hyperfixi/window.lokascript/g' {} +
```

## Backward Compatibility

### Bundle File Aliases

Old bundle names still work in v1.1.0:

```html
<!-- Both work -->
<script src="lokascript-browser.js"></script>
<!-- New -->
<script src="hyperfixi-browser.js"></script>
<!-- Old (alias) -->
```

⚠️ Aliases will be removed in v2.0.0

### Window Global

`window.hyperfixi` still works but shows a console warning:

```javascript
window.hyperfixi.execute(...)  // ⚠️ Shows deprecation warning
window.lokascript.execute(...)  // ✅ No warning
```

Console warning:

```
[DEPRECATED] window.hyperfixi is deprecated and will be removed in v2.0.0.
Please use window.lokascript instead.
See https://github.com/lokascript/lokascript/blob/main/MIGRATION.md
```

## Troubleshooting

### Issue: Module not found

**Error:** `Cannot find module 'dist/hyperfixi-browser.js'`

**Solution:** Update to new bundle name or install v1.1.0:

```bash
npm install @lokascript/core@latest
```

### Issue: Deprecation warnings in console

**Warning:** "window.hyperfixi is deprecated..."

**Solution:** Update all references to use `window.lokascript`:

```javascript
// Find all occurrences
grep -r "window\.hyperfixi" src/

// Replace with window.lokascript
```

### Issue: Types not found

**Error:** `Property 'hyperfixi' does not exist on type 'Window'`

**Solution:** Update TypeScript types:

```bash
npm install @lokascript/types-browser@latest
```

The types already include both `window.lokascript` and deprecated `window.hyperfixi`.

### Issue: Python import errors

**Error:** `ModuleNotFoundError: No module named 'hyperfixi'`

**Solution:** Uninstall old package and install new one:

```bash
pip uninstall hyperfixi
pip install lokascript
```

Update imports:

```python
# Before
from hyperfixi import hs

# After
from lokascript import hs
```

## Support

- **GitHub Issues:** https://github.com/lokascript/lokascript/issues
- **Discussions:** https://github.com/lokascript/lokascript/discussions
- **Documentation:** https://lokascript.dev (coming soon)

## Timeline for v2.0.0

In v2.0.0 (planned for Q2 2026), the following will be removed:

- ❌ Bundle file aliases (`hyperfixi-*.js` files)
- ❌ `window.hyperfixi` global
- ❌ Deprecation warnings

You will need to have migrated to the new names before upgrading to v2.0.0.

## Why the Name Change?

**lokascript** (from Sanskrit "loka" meaning "world/realm/universe") better reflects the project's multilingual scope:

- 23 languages supported
- SOV/VSO/SVO grammar transformation
- Semantic-first multilingual parsing
- More distinctive and searchable than "hyperfixi"

The rebrand aligns all naming:

- Package: `@lokascript/core`
- Global: `window.lokascript`
- Bundles: `lokascript-*.js`

# HyperFixi Lite Bundles

Size-optimized bundles for projects prioritizing bundle size over features.

## Bundle Comparison

| Bundle | Size (gzip) | Commands | Parser | Use Case |
|--------|-------------|----------|--------|----------|
| `hyperfixi-lite.js` | 1.9 KB | 8 | Regex | Minimal interactivity |
| `hyperfixi-lite-plus.js` | 2.6 KB | 14 | Regex | Basic apps with i18n |
| `hyperfixi-hybrid-complete.js` | 6.7 KB | 21+blocks | Full AST | **Recommended** |

## Feature Matrix

| Feature | Lite | Lite+ | Hybrid Complete |
|---------|------|-------|-----------------|
| `toggle .active` | ✅ | ✅ | ✅ |
| `add/remove .class` | ✅ | ✅ | ✅ |
| `put X into #el` | ✅ | ✅ | ✅ |
| `set :var to X` | ✅ | ✅ | ✅ |
| `increment/decrement` | ❌ | ✅ | ✅ |
| `show/hide/focus/blur` | ❌ | ✅ | ✅ |
| `wait 500ms` | ✅ | ✅ | ✅ |
| `log` | ❌ | ✅ | ✅ |
| i18n aliases | ❌ | ✅ | ✅ |
| `repeat N times...end` | ❌ | ❌ | ✅ |
| `if...else...end` | ❌ | ❌ | ✅ |
| `for each...end` | ❌ | ❌ | ✅ |
| `while...end` | ❌ | ❌ | ✅ |
| `fetch url as json...` | ❌ | ❌ | ✅ |
| Event modifiers (.once, .debounce) | ❌ | ❌ | ✅ |
| Operator precedence | ❌ | ❌ | ✅ |
| Positional (first, last, closest) | ❌ | ❌ | ✅ |
| Function calls (`str.toUpperCase()`) | ❌ | ❌ | ✅ |
| `return` statement | ❌ | ❌ | ✅ |

## Usage

```html
<!-- Recommended: Hybrid Complete (6.7 KB, ~85% coverage, 31/31 tests) -->
<script src="hyperfixi-hybrid-complete.js"></script>

<!-- Basic with i18n: Lite Plus (2.6 KB) -->
<script src="hyperfixi-lite-plus.js"></script>

<!-- Minimal: Just toggles and basic DOM (1.9 KB) -->
<script src="hyperfixi-lite.js"></script>
```

## Build Commands

```bash
npm run build:browser:lite --prefix packages/core
npm run build:browser:lite-plus --prefix packages/core
npm run build:browser:hybrid-complete --prefix packages/core
```

## Choosing a Bundle

- **< 2 KB needed**: Use `lite` (toggles, add/remove class, put, set, wait)
- **< 3 KB needed**: Use `lite-plus` (adds increment, show/hide, log, i18n aliases)
- **Full lite features**: Use `hybrid-complete` (blocks, expressions, event modifiers)
- **Full features**: Use `hyperfixi-browser.js` (224 KB)

## Test Coverage

| Bundle | Tests | Status |
|--------|-------|--------|
| lite | Manual | Stable |
| lite-plus | Manual | Stable |
| hybrid-complete | 31/31 | ✅ Full coverage |

# @lokascript/hyperscript-adapter

Multilingual plugin for the original [\_hyperscript](https://hyperscript.org). Write hyperscript in any of 24 languages — the adapter translates to hyperscript code before the standard parser runs.

## Install

```bash
npm install @lokascript/hyperscript-adapter
```

Or use a CDN — see [Browser](#browser) below.

## Quick Start

### Browser

```html
<script src="https://unpkg.com/hyperscript.org"></script>
<script src="https://unpkg.com/@lokascript/hyperscript-adapter@2/dist/hyperscript-i18n-es.global.js"></script>

<!-- Spanish -->
<button _="on click alternar .active on me" data-lang="es">Toggle</button>

<!-- Japanese -->
<button _="on click .active を me で 切り替え" data-lang="ja">切り替え</button>

<!-- Inherited language for all children -->
<div data-hyperscript-lang="fr">
  <button _="on click basculer .active on me">Basculer</button>
</div>
```

The plugin auto-registers when `_hyperscript` is available. No extra JS needed.

See the [live demo](https://lokascript-docs.fly.dev/multilingual-plugin/) for interactive examples.

### Node.js / Bundlers

```javascript
import { hyperscriptI18n } from '@lokascript/hyperscript-adapter';

_hyperscript.use(hyperscriptI18n());

// With options
_hyperscript.use(
  hyperscriptI18n({
    defaultLanguage: 'ja',
    confidenceThreshold: 0.6,
    debug: true,
  })
);
```

### Programmatic

For `_hyperscript.evaluate()` or `_hyperscript("code")` calls:

```javascript
import { preprocess } from '@lokascript/hyperscript-adapter';

const english = preprocess('トグル .active', 'ja');
_hyperscript(english); // "toggle .active"
```

## Bundle Options

Pick the bundle that matches your use case. All bundles auto-register with `_hyperscript` on load.

### Self-contained bundles (one `<script>` tag)

Each bundle includes the adapter + semantic parser for the specified languages.

| Bundle                                  | Languages      | Size   |
| --------------------------------------- | -------------- | ------ |
| `hyperscript-i18n.global.js`            | All 24         | 568 KB |
| `hyperscript-i18n-western.global.js`    | es, pt, fr, de | 146 KB |
| `hyperscript-i18n-east-asian.global.js` | ja, ko, zh     | 146 KB |
| `hyperscript-i18n-tr.global.js`         | tr             | 101 KB |
| `hyperscript-i18n-ko.global.js`         | ko             | 100 KB |
| `hyperscript-i18n-ar.global.js`         | ar             | 95 KB  |
| `hyperscript-i18n-ja.global.js`         | ja             | 95 KB  |
| `hyperscript-i18n-es.global.js`         | es             | 94 KB  |
| `hyperscript-i18n-zh.global.js`         | zh             | 88 KB  |
| `hyperscript-i18n-fr.global.js`         | fr             | 87 KB  |
| `hyperscript-i18n-de.global.js`         | de             | 86 KB  |
| `hyperscript-i18n-pt.global.js`         | pt             | 86 KB  |
| `hyperscript-i18n-id.global.js`         | id             | 85 KB  |

```html
<!-- Django / Flask / FastAPI: just pick your language -->
<script src="{% static '_hyperscript.js' %}"></script>
<script src="{% static 'hyperscript-i18n-es.global.js' %}"></script>
```

### Lite adapter (two `<script>` tags, smallest total)

A 2 KB adapter that expects a `@lokascript/semantic` bundle loaded separately. Pair with any semantic regional bundle for the smallest possible total.

```html
<script src="_hyperscript.js"></script>
<script src="lokascript-semantic-es.global.js"></script>
<!-- from @lokascript/semantic -->
<script src="hyperscript-i18n-lite.global.js"></script>
<!-- 2 KB -->
```

Use this when you already load `@lokascript/semantic` for other purposes, or when you need a language bundle not listed above (e.g., `lokascript-semantic-priority.global.js` for 11 languages).

## Language Resolution

The plugin resolves language in this order:

1. `data-lang` attribute on the element
2. `data-hyperscript-lang` on the element or closest ancestor
3. `lang` attribute on the element or closest ancestor (the standard HTML
   cascade — a `<section lang="es">` localizes everything inside it, and a
   nested `lang="en"` opts back out)
4. `<html lang="...">` on the document (reached via step 3 for attached
   elements; still applies to detached fragments)
5. `defaultLanguage` option (if configured)

English (`en`) and unresolved languages pass through without translation.

## Options

| Option                | Type                               | Default       | Description                                                                                                        |
| --------------------- | ---------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `defaultLanguage`     | `string`                           | —             | Default language for all elements                                                                                  |
| `languageAttribute`   | `string`                           | `"data-lang"` | Custom attribute name for per-element language                                                                     |
| `confidenceThreshold` | `number \| Record<string, number>` | `0.5`         | Min confidence (0–1). Per-language map supported (see below).                                                      |
| `strategy`            | `'semantic' \| 'i18n' \| 'auto'`   | `'semantic'`  | Translation strategy                                                                                               |
| `debug`               | `boolean`                          | `false`       | Log translations to console                                                                                        |
| `i18nToEnglish`       | `function`                         | —             | Optional `@lokascript/i18n` `toEnglish` function for fallback                                                      |
| `validateWithHost`    | `boolean`                          | `true`        | Check rendered English on the host parser; on rejection keep the original text (no-op on builds without `parse()`) |

### Per-language confidence thresholds

SOV languages (ja, ko, tr) produce inherently lower confidence scores than SVO languages (es, fr, de). Use a per-language map to tune thresholds:

```javascript
_hyperscript.use(
  hyperscriptI18n({
    confidenceThreshold: {
      es: 0.7, // SVO — tighter gating
      ja: 0.1, // SOV — more permissive
      ko: 0.05,
      '*': 0.5, // default for unlisted languages
    },
  })
);
```

## How It Works

The plugin registers an `addBeforeProcessHook` callback — \_hyperscript's supported public extension point, which fires before the runtime reads `_="..."` attributes (or `<script type="text/hyperscript">` bodies). Non-English input is rewritten to English in place via the `@lokascript/semantic` parser before the runtime's own scan reaches it, and the rendered English is checked on the host's own parser before it is committed (see `validateWithHost`). No \_hyperscript internals are patched. Requires a \_hyperscript build that exposes `addBeforeProcessHook` (0.9.9x era).

## Limitations

- **Expressions** (`is`, `contains`, `matches`, `has`, etc.): expression operators embedded in commands are preserved as raw text and work fine. Standalone non-English boolean expressions outside a command context do not translate.
- **Feature declarations** (`def`, `worker`): these are original \_hyperscript feature-level keywords that are not part of the adapter's translation layer — keep them in English. Command bodies within features translate normally. (`behavior` IS supported.)
- **SOV/VSO accuracy**: Japanese, Korean, Turkish have lower pattern coverage — confidence gating may trigger fallback to the original text
- **Programmatic calls**: `_hyperscript("code")` bypasses the plugin; use `preprocess()` for those

## Troubleshooting

**"Translation unchanged" warning in console**

The adapter logs this when it receives non-English text but produces no change. Common causes:

- Wrong language code — check the `data-lang` attribute matches a supported language (e.g. `es`, not `spa`)
- Unsupported command — only commands with semantic patterns translate (toggle, add, remove, put, set, etc.). Feature-level keywords (`def`, `worker`) stay in English.
- Missing language bundle — if using a single-language bundle, only that language translates. Other languages pass through unchanged.

**SOV languages (ja, ko, tr) not translating reliably**

These languages produce lower confidence scores due to word-order differences. Lower the threshold with a per-language map:

```javascript
_hyperscript.use(
  hyperscriptI18n({
    confidenceThreshold: { ja: 0.1, ko: 0.05, tr: 0.1, '*': 0.5 },
  })
);
```

**`_hyperscript("code")` calls not translating**

The plugin only intercepts `_="..."` attributes in the DOM. For programmatic calls, use `preprocess()`:

```javascript
import { preprocess } from '@lokascript/hyperscript-adapter';

const english = preprocess('alternar .active', 'es');
_hyperscript(english);
```

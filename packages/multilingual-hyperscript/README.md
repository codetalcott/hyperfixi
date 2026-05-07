# @hyperscript-tools/multilingual

Write original [\_hyperscript](https://hyperscript.org) in **24 languages** —
Spanish, Japanese, Korean, Arabic, Chinese, Turkish, French, Portuguese,
German, Hindi, Indonesian, Italian, Polish, Russian, Swahili, Thai, Tagalog,
Ukrainian, Vietnamese, Hebrew, Bengali, Malay, Quechua, English.

The plugin intercepts `_="..."` attributes at runtime, translates non-English
input to English via semantic analysis, and hands the result to the standard
\_hyperscript parser. **No fork, no patches, no AST changes.**

## Quick start (CDN, single language)

```html
<script src="https://unpkg.com/hyperscript.org"></script>
<script src="https://unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n-es.global.js"></script>

<button _="on click alternar .active on me">Alternar</button>
```

That's it. The script auto-registers as a \_hyperscript plugin on load.

## Quick start (CDN, all languages)

```html
<script src="https://unpkg.com/hyperscript.org"></script>
<script src="https://unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n.global.js"></script>

<button _="on click alternar .active on me" data-hyperscript-lang="es">ES</button>
<button _="on click 切り替え .active on me" data-hyperscript-lang="ja">JA</button>
<button _="on click 토글 .active on me" data-hyperscript-lang="ko">KO</button>
```

`data-hyperscript-lang` cascades up the DOM, so you can set it once on
`<html>` or `<body>` and have every descendant inherit.

## Bundle size table

| Bundle                      | URL suffix                                        | Size    | Languages          |
| --------------------------- | ------------------------------------------------- | ------- | ------------------ |
| All 24                      | `dist/hyperscript-i18n.global.js`                 | ~720 KB | All                |
| Western                     | `dist/hyperscript-i18n-western.global.js`         | ~190 KB | en, es, pt, fr, de |
| East Asian                  | `dist/hyperscript-i18n-east-asian.global.js`      | ~186 KB | ja, ko, zh         |
| South Asian                 | `dist/hyperscript-i18n-south-asian.global.js`     | ~160 KB | hi, bn             |
| Southeast Asian             | `dist/hyperscript-i18n-southeast-asian.global.js` | ~183 KB | id, ms, th, tl, vi |
| Slavic                      | `dist/hyperscript-i18n-slavic.global.js`          | ~195 KB | pl, ru, uk         |
| Single language (e.g. `es`) | `dist/hyperscript-i18n-es.global.js`              | ~140 KB | es                 |
| Lite (BYO semantic)         | `dist/hyperscript-i18n-lite.global.js`            | ~2 KB   | (external bundle)  |

## npm / bundler usage

```bash
npm install @hyperscript-tools/multilingual
```

```ts
import { hyperscriptI18n, preprocess } from '@hyperscript-tools/multilingual';

// Plugin registration (default language: 'es')
_hyperscript.use(hyperscriptI18n({ defaultLanguage: 'es' }));

// Standalone preprocessing
const english = preprocess('alternar .active', 'es'); // → 'toggle .active'
_hyperscript(english);
```

Subpath imports for browser bundles work too:

```ts
import '@hyperscript-tools/multilingual/browser/es';
```

## Per-element language

Each `_=` attribute can declare its own language:

```html
<body data-hyperscript-lang="ja">
  <!-- Inherits ja from <body> -->
  <button _="on click 切り替え .active on me">JA default</button>

  <!-- Override per element -->
  <button _="on click alternar .active on me" data-hyperscript-lang="es">ES override</button>
</body>
```

Resolution order: element → ancestor `data-hyperscript-lang` → `<html lang>` →
plugin's `defaultLanguage`.

## How it works

1. The plugin overrides _hyperscript's `runtime.getScript()` (the function
   that reads `_=` attributes and returns raw strings).
2. The override calls a semantic parser to analyze the input. If parse
   confidence clears the per-language threshold, the parser produces a
   language-neutral semantic node.
3. A deterministic English renderer turns the semantic node back into
   English \_hyperscript text.
4. \_hyperscript's standard lexer + parser see English and execute normally.

If parse confidence is below the threshold, the original text falls through
unchanged — the plugin never substitutes a low-confidence guess.

## Known limitations

- **Expressions** (standalone boolean expressions outside a command body)
  don't translate; only command bodies do.
- **Feature keywords** `def` and `worker` must stay English. `behavior` is
  supported.
- **SOV/VSO accuracy**: Japanese, Korean, Turkish, Arabic produce lower
  confidence than SVO languages because their word order requires more
  reordering. Per-language thresholds are tuned to compensate.
- **Programmatic `_hyperscript(string)`** calls bypass `getScript()` — call
  `preprocess(text, lang)` first if you need translation in that path.

## License

MIT.

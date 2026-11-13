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

<button _="al clic alternar .active" lang="es">Alternar</button>
```

The script auto-registers as a \_hyperscript plugin on load. The plugin picks each script's
language from the page (see [Per-element language](#per-element-language)): without a `lang`,
`data-lang` or `data-hyperscript-lang` on the element or an ancestor (`<html lang="es">` counts),
the script is read as English.

## Quick start (CDN, all languages)

```html
<script src="https://unpkg.com/hyperscript.org"></script>
<script src="https://unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n.global.js"></script>

<button _="al clic alternar .active" data-hyperscript-lang="es">ES</button>
<button _="クリック で .active を 切り替え" data-hyperscript-lang="ja">JA</button>
<button _="클릭 할 때 .active 을 토글" data-hyperscript-lang="ko">KO</button>
```

`data-hyperscript-lang` cascades up the DOM, so you can set it once on
`<html>` or `<body>` and have every descendant inherit. English keywords mixed into another
language (`on click alternar .active`) read too.

## Bundle size table

Sizes are gzipped (bytes / 1024), measured on a 7.6.0 build (2026-11-13) of `@lokascript/hyperscript-adapter`, whose bundles this package copies; a page adds \_hyperscript itself.

| Bundle              | URL suffix                                        | Gzipped     | Languages          |
| ------------------- | ------------------------------------------------- | ----------- | ------------------ |
| All 24              | `dist/hyperscript-i18n.global.js`                 | ~280 KB     | All                |
| Western             | `dist/hyperscript-i18n-western.global.js`         | ~146 KB     | es, pt, fr, de     |
| East Asian          | `dist/hyperscript-i18n-east-asian.global.js`      | ~145 KB     | ja, ko, zh         |
| South Asian         | `dist/hyperscript-i18n-south-asian.global.js`     | ~142 KB     | hi, bn             |
| Southeast Asian     | `dist/hyperscript-i18n-southeast-asian.global.js` | ~146 KB     | id, ms, th, tl, vi |
| Slavic              | `dist/hyperscript-i18n-slavic.global.js`          | ~148 KB     | pl, ru, uk         |
| Single language     | `dist/hyperscript-i18n-es.global.js` (etc.)       | ~131–138 KB | one                |
| Lite (BYO semantic) | `dist/hyperscript-i18n-lite.global.js`            | ~2.3 KB     | (external bundle)  |

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
  <button _="クリック で .active を 切り替え">JA default</button>

  <!-- Override per element -->
  <button _="al clic alternar .active" data-hyperscript-lang="es">ES override</button>
</body>
```

Resolution order: the element's `data-lang` → `data-hyperscript-lang` on the element or an
ancestor → `lang` on the element or an ancestor (up to `<html lang>`) → the plugin's
`defaultLanguage`.

## How it works

1. The plugin registers an `addBeforeProcessHook` callback (\_hyperscript's
   public extension point, which fires before each element's `_=` is read).
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
- **Programmatic `_hyperscript(string)`** calls bypass the attribute hook — call
  `preprocess(text, lang)` first if you need translation in that path.

## License

MIT.

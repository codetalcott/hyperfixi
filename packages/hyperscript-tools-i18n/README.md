# @hyperscript-tools/i18n

Build-time translation for [\_hyperscript](https://hyperscript.org) code
samples. Ship a single canonical English source; generate `_="..."`
attributes in any of 24 languages at build time.

Pairs with [`@hyperscript-tools/multilingual`](https://www.npmjs.com/package/@hyperscript-tools/multilingual)
(runtime translation), so a docs site can choose between _served
pre-translated_ and _translate on the fly_.

## CLI

```bash
npx @hyperscript-tools/i18n translate src/page.html --langs ja,es,ko --out dist/
# Wrote 3 files (1 input × 3 langs) to dist/
```

Produces `dist/page.ja.html`, `dist/page.es.html`, `dist/page.ko.html` with
every `_="..."` attribute translated to the target language. The original
HTML structure is preserved.

### Flags

| Flag            | Description                                                                        |
| --------------- | ---------------------------------------------------------------------------------- |
| `--langs`, `-l` | Comma-separated target language codes (`ja,es,ko`).                                |
| `--out`, `-o`   | Output directory. Defaults to `.`.                                                 |
| `--from`, `-f`  | Source locale of the input. Defaults to `en`.                                      |
| `--strict`      | Fail the run on any single attribute that can't be translated. Default is lenient. |

Inputs may be individual files or directories — every `.html` in a directory
is processed.

## Eleventy plugin

```js
// eleventy.config.js
import hyperscriptI18n from '@hyperscript-tools/i18n/eleventy';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(hyperscriptI18n);
}
```

Adds three filters:

```njk
{# Translate a single hyperscript snippet #}
{{ "toggle .active" | translateHs("ja") }}
{# → ".active を 切り替え" #}

{# Get every translation at once #}
{% set variants = "toggle .active" | translateHsAll(["ja","es","ko"]) %}
{% for lang, code in variants %}
  <code data-hyperscript-lang="{{ lang }}">{{ code }}</code>
{% endfor %}

{# Rewrite every _="..." attribute in an HTML fragment #}
{{ patternHtml | translateHsHtml("ja") | safe }}
```

Filter names can be overridden:

```js
eleventyConfig.addPlugin(hyperscriptI18n, {
  filterNames: { snippet: 'toLang', html: 'toLangHtml' },
});
```

## Programmatic API

```ts
import { translate, translateHtml, translateHtmlToManyLangs } from '@hyperscript-tools/i18n';

// Snippet → snippet
translate('toggle .active', 'en', 'ja');
// → '.active を 切り替え'

// HTML → HTML (rewrites every _="..." attribute)
const ja = translateHtml(html, 'ja');

// HTML → Map of HTML
const variants = translateHtmlToManyLangs(html, ['ja', 'es', 'ko']);
```

## Supported languages

All 24 languages supported by `@lokascript/i18n`:
`ar, bn, de, en, es, fr, he, hi, id, it, ja, ko, ms, pl, pt, qu, ru, sw, th, tl, tr, uk, vi, zh`.

Word order is handled automatically: SVO (Spanish, Chinese), SOV (Japanese,
Korean, Turkish), VSO (Arabic). RTL languages preserve direction.

## When to use this vs. `@hyperscript-tools/multilingual`

| Need                                                             | Reach for                                     |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Visitors type hyperscript in their native language at runtime    | `@hyperscript-tools/multilingual`             |
| Author once in English; ship pre-translated docs in 24 languages | `@hyperscript-tools/i18n` (this)              |
| Both                                                             | Use both. They share no runtime dependencies. |

## License

MIT.

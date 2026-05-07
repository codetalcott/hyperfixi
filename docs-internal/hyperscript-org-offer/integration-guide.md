---
title: Add language support to your _hyperscript site
description: One script tag adds 24-language support to any _hyperscript site. No fork, no parser patches, no AST rewriting.
layout: layout.njk
---

# Add language support to your \_hyperscript site

> Aimed at maintainers of [hyperscript.org](https://hyperscript.org) and any
> other vanilla `_hyperscript` site that wants to let visitors author in their
> native language. Render this page on lokascript.org so the live demo lives
> next to the docs.

`_hyperscript` is more readable than nearly any other DOM-scripting library —
it reads like English. The natural next question: _what about the people who
don't read English?_

`@hyperscript-tools/multilingual` is a runtime plugin that translates `_=`
attributes from any of **24 languages** to English **before** `_hyperscript`'s
parser sees them. The runtime is unchanged. No fork, no monkey-patches, no
AST rewriting — just a single override on `runtime.getScript()`.

`@hyperscript-tools/i18n` is the build-time companion: take an English source
file, produce per-language HTML with translated `_=` attributes, ship them
alongside.

Both packages are MIT, namespace-neutral, and have zero dependency on any
HyperFixi or LokaScript runtime.

---

## 60-second runtime install

Drop two `<script>` tags. Single language, single file:

```html
<script src="https://unpkg.com/hyperscript.org"></script>
<script src="https://unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n-es.global.js"></script>

<button _="on click alternar .active on me">Alternar</button>
```

That's it. The plugin auto-registers with `_hyperscript` on load.

### All 24 languages at once

```html
<script src="https://unpkg.com/hyperscript.org"></script>
<script src="https://unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n.global.js"></script>

<button _="on click alternar .active on me" data-hyperscript-lang="es">ES</button>
<button _="on click 切り替え .active on me" data-hyperscript-lang="ja">JA</button>
<button _="on click 토글 .active on me" data-hyperscript-lang="ko">KO</button>
<button _="on click 切换 .active on me" data-hyperscript-lang="zh">ZH</button>
```

`data-hyperscript-lang` cascades up the DOM tree, so set it once on `<html>`
or `<body>` and every descendant inherits.

### npm / bundler

```bash
npm install @hyperscript-tools/multilingual
```

```js
import { hyperscriptI18n, preprocess } from '@hyperscript-tools/multilingual';

// Plugin: register a default language
_hyperscript.use(hyperscriptI18n({ defaultLanguage: 'es' }));

// Standalone: preprocess on demand
const english = preprocess('alternar .active', 'es'); // → 'toggle .active'
_hyperscript(english);
```

---

## Bundle size table

| Bundle                         | URL suffix                                        | Size    | Languages                         |
| ------------------------------ | ------------------------------------------------- | ------- | --------------------------------- |
| All 24                         | `dist/hyperscript-i18n.global.js`                 | ~720 KB | every supported language          |
| Western                        | `dist/hyperscript-i18n-western.global.js`         | ~190 KB | en, es, pt, fr, de                |
| East Asian                     | `dist/hyperscript-i18n-east-asian.global.js`      | ~186 KB | ja, ko, zh                        |
| South Asian                    | `dist/hyperscript-i18n-south-asian.global.js`     | ~160 KB | hi, bn                            |
| Southeast Asian                | `dist/hyperscript-i18n-southeast-asian.global.js` | ~183 KB | id, ms, th, tl, vi                |
| Slavic                         | `dist/hyperscript-i18n-slavic.global.js`          | ~195 KB | pl, ru, uk                        |
| Single language (e.g. Spanish) | `dist/hyperscript-i18n-es.global.js`              | ~140 KB | es                                |
| Lite (BYO semantic)            | `dist/hyperscript-i18n-lite.global.js`            | ~2 KB   | requires external semantic bundle |

Pick the smallest bundle that covers your audience.

---

## Language coverage

| Code | Language   | Word order | RTL |
| ---- | ---------- | ---------- | --- |
| en   | English    | SVO        |     |
| es   | Spanish    | SVO        |     |
| pt   | Portuguese | SVO        |     |
| fr   | French     | SVO        |     |
| de   | German     | V2         |     |
| it   | Italian    | SVO        |     |
| pl   | Polish     | SVO        |     |
| ru   | Russian    | SVO        |     |
| uk   | Ukrainian  | SVO        |     |
| ja   | Japanese   | SOV        |     |
| ko   | Korean     | SOV        |     |
| zh   | Chinese    | SVO        |     |
| ar   | Arabic     | VSO        | ✓   |
| he   | Hebrew     | VSO        | ✓   |
| hi   | Hindi      | SOV        |     |
| bn   | Bengali    | SOV        |     |
| id   | Indonesian | SVO        |     |
| ms   | Malay      | SVO        |     |
| th   | Thai       | SVO        |     |
| tl   | Tagalog    | VSO        |     |
| vi   | Vietnamese | SVO        |     |
| tr   | Turkish    | SOV        |     |
| sw   | Swahili    | SVO        |     |
| qu   | Quechua    | SOV        |     |

Word order matters: SVO languages (Spanish, Chinese) match English's structure
and translate with high confidence. SOV (Japanese, Korean, Turkish) and VSO
(Arabic, Hebrew) require semantic reordering, so per-language confidence
thresholds are tuned to compensate.

---

## Build-time translation for docs

If you'd rather pre-translate code samples at build time — e.g. one English
source produces a `patterns.html`, `patterns.es.html`, `patterns.ja.html`,
etc. — use the build-time companion:

```bash
npx @hyperscript-tools/i18n translate src/page.html --langs ja,es,ko --out dist/
# → dist/page.ja.html, dist/page.es.html, dist/page.ko.html
```

The CLI scans every `_="..."` attribute and rewrites it for each target
language. Other markup is preserved.

### Programmatic API

```js
import { translate, translateHtml } from '@hyperscript-tools/i18n';

// Snippet → snippet
translate('toggle .active', 'en', 'ja'); // → '.active を 切り替え'

// HTML → HTML
const ja = translateHtml(htmlString, 'ja');
```

### Eleventy plugin

```js
// eleventy.config.js
import hyperscriptI18n from '@hyperscript-tools/i18n/eleventy';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(hyperscriptI18n);
}
```

Then in templates:

```njk
{# Translate a single snippet #}
{{ "toggle .active" | translateHs("ja") }}

{# Get every translation as a map #}
{% set variants = "toggle .active" | translateHsAll(["ja","es","ko"]) %}
{% for lang, code in variants %}
  <code data-hyperscript-lang="{{ lang }}">{{ code }}</code>
{% endfor %}

{# Rewrite every _="..." attribute in an HTML fragment #}
{{ patternHtml | translateHsHtml("ja") | safe }}
```

---

## How it works

1. The plugin overrides `_hyperscript`'s `runtime.getScript()` — the
   single function that reads `_=` attributes and returns raw strings.
2. The override calls a semantic parser to analyze the input. If parse
   confidence clears the per-language threshold, the parser emits a
   language-neutral semantic node.
3. A deterministic English renderer turns the semantic node back into
   English `_hyperscript` text.
4. `_hyperscript`'s standard lexer + parser see English and execute normally.

Below-threshold input falls through unchanged, so a low-confidence guess
never replaces what the author wrote.

The whole plugin is a few hundred lines on top of a precomputed semantic
pattern catalog. The runtime path is `getScript()` → `preprocess()` → English
text → standard lexer.

---

## Known limitations

- **Standalone expressions** (boolean expressions outside a command body)
  don't translate. Only command bodies do.
- **Feature keywords** `def` and `worker` must stay English. `behavior` is
  fully supported.
- **SOV/VSO confidence** is lower than SVO out of the box because the word
  order requires more reordering. Per-language thresholds compensate, but
  edge-case constructions in Japanese, Korean, Turkish, Arabic may need
  manual help.
- **Programmatic `_hyperscript(string)`** calls bypass `getScript()` — call
  `preprocess(text, lang)` first if you need translation in that path.

---

## Live demo

[lokascript.org/patterns](https://lokascript.org/patterns) — every pattern
in the browser is shown in your chosen language, courtesy of the same
`@hyperscript-tools/multilingual` plugin documented above. Click a language
chip; the page flips. Toggle "Live execution" and the patterns become
runnable in the chosen language.

---

## License + ownership

- **License:** MIT.
- **Maintenance:** the plugins are maintained as part of the LokaScript
  ecosystem but published under the namespace-neutral `@hyperscript-tools/*`
  scope. We're happy to discuss co-maintainership or transfer if that'd
  help long-term alignment with `_hyperscript` itself.
- **Source:** [`packages/hyperscript-adapter/`](https://github.com/codetalcott/hyperfixi/tree/main/packages/hyperscript-adapter)
  (engine), [`packages/multilingual-hyperscript/`](https://github.com/codetalcott/hyperfixi/tree/main/packages/multilingual-hyperscript)
  (npm wrapper), [`packages/hyperscript-tools-i18n/`](https://github.com/codetalcott/hyperfixi/tree/main/packages/hyperscript-tools-i18n)
  (build-time).

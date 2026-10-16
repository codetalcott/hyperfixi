---
title: Add language support to your _hyperscript site
description: One script tag adds 24-language support to any _hyperscript site. No fork, no parser patches, no AST rewriting.
layout: layout.njk
---

# Add language support to your \_hyperscript site

> Aimed at maintainers of [hyperscript.org](https://hyperscript.org) and any
> other vanilla `_hyperscript` site that wants to let visitors author in their
> native language. Render this page on lokascript.org so the live demo lives
> next to the docs. (Refreshed against 4.1.0 on 2026-10-06: sizes measured
> from the published tarball, examples are the renderer's own output.)

`_hyperscript` is more readable than nearly any other DOM-scripting library —
it reads like English. The natural next question: _what about the people who
don't read English?_

`@hyperscript-tools/multilingual` is a runtime plugin that translates `_=`
attributes from any of **24 languages** to English **before** `_hyperscript`'s
parser sees them. The runtime is unchanged. No fork, no monkey-patches, no
AST rewriting: it uses `_hyperscript`'s own `addBeforeProcessHook`.

`@hyperscript-tools/i18n` is the build-time companion: take an English source
file, produce per-language HTML with translated `_=` attributes, ship them
alongside.

Both packages are MIT-licensed, namespace-neutral wrappers over the
LokaScript runtime (also MIT). The adapter logic lives at
`@lokascript/hyperscript-adapter`; the `@hyperscript-tools/*` wrappers exist
so CDN URLs and integration code stay neutral. No HyperFixi runtime is
involved, and the CDN bundles are self-contained.

---

## 60-second runtime install

Drop two `<script>` tags. Single language, single file:

```html
<script src="https://unpkg.com/hyperscript.org"></script>
<script src="https://unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n-es.global.js"></script>

<button _="al clic alternar .active">Alternar</button>
```

That's it. The plugin registers with `_hyperscript` on load.

### All 24 languages at once

```html
<script src="https://unpkg.com/hyperscript.org"></script>
<script src="https://unpkg.com/@hyperscript-tools/multilingual/dist/hyperscript-i18n.global.js"></script>

<button _="al clic alternar .active" lang="es">ES</button>
<button _="クリック を で .active を 切り替え" lang="ja">JA</button>
<button _="클릭 할 때 .active 을 토글" lang="ko">KO</button>
<button _="一 点击 就 切换 .active" lang="zh">ZH</button>
```

An element's language is its `data-lang`, else the nearest `data-hyperscript-lang`,
else the nearest `lang` attribute, so `<html lang="ja">` sets it for the whole page.

### npm / bundler

```bash
npm install @hyperscript-tools/multilingual
```

```js
import { hyperscriptI18n, preprocess } from '@hyperscript-tools/multilingual';

// Plugin: register a default language
_hyperscript.use(hyperscriptI18n({ defaultLanguage: 'es' }));

// Standalone: preprocess on demand
const english = preprocess('al clic alternar .active', 'es'); // → 'on click toggle .active'
```

---

## Bundle sizes

Measured from `@hyperscript-tools/multilingual@4.1.0`. Every bundle also reads English.

| Bundle                         | URL suffix                                        | Raw    | Gzipped | Languages                           |
| ------------------------------ | ------------------------------------------------- | ------ | ------- | ----------------------------------- |
| All 24                         | `dist/hyperscript-i18n.global.js`                 | 1.2 MB | 258 KB  | every supported language            |
| Western                        | `dist/hyperscript-i18n-western.global.js`         | 555 KB | 142 KB  | es, pt, fr, de                      |
| East Asian                     | `dist/hyperscript-i18n-east-asian.global.js`      | 538 KB | 139 KB  | ja, ko, zh                          |
| South Asian                    | `dist/hyperscript-i18n-south-asian.global.js`     | 510 KB | 129 KB  | hi, bn                              |
| Southeast Asian                | `dist/hyperscript-i18n-southeast-asian.global.js` | 564 KB | 136 KB  | id, ms, th, tl, vi                  |
| Slavic                         | `dist/hyperscript-i18n-slavic.global.js`          | 571 KB | 141 KB  | pl, ru, uk                          |
| Single language (e.g. Spanish) | `dist/hyperscript-i18n-es.global.js`              | 455 KB | 119 KB  | es                                  |
| Lite (bring your own semantic) | `dist/hyperscript-i18n-lite.global.js`            | 3 KB   | 1 KB    | requires a separate semantic bundle |

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

Word order matters: each language is written in its own order (Japanese puts
the verb last, Arabic first), and the semantic parser reorders it into
English. It scores its confidence as it parses; a script below the plugin's
threshold is left exactly as written.

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
language. Other markup is preserved. `--check` parses the English on
hyperscript.org's own parser and fails the run if any attribute is invalid.

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
  <code lang="{{ lang }}">{{ code }}</code>
{% endfor %}

{# Rewrite every _="..." attribute in an HTML fragment #}
{{ patternHtml | translateHsHtml("ja") | safe }}
```

---

## How it works

1. `_hyperscript` calls the plugin's `addBeforeProcessHook` before it reads a
   subtree's scripts (`_=`, `script`, `data-script`, and
   `<script type="text/hyperscript">` bodies).
2. For each non-English script, a semantic parser builds a language-neutral
   node and scores its confidence. Below the threshold, the script is left
   as written.
3. A deterministic English renderer turns the node back into English
   `_hyperscript` text.
4. The plugin asks `_hyperscript.parse()` whether that English parses. If it
   doesn't, the author's text stays, so any error names code they wrote.
5. The plugin rewrites the script in place, and `_hyperscript`'s standard
   lexer and parser run it. (In devtools the attribute then shows the
   English.)

The plugin is a few hundred lines on top of the semantic parser.

---

## Known limitations

- **`def` and `worker`.** The `def` keyword stays English (its body
  translates). `worker` isn't covered: it needs `_hyperscript`'s worker
  extension.
- **Naturalness.** Translations follow each language's word order, but not
  all read naturally yet: some English words remain (some loop forms, event
  modifiers such as `debounced at`), and a few constructions read stiffly.
  Native-speaker review is ongoing.
- **Programmatic `_hyperscript(string)`** calls don't pass through the hook.
  Call `preprocess(text, lang)` first if you need translation in that path.

---

## Live demo

[lokascript.org/patterns](https://lokascript.org/patterns) — every pattern
in the browser is shown in your chosen language by the same adapter this
plugin wraps. Click a language chip; the page flips. Toggle "Live execution"
and the patterns become runnable in the chosen language.

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

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

| Flag            | Description                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `--langs`, `-l` | Comma-separated target language codes (`ja,es,ko`).                                              |
| `--out`, `-o`   | Output directory. Defaults to `.`.                                                               |
| `--from`, `-f`  | Source locale of the input. Defaults to `en`.                                                    |
| `--strict`      | Fail the run on any single attribute that can't be translated. Default is lenient.               |
| `--check`       | Parse-check the English hyperscript on the real engine and exit 3 if any is invalid (see below). |

Inputs may be individual files or directories — every `.html` in a directory
is processed.

## Canonical parse-check

Every `_="..."` attribute this tool touches on the **English side** can be
validated against the real [`hyperscript.org`](https://hyperscript.org) parser —
the same engine the browser runs. This is checked for:

- **input** when translating _from_ English (`--from en`, the default) — catches
  an invalid canonical source before it ships in all 24 languages, and
- **output** when a target language is `en` (foreign → English).

Foreign-language _output_ is deliberately **not** round-trip-checked here: this
package's grammar transformer is lossy in reverse, so a round-trip gate would be
noise. Faithful foreign-output gating belongs to the semantic-engine transpiler
(roadmap §5, "later").

By default, invalid English prints a deduped warning and the run continues:

```text
sample.html: invalid hyperscript (English input -> ja): _="on click qqqq zzzz"
  - Unexpected Token : qqqq
```

Pass `--check` to escalate to a build failure (exit code **3**) after all files
are processed and written:

```bash
npx @hyperscript-tools/i18n translate src/page.html --langs ja,es --out dist/ --check
```

**Exit codes:** `0` success · `1` no inputs matched (or `--check` but the parser
failed to load) · `2` usage error · `3` `--check` found invalid hyperscript.

In the Eleventy plugin, use the `parseCheck` option (`'off' | 'warn' | 'error'`,
default `'warn'`):

```js
eleventyConfig.addPlugin(hyperscriptI18n, { parseCheck: 'error' });
```

Programmatically:

```ts
import { validateHyperscript } from '@hyperscript-tools/i18n/validate';

const errors = await validateHyperscript('on click toggle .active'); // [] = valid
```

> **Caveat:** the attribute scanner is a regex over `_="..."`, so hyperscript
> inside HTML comments or `<script>` bodies is checked too. Warn-by-default keeps
> that from breaking builds.

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

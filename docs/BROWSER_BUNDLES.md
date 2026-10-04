# Browser Bundles — full reference

> Relocated from the root CLAUDE.md (which keeps only the decision tree and
> summary table). This is the complete reference for bundle selection, what
> replaced core's retired htmx-compat layer, and the custom bundle generator.

## Choosing your bundle

**The engine (2026-10-03).** `@hyperfixi/engine` replaces core's engine (the migration plan is
`~/.claude/plans/engine-replaces-core.md`; every tracked gallery page runs on it). Its script-tag
bundle is **`hyperfixi-hs.js`** (34.1 KB gzipped): hyperscript and nothing else, every module,
upstream-faithful, with upstream's reactive features (`live`, `when`, `bind`) built in. For
hypermedia attributes it pairs with an upstream library instead of reimplementing one:

| Stack                                                              | Gzipped   | For                                                                                                              |
| ------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `hyperfixi-hs.js`                                                  | ~34 KB    | Hyperscript, including reactive blocks (`_="live put $count into me"`)                                           |
| `hyperfixi-hs.js` + [fixi](https://github.com/bigskysoftware/fixi) | ~35 KB    | The minimal hypermedia stack: fixi's `fx-action` / `fx-target` / `fx-swap` beside hyperscript                    |
| `hyperfixi-hs.js` + htmx 4 (+ `@lokascript/htmx-adapter`)          | ~50 KB    | The full one: htmx's attributes, `hx-sse` / `hx-ws` extensions; the adapter localizes attribute names            |
| `hyperfixi-hs.js` + `@lokascript/hyperscript-adapter`              | see below | Hyperscript written in any of 24 languages ([Hyperscript in another language](#hyperscript-in-another-language)) |

Hyperscript handles behavior, the hypermedia library handles requests and streams, and neither
reimplements the other. `examples/hx-v4/` and `examples/hx-v4-i18n/` are the second and third
stacks running (htmx 4 is vendored for them under `examples/vendor/`). Localized attribute names
on real htmx are the adapter's job ([packages/htmx-adapter](../packages/htmx-adapter/README.md));
on fixi, loka-js's.

**Core's bundle** (`hyperfixi.js`) is still built and published until the cutover, when the
name passes to the engine's bundle (C-R4). Phase C3 retired the rest: `hyperfixi-hx-v4.js`
first, then `hyperfixi-hx.js` and `hyperfixi-hybrid-complete.js`, then the multilingual ones
(`hyperfixi-multilingual.js`, `classic-i18n`, `modular`; C-R3). With
`hyperfixi-hx.js` went core's embedded htmx layer (`hx-live` with a hyperscript body,
`sse-connect`, `ws-connect`, fixi's `fx-*`, localized names), retired by owner decision on
2026-10-03: it reimplemented htmx on core's runtime, and what it offered that users touched
survives on upstream code (the engine's `live` blocks, the htmx adapter, loka-js).

**Using Vite?** Add `@hyperfixi/vite-plugin` and stop reading: it scans your
project and emits a bundle on `@hyperfixi/engine` that registers only the grammar
modules your hyperscript uses (17.9 KB gzipped for three commands, 34.4 KB for
everything; one grammar, upstream's). Non-English scripts are translated as the
engine reads them. See the [vite plugin README](../packages/vite-plugin/README.md).
(Since 2026-10-03, Phase C1 of the cutover plan; it no longer embeds core's parsers
or falls back to core's bundles.)

**Script tag, on core?** One prebuilt name is left:

| Bundle         | Size (gzip) | What it is                                                                                  |
| -------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `hyperfixi.js` | ~352 KB     | Everything. Full parser, reactivity and realtime plugins, 24 languages, `window.hyperfixi`. |

> **Retired in the 4.0 cycle:** `hyperfixi-lite.js`, `hyperfixi-lite-plus.js`,
> `hyperfixi-minimal.js` and `hyperfixi-standard.js` are no longer built or
> exported. The regex "lite" tier lived on inside the Vite plugin's generated
> bundles until Phase C1 (2026-10-03), when the plugin moved to engine modules;
> `minimal`/`standard` were the full parser with a hand-picked command subset.
> **Retired in Phase C3:** `hyperfixi-hx-v4.js`, `hyperfixi-hx.js` (the hybrid
> parser plus htmx v1/v2 attributes) and `hyperfixi-hybrid-complete.js` (the
> hybrid parser alone), with their `@hyperfixi/core/browser/hybrid-*` exports;
> then (C-R3) `hyperfixi-multilingual.js` (`@hyperfixi/core/browser/multilingual`),
> `hyperfixi-classic-i18n.js` (core's parser with localized keywords and
> `setLocale`), `hyperfixi-classic.js`, the code-split `hyperfixi.mjs`
> (`@hyperfixi/core/browser/modular`) and the unexported `semantic-complete`,
> `textshelf`, `dev` / `prod` / `llm` builds. Pages pinned to a 3.x release keep
> loading them from the CDN.

## Companion bundles

| Bundle                                               | Global                  | Size (gzip) | Use Case                                                                          |
| ---------------------------------------------------- | ----------------------- | ----------- | --------------------------------------------------------------------------------- |
| `packages/behaviors/dist/resolver.browser.global.js` | `HyperFixiBehaviors`    | 5.7 KB      | The 11 standard behaviors, defined on `hyperfixi-hs.js` (or upstream) as it loads |
| `packages/i18n/dist/lokascript-i18n.min.js`          | `window.LokaScriptI18n` | 38.5 KB     | Per-language vocabulary and profiles                                              |

> **Note**: As of v2.0.0, the primary bundles are `hyperfixi-*.js`. A deprecated `lokascript-browser.js` copy of `hyperfixi.js` is still emitted by `build:browser` (`packages/core/scripts/create-bundle-aliases.mjs`); the other `lokascript-*.js` copies went with their bundles in Phase C3. Use the `hyperfixi-*.js` names. See [MIGRATION.md](../MIGRATION.md).

## Core's htmx-compat layer (retired)

`hyperfixi-hx.js` and `hyperfixi-hx-v4.js` carried an htmx layer that reimplemented the attributes
on core's runtime. It retired with them in Phase C3. What replaces each part:

| Core-era feature                                           | Now                                                                                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hx-get` / `hx-target` / `hx-swap`, `hx-on:*`, fixi `fx-*` | Real htmx 4 or fixi beside `hyperfixi-hs.js`                                                                                                                    |
| `hx-live="…"` (a hyperscript body)                         | The engine's `live` block: `_="live put $count into me end"`                                                                                                    |
| `sse-connect` / `sse-swap`, `ws-connect` / `ws-send`       | htmx 4's `hx-sse` / `hx-ws`                                                                                                                                     |
| Localized names (`hx-obtener`, `hx-取得`, …)               | [`@lokascript/htmx-adapter`](../packages/htmx-adapter/README.md): the same `vocab/{lang}.js` modules (now in that package) on real htmx; `examples/hx-v4-i18n/` |
| `htmx:configuring` / `htmx:beforeRequest` / … events       | htmx's own lifecycle events                                                                                                                                     |

How the localized names are generated and authored (the semantic profiles, the hand-authored
table for htmx-only attributes, the additive-names rule) is in `packages/htmx-adapter/CLAUDE.md`.

## Custom Bundle Generator

Generate minimal bundles with only the commands you need:

```bash
cd packages/core

# Generate from config file
npm run generate:bundle -- --config bundle-configs/textshelf.config.json

# Generate from command line with blocks and positional expressions
npm run generate:bundle -- --commands toggle,add,set --blocks if,repeat --positional --output src/my-bundle.ts
```

See [bundle-configs/README.md](../packages/core/bundle-configs/README.md) for full documentation.

## Semantic Bundles (Regional Options)

Files live in `@lokascript/semantic/dist/`; each is also exported as `@lokascript/semantic/browser` (all 24) or `@lokascript/semantic/browser/<name>` (e.g. `/browser/priority`, `/browser/es`). Sizes are gzipped, measured locally on 2026-09-30 (`gzip -9`, macOS; CI's Linux zlib reads slightly higher).

| Bundle                                    | Global                        | Size (gzip) | Languages                                      |
| ----------------------------------------- | ----------------------------- | ----------- | ---------------------------------------------- |
| `browser.global.js`                       | `LokaScriptSemantic`          | ~260 KB     | All 24                                         |
| `browser-priority.priority.global.js`     | `LokaScriptSemanticPriority`  | ~151 KB     | 11: en, es, pt, fr, de, ja, zh, ko, ar, tr, id |
| `browser-western.western.global.js`       | `LokaScriptSemanticWestern`   | ~128 KB     | en, es, pt, fr, de, it                         |
| `browser-east-asian.east-asian.global.js` | `LokaScriptSemanticEastAsian` | ~108 KB     | ja, zh, ko (+ en)                              |
| `browser-es-en.es-en.global.js`           | `LokaScriptSemanticEsEn`      | ~116 KB     | en, es                                         |
| `browser-en.en.global.js`                 | `LokaScriptSemanticEn`        | ~111 KB     | en only                                        |
| `browser-es.es.global.js`                 | `LokaScriptSemanticEs`        | ~98 KB      | es (+ en)                                      |

Every other language except Hebrew has its own `browser-<code>.<code>.global.js` (~96–100 KB). Every bundle but `core` and `lazy` (which register no language) registers English as well (about 2 KB, since 2026-10-04): English is what the adapters render a parse to, for `hyperfixi-hs.js` or `_hyperscript` to read. Each also exports `translate`. Most of each bundle is the shared parser (`browser-core.core.global.js`, which registers no language, is ~90 KB), so a language costs only a few KB on top.

Choose the smallest bundle that covers your target languages. See `packages/semantic/README.md` for details.

## Hyperscript in another language

The engine reads English. `@lokascript/hyperscript-adapter` translates each script to English as
the engine reads it, in the language of its element: `data-lang` or `lang` on the element or an
ancestor, then the page's `<html lang>`. The `_` attribute keeps the text its author wrote.

```html
<script src="hyperfixi-hs.js"></script>
<script src="https://unpkg.com/@lokascript/hyperscript-adapter@3/dist/hyperscript-i18n-ja.global.js"></script>

<button lang="ja" _="クリック で .active を トグル">切り替え</button>
```

Two ways to load the adapter (gzipped, measured 2026-10-04 with `gzip -c`, macOS):

| Adapter                                                 | Size    | With                                                                               |
| ------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `hyperscript-i18n-<lang>.global.js` (or a regional one) | ~115 KB | Nothing else: it carries the semantic parser for its languages (all 24: ~247 KB)   |
| `hyperscript-i18n-lite.global.js`                       | 1.7 KB  | A `@lokascript/semantic` bundle loaded before it (below: ~126 KB for one language) |

The lite adapter takes whichever `LokaScriptSemantic*` global is on the page; every semantic
bundle registers English, which is what the adapter renders to. Translation between languages
is the semantic bundle's `translate`:

```js
LokaScriptSemantic.translate('toggle .active', 'en', 'ko');
```

`packages/core/test-multilingual-e2e.html` (driven by `multilingual-e2e.spec.ts`, @quick) runs
this stack in Chromium: `hyperfixi-hs.js`, the all-24 semantic bundle and the lite adapter.

**Before Phase C3** core shipped `hyperfixi-multilingual.js` (~93 KB), which ran the semantic
parse straight on core's runtime (`hyperfixi.execute(code, lang)`), beside the all-24 semantic
bundle: ~353 KB together. The engine and the lite adapter beside the same semantic bundle come to
~300 KB, and one language to ~160 KB.

## Full Bundle Usage

```html
<script src="hyperfixi.js"></script>
<script src="node_modules/@lokascript/semantic/dist/browser.global.js"></script>
<script>
  // Translation (semantic; i18n's translator was retired 2026-08-28)
  const result = LokaScriptSemantic.translate('toggle .active', 'en', 'ja');

  // Semantic parsing (24 languages)
  const parsed = LokaScriptSemantic.parse('トグル .active', 'ja');
  const translations = LokaScriptSemantic.getAllTranslations('toggle .active', 'en');
</script>
```

# @lokascript/htmx-adapter

Multilingual adapter for **upstream htmx v4** — author `hx-*` / `sse-*` / `ws-*`
attributes in 24 languages against the stock htmx library.

```html
<script src="htmx-i18n.global.js"></script>
<!-- this adapter (1.9 KB gz) -->
<script src="vocab/htmx/es.js"></script>
<!-- vocab module(s) -->
<script src="htmx.js"></script>
<!-- upstream htmx v4 -->

<section lang="es">
  <button hx-obtener="/api/usuarios" hx-objetivo="#out" hx-disparar="clic">Cargar</button>
</section>
```

The button issues a real htmx `GET /api/usuarios` targeting `#out` on click.
The localized attributes stay verbatim in the DOM.

## How it relates to the rest of the ecosystem

This package is the htmx analog of
[`@lokascript/hyperscript-adapter`](../hyperscript-adapter) (which adapts
upstream `_hyperscript`), built on the hook/vocab pattern from
[loka-js](https://github.com/wmtalcott/loka-js) (which adapts the fixiproject
family). It is **not** the same thing as hyperfixi's embedded htmx-compat layer
(`packages/core/src/htmx/` — the `hyperfixi-hx*.js` bundles), which
_reimplements_ htmx attributes on hyperfixi's own runtime. This adapter drives
the **real htmx** library.

All three consumers share one vocabulary source: the generated modules under
[`packages/core/vocab/htmx/`](../core/vocab/htmx), derived from
`@lokascript/semantic` profiles + `@lokascript/i18n` dictionaries. `click` is
`clic` everywhere.

## Mechanism

htmx v4 has no hook to override attribute-name resolution — core reads `hx-get`
literally (see [docs/UPSTREAM_HOOK_PROPOSAL.md](docs/UPSTREAM_HOOK_PROPOSAL.md)
for the seam we're proposing upstream). Until that exists, the adapter
**canonicalizes**: before htmx processes a node, each localized attribute is
copied to its canonical name on the same element (`hx-obtener="/x"` gains a
sibling `hx-get="/x"`). Two coverage paths:

1. **Initial page** — a document sweep at `DOMContentLoaded`. Load the adapter
   _before_ the htmx `<script>` so the sweep listener registers first
   (loka-js's "orchestrator before libraries" rule).
2. **Swapped-in content** — a registered htmx v4 extension
   (`lokascript-i18n`) canonicalizes each subtree in
   `htmx_before_process_node`. (A best-effort `defineExtension`/`onEvent`
   fallback covers htmx v1/v2.)

Guarantees, mirroring loka-js where the mechanism allows:

- **Authored attributes are never removed or rewritten** — devtools shows what
  the author wrote. One documented exception: an author-written canonical
  `hx-trigger` whose _value_ uses localized event names (`hx-trigger="clic"`)
  is translated in place (idempotently), since there is no separate canonical
  target.
- **An existing canonical attribute always wins** — `hx-get` is never
  overwritten by `hx-obtener`.
- **No vocab loaded → no-op.** Stock htmx pages pay nothing.

## Per-element language

Language resolves per element at canonicalization time (not per page):

1. `data-hyperfixi-lang` on the element
2. `data-hyperfixi-lang` on any ancestor
3. `lang` on any ancestor (HTML standard)
4. `'en'` fallback

So `<section lang="es">` and `<section lang="ja">` coexist on one page, each
resolving its own vocabulary.

## Programmatic API

```js
import {
  register, // register(lang, payload) — same shape as core's vocab modules
  registerWith, // registerWith(htmx) → 'v4' | 'v2' | null
  installAutoSweep, // initial-document sweep + re-sweep on late vocab
  canonicalizeTree, // manual canonicalization of a subtree
  langOf, // per-element language resolution
} from '@lokascript/htmx-adapter';
```

The browser IIFE does all the wiring automatically and installs
`window.__hyperfixi_i18n.register` so the generated vocab modules
self-register. If the page also runs hyperfixi's embedded layer, registrations
fan out to both registries.

## Scope (v1)

Attribute **names** (`hx-obtener` → `hx-get`, including the `hx-on:` colon
family) and **event values** in `hx-trigger` / `hx-on:` suffixes
(`clic` → `click`). The `hx-`/`sse-`/`ws-` prefixes are preserved across
languages — only the suffix is localized. Translating hyperscript/JS attribute
_bodies_ is out of scope here (use `@lokascript/hyperscript-adapter` for `_=`).

## Tests

```bash
npm test --prefix packages/htmx-adapter    # vitest, jsdom (43 tests)
```

Includes a reuse guard that loads every generated
`packages/core/vocab/htmx/{lang}.js` module against this adapter's registry, so
generator drift fails here rather than in a browser.

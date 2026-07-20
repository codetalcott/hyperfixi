# @lokascript/htmx-adapter

Multilingual adapter for **upstream htmx v4** — author `hx-*` / `sse-*` / `ws-*`
attributes in 24 languages against the stock htmx library.

```html
<script src="htmx-i18n.global.js"></script>
<!-- this adapter (2.3 KB gz) -->
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
literally. We maintain a proposed upstream seam plus a working ~30-line
reference patch against beta5 and a ready-to-file Discussion draft
([docs/UPSTREAM_HOOK_PROPOSAL.md](docs/UPSTREAM_HOOK_PROPOSAL.md)); against a
patched build, `installResolverMode(htmx)` localizes with **zero DOM
mutation** (proven in the e2e suite). Until the seam exists upstream, the
adapter **canonicalizes**: before htmx processes a node, each localized
attribute is copied to its canonical name on the same element
(`hx-obtener="/x"` gains a sibling `hx-get="/x"`). Two coverage paths:

1. **Initial page** — a document sweep at `DOMContentLoaded`. Load the adapter
   _before_ the htmx `<script>` so the sweep listener registers first
   (loka-js's "orchestrator before libraries" rule).
2. **Swapped-in content** — a registered htmx v4 extension
   (`lokascript-i18n`) canonicalizes each subtree in
   `htmx_before_process_node`. (A best-effort `defineExtension`/`onEvent`
   fallback covers htmx v1/v2.)

Guarantees, mirroring loka-js where the mechanism allows:

- **Authored attributes are never removed or rewritten** — devtools shows what
  the author wrote. Two documented exceptions: an author-written canonical
  `hx-trigger` whose _value_ uses localized event names (`hx-trigger="clic"`)
  is translated in place (idempotently), since there is no separate canonical
  target; and canonical-named `hx-on:*` attrs are removed in opt-in executor
  mode (see below), since htmx would otherwise JS-eval their hyperscript
  bodies.
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

## Hyperscript `hx-on:` bodies (executor mode, opt-in)

By default, `hx-on:*` bodies keep upstream semantics: they are **JavaScript**,
htmx executes them, and the adapter translates only the attribute _name_ and
event suffix. JS is language-neutral — there is nothing to translate.

To author **hyperscript** bodies instead — including localized ones — opt in
by configuring an executor. The easiest way is auto-detection: load
`_hyperscript` (and, for non-English bodies, a
`@lokascript/hyperscript-adapter` language bundle) on the page and the adapter
wires itself:

```html
<script src="_hyperscript.js"></script>
<script src="hyperscript-i18n-es.global.js"></script>
<!-- translator: HyperscriptI18n.preprocess -->
<script src="htmx-i18n.global.js"></script>
<script src="vocab/htmx/es.js"></script>
<script src="htmx.js"></script>

<section lang="es">
  <button hx-obtener="/api" hx-objetivo="#out" hx-en:clic="alternar .cargando">…</button>
</section>
```

Or wire it manually:

```js
import { setBodyExecutor, setBodyTranslator } from '@lokascript/htmx-adapter';
setBodyExecutor((code, elt, evt) => _hyperscript.evaluate(code, { me: elt, event: evt }));
setBodyTranslator((body, lang) => HyperscriptI18n.preprocess(body, lang)); // optional
```

With an executor set, the adapter **claims the entire `hx-on` family** (all
bodies are treated as hyperscript — mixed JS/hyperscript pages have no
reliable detection):

- It installs a real event listener per `hx-on`-family attribute and runs the
  body through the executor. Translation (localized → English hyperscript) is
  lazy — first fire, memoized — and confidence-gated by the
  hyperscript-adapter preprocessor, so untranslatable bodies pass through
  unchanged.
- **Localized-named attrs** (`hx-en:clic`) stay verbatim in the DOM and get
  no canonical sibling — htmx never recognized them anyway.
- **Canonical-named attrs** (`hx-on:click`) are **removed** after claiming —
  the second (and last) documented exception to the never-mutate rule: left
  in place, htmx would eval the hyperscript body as JS, giving a console
  error plus a double-execution attempt on every fire.
- The `hx-on::after-swap` shorthand maps to the `htmx:` event namespace and
  works unchanged (the listener hears htmx's real CustomEvents).
- Re-sweeps never stack duplicate listeners (claims are keyed per element by
  resolved event name), and an executor configured _after_ the initial sweep
  triggers a healing re-sweep.

A side benefit: executor mode never uses `eval`, so hyperscript bodies work on
CSP-restricted pages where htmx's native `hx-on` JS eval cannot.

`hx-live` bodies stay out of scope: upstream v4's re-execution semantics are
internal to htmx's reactivity — name translation only.

## Scope (v1)

Attribute **names** (`hx-obtener` → `hx-get`, including the `hx-on:` colon
family) and **event values** in `hx-trigger` / `hx-on:` suffixes
(`clic` → `click`), plus opt-in hyperscript `hx-on:` **bodies** via executor
mode (above). The `hx-`/`sse-`/`ws-` prefixes are preserved across languages —
only the suffix is localized. The `_=` attribute is
`@lokascript/hyperscript-adapter`'s job, not this package's.

## Tests

```bash
npm test --prefix packages/htmx-adapter                  # vitest, jsdom (60 tests)
npm run test:browser --prefix packages/htmx-adapter      # Playwright e2e (build dist first)
```

The unit suite includes a reuse guard that loads every generated
`packages/core/vocab/htmx/{lang}.js` module against this adapter's registry, so
generator drift fails here rather than in a browser.

The Playwright suite drives **real vendored libraries** — htmx `4.0.0-beta5`,
htmx `2.0.10`, `_hyperscript` `0.9.93` (`test/browser/vendor/`) — verifying the
end-to-end truths mocks can't: the v4 extension hook name and firing
granularity (`htmx_before_process`, per processed root — validated against the
beta5 source), request/swap from a localized button, both script orders,
localized attributes inside swapped-in content, executor-mode `hx-on` bodies
running through real `_hyperscript` with `me` bound, and the htmx 2.x
`defineExtension` fallback.

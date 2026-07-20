# Proposal: an attribute-name resolver seam for htmx v4

Status: **draft, validated against htmx 4.0.0-beta5** (`dist/htmx.js`, vendored
at `../test/browser/vendor/` — see its README for the extracted ground truth).
This document is the design rationale; the persuasive form for upstream is a
small reference patch against `src/htmx.js` plus this text.

## Summary

Add one optional, opt-in seam to htmx core: when core looks up an attribute on
an element, consult a user-provided **attribute-name resolver** before falling
back to the literal name. Nothing changes for pages that don't set it.

```js
htmx.config.attributeResolver = (elt, name) => string | null;
// return an alternate attribute name to read for `name` on `elt`,
// or null/undefined to use `name` as-is (the default).
```

## Why

htmx v4 funnels essentially all attribute reads through two private helpers —
verified in 4.0.0-beta5: `#attr(elt, name)` (raw read) and
`#attributeValue(elt, name, …)` (adds `:inherited`/`:append` handling). That
is a rare property: **one chokepoint covers every attribute** — current and
future — without per-attribute wiring.

Better still, **v4 already ships attribute-name indirection at exactly this
seam**: `config.prefix` (default `data-hx-`) makes `#attr` retry every read
with a prefixed spelling, and `#prefixes()` unions the prefixed forms into the
compiled discovery selectors (`#actionSelector`, `#boostSelector`, the
`#hxOnQuery` XPath). The resolver proposed here is a per-element
generalization of that existing, shipped mechanism — not a new concept for
core. A resolver consulted there enables, with zero cost when unset:

- **Localized authoring** (our use case): `hx-obtener` read as `hx-get` for
  elements under `lang="es"`, resolved per element, with the DOM left exactly
  as the author wrote it — no attribute copying, no MutationObserver, no
  devtools mismatch. Prior art: the fixi family ships exactly this seam
  (`fixi.name = (elt, key) => …` with `??=` English defaults), which loka-js
  uses to localize fixi/moxi/paxi into 24 languages with a ~110-byte patch.
- **Migration shims**: reading legacy attribute spellings (v1/v2 names, or a
  team's historical fork) without rewriting templates.
- **Vendor prefixing / namespacing**: `data-hx-get` or `x-hx-get` policies for
  CSP-conservative or CMS-restricted environments.

Today the only extension-side alternative is what this package does: copy the
localized attribute to its canonical name in `htmx_before_process_node`. It
works, but it mutates the DOM htmx manages, doubles the attribute surface in
devtools, and races anything else that reads attributes before processing.

## Shape

Sketch (illustrative — exact form to be adapted to the current v4 source):

```diff
+ // htmx.config.attributeResolver: optional (elt, name) => string|null.
+ // When set, core reads the resolved name instead of `name`. Default: unset.
  function attributeValue(elt, name) {
+   const resolver = htmx.config.attributeResolver
+   if (resolver) {
+     const resolved = resolver(elt, name)
+     if (resolved) name = resolved
+   }
    return elt.getAttribute(name)
  }
```

Design properties worth preserving in review:

- **Opt-in and zero-cost when unset** — one falsy check on the hot path.
- **Per-element** — the resolver receives the element, so per-scope policies
  (nearest `lang` ancestor) work; a global rename table is the degenerate case.
- **Name-level, not value-level** — values are not touched; anything
  value-shaped (trigger specs, vals) stays core's business.
- **Selector caveat** (learned from loka-js, confirmed in beta5): a
  per-element resolver cannot drive core's _document-level discovery
  selectors_. v4's scan IS compiled — `#actionSelector`, `#boostSelector`,
  and the `#hxOnQuery` XPath — so discovery needs a companion seam (e.g.
  `htmx.config.additionalAttributeSelectors: string[]`). The good news:
  `#prefixes()` already implements precisely this union for `config.prefix`,
  so the companion seam extends an existing code path rather than adding a
  new one. The fixi patch solves the same split with a separate
  union-selector hook (`fixi.sel`); any upstream proposal must address it or
  scanning will silently miss resolved-only elements.

## Relationship to this package

`@lokascript/htmx-adapter` is built mechanism-agnostic: `registry.ts`,
`canonicalize.ts`'s vocab tables, and `lang-resolver.ts` are all reusable under
the hook. If upstream accepts the resolver, the adapter replaces its
canonicalization shim with:

```js
htmx.config.attributeResolver = (elt, name) => {
  const vocab = vocabFor(langOf(elt));
  if (!vocab) return null;
  // inverse direction: core asks for canonical, we answer with the
  // localized name present on the element
  return localizedNamePresentOn(elt, name, vocab) ?? null;
};
```

and deletes the DOM mutation entirely — vocab modules, language resolution,
and load-order guidance are unchanged.

## Filing plan

1. ~~Re-validate hook names/internals against the current v4 source.~~ Done
   against the 4.0.0-beta5 dist (see `../test/browser/vendor/README.md`):
   chokepoints are `#attr`/`#attributeValue`; discovery selectors are
   compiled but already union-built via `#prefixes()`; extension hooks are
   event-name-derived (`htmx_before_process`). Re-check against `src/htmx.js`
   at HEAD when writing the patch — betas move.
2. Produce the reference patch (resolver + discovery-selector companion,
   both extending the existing `config.prefix` code paths) and run htmx's
   own test suite against it.
3. Open a Discussion (not a PR) framing the generic use cases first — lead
   with "generalizes the shipped `config.prefix` indirection" — with the
   patch attached; link loka-js and this adapter as working prior art of both
   the seam and the fallback (this package's e2e suite drives real beta5).

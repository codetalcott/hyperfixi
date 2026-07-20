# Proposal: an attribute-name resolver seam for htmx v4

Status: **draft** — to be filed against `bigskysoftware/htmx` once validated
against the current v4 source. This document is the design rationale; the
persuasive form for upstream is a small reference patch against `src/htmx.js`
plus this text.

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

htmx v4 funnels essentially all attribute reads through a small number of
internal helpers (`attributeValue`, `getAttributeValueWithDisinheritance`).
That is a rare property: **one chokepoint covers every attribute** — current
and future — without per-attribute wiring. A resolver consulted there enables,
with zero cost when unset:

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
- **Selector caveat** (learned from loka-js): a per-element resolver cannot
  drive core's _document-level discovery selectors_. If v4's initial scan uses
  a compiled `[hx-get],[hx-post],…` selector, discovery needs a companion
  seam (e.g. `htmx.config.additionalAttributeSelectors: string[]`) or the scan
  must remain attribute-agnostic. The fixi patch solves this with a separate
  union-selector hook (`fixi.sel`); any upstream proposal must address the
  same split or scanning will silently miss resolved-only elements.

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

1. Re-validate hook names/internals against htmx v4 HEAD (`src/htmx.js`).
2. Produce the reference patch (resolver + discovery-selector companion) and
   run htmx's own test suite against it.
3. Open a Discussion (not a PR) framing the generic use cases first, with the
   patch attached; link loka-js and this adapter as working prior art of both
   the seam and the fallback.

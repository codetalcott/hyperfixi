# [Ready-to-file Discussion draft for bigskysoftware/htmx]

> Status: prepared against `htmx.org@4.0.0-beta5`. Before filing:
> re-diff against `src/htmx.js` at HEAD, run htmx's own test suite with
> the patch applied (requires an htmx checkout — not done here), and
> update the version references. File as a **Discussion**, not a PR.

---

**Title:** Proposal (v4): opt-in attribute-name resolver — generalizing
the `config.prefix` indirection

## What

Two small, opt-in config seams that let pages teach htmx alternate
attribute spellings without forking or rewriting the DOM:

```js
htmx.config.attributeResolver = (elt, name) => string | null
// consulted when a read of `name` (and its prefixed form) found nothing;
// returns an alternate attribute name to read on this element, or null.

htmx.config.additionalAttributeSelectors = ['[hx-obtener]', …]
// unioned into the compiled discovery selectors so resolved-only
// elements are found by the scan.
```

Both default to unset/empty; stock pages pay one falsy check.

## Why

htmx v4 already ships attribute-name indirection at exactly this seam:
`config.prefix` (default `data-hx-`) makes `#attr()` retry reads under a
prefixed spelling, and `#prefixes()` unions prefixed forms into
`#actionSelector` / `#boostSelector` / the `hx-on` XPath. This proposal
is a per-element generalization of that shipped mechanism — same two
touch points, pluggable policy. Use cases:

- **Localized authoring** — `hx-obtener` read as `hx-get` for elements
  under `lang="es"`, per element (mixed-language pages work), DOM left
  exactly as authored. Prior art: fixi ships this seam natively
  (`fixi.name = (elt, key) => …` + a selector hook), which the loka-js
  project uses to localize fixi/moxi/paxi into 24 languages at a
  ~110-byte patch cost per library.
- **Migration shims** — reading legacy/renamed attribute spellings
  without template rewrites.
- **Vendor prefixing / namespacing beyond a single static prefix** —
  policy-driven `data-hx-*`/`x-hx-*` schemes.

Without the seam, the extension-side workaround (which we ship today) is
copying localized attributes to canonical names in `htmx_before_process`
— it works, but it mutates the DOM htmx manages, doubles the attribute
surface in devtools, and races anything else reading attributes before
processing.

## Reference patch

Attached: `htmx-4.0.0-beta5-attribute-resolver.patch` (~30 added lines
against the published beta5 build):

1. Two config defaults (`attributeResolver: null`,
   `additionalAttributeSelectors: []`).
2. `#attr()` / `#attrName()` consult the resolver as a LAST fallback —
   literal and prefixed reads keep priority, so existing behavior is
   byte-identical when unset.
3. Discovery selectors move from one-shot constructor build to
   `#rebuildDiscoverySelectors()`, re-checked at `process()` entry with
   a cheap string-key cache — so selector additions registered after
   load (e.g. by a late vocab module) are honored without re-init.

Working proof: the `@lokascript/htmx-adapter` e2e suite drives this
patched build in a real browser — a Spanish-attribute button issues a
real request and swap with **zero DOM mutation** (the element's
attribute list stays exactly `[hx-obtener, hx-objetivo, id]`), alongside
the same suite driving the unpatched build through the copy-attribute
fallback. <link to package>

## Deliberate limits (matching core's current split)

- **Name-level only.** Values (`hx-trigger` specs, `hx-vals`) are never
  touched — same boundary `config.prefix` has today.
- **The `hx-on` family is out of scope** — its event name is part of the
  attribute name; resolving it means asking a different question
  ("which of this element's attributes are hx-on-family?"), which the
  XPath scan owns. Extensions can (and do) handle that family
  themselves.
- The resolver fires only after literal + prefixed reads miss, so it can
  never shadow a real `hx-*` attribute.

Happy to adapt shape/naming (e.g. folding the selector list into the
resolver contract, or a `config.attributeAliases` static-map variant if
a function feels too open-ended) — the two-seam split itself (per-element
read + document-level discovery) is the part we'd argue for, since a
per-element function structurally cannot drive a compiled scan.

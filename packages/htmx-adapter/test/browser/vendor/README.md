# Vendored libraries for browser e2e tests

Version-pinned upstream artifacts the Playwright suite runs the adapter
against. These are TEST FIXTURES, not shipped code — they exist so the
suite exercises the real libraries instead of mocks, and so an htmx
API change fails here first.

| File                             | Package           | Version       | Source                                                               |
| -------------------------------- | ----------------- | ------------- | -------------------------------------------------------------------- |
| `htmx-4.0.0.js`                  | `htmx.org`        | 4.0.0         | npm tarball, `dist/htmx.js`                                          |
| `htmx-4.0.0-resolver-patched.js` | `htmx.org`        | 4.0.0 + patch | above + `docs/reference-patches/htmx-4.0.0-attribute-resolver.patch` |
| `htmx-2.0.10.js`                 | `htmx.org`        | 2.0.10        | npm tarball, `dist/htmx.js`                                          |
| `_hyperscript-0.9.93.min.js`     | `hyperscript.org` | 0.9.93        | npm tarball, `dist/_hyperscript.min.js`                              |

To bump a version: `npm pack <pkg>@<version>`, copy the dist file in
under the new versioned name, update the fixture pages and this table.

## Ground truth extracted from htmx 4.0.0 (informs `src/extension.ts`)

Re-verified on the released 4.0.0 build (2026-09-03) by diffing it against the
previously vendored 4.0.0-beta5. Everything the adapter depends on is
unchanged or now formally documented:

- Extensions register via `htmx.registerExtension(name, ext)`. If
  `htmx.config.extensions` is set (default `''` = open), unlisted names
  are rejected and the call **returns `false`** — as does a duplicate
  name. `htmx.d.ts` still types the return as `void`, so a caller must
  check `=== false` explicitly. The adapter's `registerWith` must never
  arm a hook-dependent guard from the API's shape alone.
- Extension hook keys are event names with `:` → `_`:
  `process()` fires `htmx:before:process` on the processed ROOT (initial
  `document.body`, and each swapped-in subtree via re-`process()`), so
  the adapter's hook key is `htmx_before_process`. Hooks receive
  `(elt, detail)`; returning `false` cancels processing.
- `process()` then fires `htmx:before:on:init` on EVERY node carrying an
  hx-on-family attribute (`#hxOnQuery`, an XPath over
  `#prefixes("hx-on")` = `hx-on` plus `config.prefix + "on"`, default
  prefix `data-hx-`), before `#handleHxOnAttributes` binds it. The
  shipped `htmx.d.ts` documents it: "Cancel to prevent `hx-on` handlers
  from being registered on the element" — a public contract, not beta
  behaviour. An extension method returning `false` cancels the node.
- `#handleHxOnAttributes` binds the composite `hx-on="event -> code"`
  form and the `hx-on<metaCharacter>event` colon form (`config.metaCharacter`,
  default `:`), for each prefix. A node already bound (`_htmx.onInitialized`)
  is skipped; `process(root, true)` clears that via `#cleanup`.
- `HCON.split` (top-level-comma trigger-spec splitter) is byte-identical
  to beta5. **New in 4.0.0:** `internalAPI` (passed to `init(internalAPI)`)
  now exposes `HCON` itself, alongside `attributeValue`,
  `parseTriggerSpecs`, `initSecurity`, `onTrigger`, `htmxProp`,
  `executeJavaScript` and the rest.
- htmx v4 init waits (DOMContentLoaded, or a `setTimeout` tick when the
  document is already interactive) so extensions can register first;
  `initialize()` is now a public method.
- **New verb in 4.0.0:** `hx-query` (`#verbs` and the action selector).
  The localized vocab modules do not translate it yet; an authored
  `hx-query` passes through untouched as its own canonical name.
- htmx 2.0.10 keeps `defineExtension` + `onEvent`, and fires
  `htmx:beforeProcessNode` — the adapter's v2 fallback path.

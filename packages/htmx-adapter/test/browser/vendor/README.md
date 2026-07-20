# Vendored libraries for browser e2e tests

Version-pinned upstream artifacts the Playwright suite runs the adapter
against. These are TEST FIXTURES, not shipped code — they exist so the
suite exercises the real libraries instead of mocks, and so a v4 beta
API change fails here first.

| File                         | Package           | Version     | Source                                  |
| ---------------------------- | ----------------- | ----------- | --------------------------------------- |
| `htmx-4.0.0-beta5.js`        | `htmx.org`        | 4.0.0-beta5 | npm tarball, `dist/htmx.js`             |
| `htmx-2.0.10.js`             | `htmx.org`        | 2.0.10      | npm tarball, `dist/htmx.js`             |
| `_hyperscript-0.9.93.min.js` | `hyperscript.org` | 0.9.93      | npm tarball, `dist/_hyperscript.min.js` |

To bump a version: `npm pack <pkg>@<version>`, copy the dist file in
under the new versioned name, update the fixture pages and this table.

## Ground truth extracted from htmx 4.0.0-beta5 (informs `src/extension.ts`)

- Extensions register via `htmx.registerExtension(name, ext)`. If
  `htmx.config.extensions` is set (default `''` = open), unlisted names
  are silently rejected.
- Extension hook keys are event names with `:` → `_`:
  `process()` fires `htmx:before:process` on the processed ROOT (initial
  `document.body`, and each swapped-in subtree via re-`process()`), so
  the adapter's hook key is `htmx_before_process`. Hooks receive
  `(elt, detail)`; returning `false` cancels processing.
- The hook fires BEFORE `#handleHxOnAttributes` binds `hx-on` listeners
  — executor mode's removal of canonical `hx-on:*` attrs therefore wins
  the race by construction.
- htmx v4 init waits (DOMContentLoaded, or a `setTimeout` tick when the
  document is already interactive) precisely so extensions can register
  first.
- v4 also reads a configurable attribute prefix (default `data-hx-`);
  the adapter writes unprefixed canonical names, which v4 reads first.
- htmx 2.0.10 keeps `defineExtension` + `onEvent`, and fires
  `htmx:beforeProcessNode` — the adapter's v2 fallback path.

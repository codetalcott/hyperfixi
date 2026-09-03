# Vendored libraries for browser e2e tests

Version-pinned upstream artifacts the Playwright suite runs the adapter
against. These are TEST FIXTURES, not shipped code — they exist so the
suite exercises the real `_hyperscript.org` runtime instead of mocks (and
instead of a CDN fetch, which made the suite network-dependent and let the
pinned version drift from what the adapter requires).

| File                         | Package           | Version | Source                                  |
| ---------------------------- | ----------------- | ------- | --------------------------------------- |
| `_hyperscript-0.9.93.min.js` | `hyperscript.org` | 0.9.93  | npm tarball, `dist/_hyperscript.min.js` |

To bump a version: `npm pack hyperscript.org@<version>`, copy the dist file
in under the new versioned name, update `adapter-test.html` and this table.

## Ground truth extracted from \_hyperscript 0.9.93 (informs `src/attribute-translator.ts`)

- `addBeforeProcessHook(fn)` is the supported public extension point the
  adapter requires (present in this dist; absent in 0.9.14, which is why
  the fixture's old CDN pin went dark when commit 86405944 moved the
  adapter off the `getScript` monkey-patch and onto the hook).
- The hook fires on the subtree root passed to `processNode()` BEFORE the
  runtime reads the configured script attributes (`_`, `script`,
  `data-script` by default, via `config.attributes`) or a
  `<script type="text/hyperscript">` body — so rewriting the attribute in
  place at hook time is a real "translate before parse" seam.
- `Runtime#getScript` is a private class field (`#getScript`) in current
  builds: assigning `internals.runtime.getScript` creates a stray own
  property the runtime never reads. Any patch-based approach silently
  no-ops; the hook is the only supported seam.

# Vendored: upstream `_hyperscript`'s test suite

`0.9.93/test/` is the `commands`, `core`, `expressions`, `features` and `templates` directories
of [`bigskysoftware/_hyperscript`](https://github.com/bigskysoftware/_hyperscript)'s `test/`, at
tag `0.9.93` (commit `ea9a6534d24cf5c7257adcaad75ee75b0c612d8e`), unmodified. Upstream is
licensed 0BSD; its `LICENSE` is beside the tests.

These files are the engine's acceptance oracle (`../run.mjs`). They are test fixtures, not
shipped code. They are not edited here, formatted or linted: a difference from upstream would
make the oracle ours instead of theirs.

`0.9.93` is the release this repository's other gates use (`hyperscript.org` in
`packages/testing-framework`, the adapter's vendored runtime). To move to a newer release, add
its directory beside this one, point `VENDORED` in `../run.mjs` at it, port the source changes
between the two tags, and update `../known-failures.json` in the same change.

To try another upstream version without vendoring it:

```bash
HYPERSCRIPT_REPO=../_hyperscript HYPERSCRIPT_REF=<tag or commit> node upstream-suite/run.mjs --bundle dist/full.js
```

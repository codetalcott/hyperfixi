# Vendored for the engine's own tests

The htmx and fixi builds `../regressions.js` and `../additions.js` load before the engine boots,
so the tests run against the releases the docs tell users to put beside `hyperfixi-hs.js`.
Upstream's htmx tests (`../../upstream-suite`) run against the htmx 4.0.0-beta1 build upstream
pins; these are the releases. Test fixtures, not shipped code; unchanged.

| File                | From                                                                           | License                                 |
| ------------------- | ------------------------------------------------------------------------------ | --------------------------------------- |
| `htmx-4.0.0.min.js` | `htmx.org@4.0.0` `dist/htmx.min.js` (the copy in `examples/vendor/htmx-4.0.0`) | Zero-Clause BSD (`LICENSE-htmx`)        |
| `fixi-0.9.4.js`     | `fixi-js@0.9.4` `fixi.js`                                                      | Zero-Clause BSD (the package's `BSD-0`) |

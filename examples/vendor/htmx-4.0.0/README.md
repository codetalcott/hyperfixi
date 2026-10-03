# Vendored htmx 4.0.0

Upstream htmx, pinned, for the example pages that pair it with `hyperfixi-hs.js`
(`examples/hx-v4/`, `examples/hx-v4-i18n/`). These are upstream's files, unchanged, from the
`htmx.org@4.0.0` npm tarball (`dist/htmx.min.js`, `dist/ext/hx-sse.min.js`,
`dist/ext/hx-ws.min.js`); `LICENSE` is upstream's (Zero-Clause BSD). They are example fixtures,
not shipped code: a page that pairs the engine with htmx loads htmx from its own CDN or package.

| File                | Gzipped | What                                                     |
| ------------------- | ------- | -------------------------------------------------------- |
| `htmx.min.js`       | 13.1 KB | htmx 4 core                                              |
| `ext/hx-sse.min.js` | 2.5 KB  | `hx-sse:connect`: stream `text/event-stream` into a swap |
| `ext/hx-ws.min.js`  | 3.0 KB  | `hx-ws:connect` / `hx-ws:send`: WebSockets               |

To bump: `npm pack htmx.org@<version>`, copy the three files in, rename the directory, update
the pages' `<script src>` paths and this table. `packages/htmx-adapter/test/browser/vendor/`
holds its own pinned copy for that package's e2e suite; the two are bumped independently.

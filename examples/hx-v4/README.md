# hx-v4 examples

Interactive demos of HyperFixi's htmx v4 attribute support — `hx-live`,
`bind`, `sse-connect` / `sse-swap`, `ws-connect` / `ws-send`.

All demos run on the single `hyperfixi-hx-v4.js` bundle (full runtime +
`@hyperfixi/reactivity` + htmx-compat + SSE/WS, all auto-installed).

## Run locally

From the project root:

```bash
npx http-server . -p 3000 -c-1
```

Then open one of:

- <http://127.0.0.1:3000/examples/hx-v4/hx-live-counter.html>
- <http://127.0.0.1:3000/examples/hx-v4/hx-live-multiple-deps.html>
- <http://127.0.0.1:3000/examples/hx-v4/hx-live-no-reactivity.html>
- <http://127.0.0.1:3000/examples/hx-v4/bind-to-property.html>
- <http://127.0.0.1:3000/examples/hx-v4/sse-stream.html>
- <http://127.0.0.1:3000/examples/hx-v4/ws-chat.html>

## What each demo shows

### `hx-live-counter.html`

The minimum viable `hx-live` setup. A counter mutates `$count`; a div with
`hx-live="put $count into me"` re-renders on every change. Demonstrates that the
live body re-runs whenever a tracked dependency changes.

### `hx-live-multiple-deps.html`

Same idea, two dependencies. The live body reads `$price` and `$quantity` and
displays their product. Either input change triggers a re-render — but mutating
an unrelated global does NOT (try it in the console). This is the key
ergonomic win over htmx v4's vanilla `hx-live`, which re-evaluates on every DOM
mutation event regardless of relevance.

### `hx-live-no-reactivity.html`

The error path. This page intentionally loads the **slim** `hyperfixi-hx.js`
bundle and does NOT install `@hyperfixi/reactivity`. The processor's gate
fires: `hx-live` elements are skipped with a clear console error, and other
htmx attributes on the same page (here, `hx-on:click`) continue to work. Open
devtools console to see the diagnostic message.

### `bind-to-property.html`

Two-way `bind`. A color picker and a text input both run `_="bind $color to me"`
and stay in sync via the shared `$color` global. A swatch's `hx-live` body
recomputes its `style` attribute reactively whenever `$color` changes.
Demonstrates the auto-detect bind path for form elements plus reactivity for
non-form display.

### `sse-stream.html`

`sse-connect` / `sse-swap` against an in-page mock `EventSource`. The mock pushes
a synthetic `tick` event every 800ms; the processor routes each event's `data`
through `hx-target` + `hx-swap="afterbegin"` to grow a live feed. In production,
point `sse-connect` at a real `text/event-stream` endpoint.

### `ws-chat.html`

`ws-connect` / `ws-send` against an in-page mock `WebSocket`. The form's fields
are serialized to JSON on submit and sent over the socket; the mock echoes
back a swap envelope (`{target, swap, data}`) which the processor recognizes
and applies through the standard swap machinery.

## Bundle

All reactive demos load a single script:

```html
<script src="../../packages/core/dist/hyperfixi-hx-v4.js"></script>
```

That bundle includes everything needed for the htmx v4 surface:

1. **Full hyperscript runtime** — needed so the `set` command fires
   `notifyGlobalWrite()` on writes to `$count` / `$price` / etc. The slim
   `hybrid-complete` runtime in `hyperfixi-hx.js` skips that notify, which
   is why the slim bundle's hx-live half-renders (initial value only, no
   updates).
2. **`@hyperfixi/reactivity`** — auto-installed at bundle init. Registers
   the `live` / `when` / `bind` parser features and the global read/write
   hooks that wire reads to effect subscriptions and writes to notify.
3. **htmx-compat attribute processor** — auto-initialized on
   `DOMContentLoaded`. Translates `hx-live`, routes `sse-*` / `ws-*` through
   the SSE/WS modules.
4. **SSE + WS modules** — connection management, bounded backoff reconnect,
   cleanup on element removal via MutationObserver.

Trade-off: `hyperfixi-hx-v4.js` is much larger than the slim
`hyperfixi-hx.js` (~257 KB vs 13 KB gzipped). If you don't need any of
hx-live / SSE / WS / bind, stay on the slim bundle. For production builds,
use [`@hyperfixi/vite-plugin`](../../packages/vite-plugin/) — it scans your
HTML and, when v4 features are detected, falls back to the hx-v4 bundle
automatically; otherwise it ships the minimal handcrafted bundle.

## Cross-link

- Reactivity package: [`packages/reactivity/`](../../packages/reactivity/) —
  the `hx-live` bridge is documented in
  [its README](../../packages/reactivity/README.md#hx-live-bridge).
- Plan: [`~/.claude/plans/htmx-v4-reactive-streaming.md`](file://~/.claude/plans/htmx-v4-reactive-streaming.md).

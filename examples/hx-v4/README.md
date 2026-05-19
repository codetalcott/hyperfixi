# hx-v4 examples

Interactive demos of HyperFixi's htmx v4 attribute support.

> **Status: hx-live works end-to-end via the new `hyperfixi-hx-v4` bundle.**
>
> The `hyperfixi-hx-v4.js` bundle (Phase 5) bundles the full hyperscript
> runtime + `@hyperfixi/reactivity` + the htmx-compat attribute processor
> into a single script tag. Single runtime → single `notifyGlobalWrite`
> path → reactive effects wake when `_=` handlers mutate globals.
>
> SSE and WebSocket demos land with Phases 3 / 4. Localized attribute
> names land with Phase 8.

## Run locally

From the project root:

```bash
npx http-server . -p 3000 -c-1
```

Then open one of:

- <http://127.0.0.1:3000/examples/hx-v4/hx-live-counter.html>
- <http://127.0.0.1:3000/examples/hx-v4/hx-live-multiple-deps.html>
- <http://127.0.0.1:3000/examples/hx-v4/hx-live-no-reactivity.html>

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

## Bundle wiring

The first two demos load a single script:

```html
<script src="../../packages/core/dist/hyperfixi-hx-v4.js"></script>
```

That bundle includes everything needed for `hx-live`:

1. **Full hyperscript runtime** — needed for the `set` command to fire
   `notifyGlobalWrite()` on writes to `$count` / `$price` / etc. The slim
   `hybrid-complete` runtime in `hyperfixi-hx.js` skips that notify, which
   is why the slim bundle's hx-live half-renders (initial value only, no
   updates).
2. **`@hyperfixi/reactivity`** — auto-installed at bundle init. Registers
   the `live` / `when` / `bind` parser features and the global read/write
   hooks that wire reads to effect subscriptions and writes to notify.
3. **htmx-compat attribute processor** — auto-initialized on
   `DOMContentLoaded`. Translates `hx-live` to a `live ... end` block run
   through the same full runtime.

Trade-off: `hyperfixi-hx-v4.js` is much larger than the slim
`hyperfixi-hx.js` (~257 KB vs 13 KB gzipped). If you don't need `hx-live`
/ SSE / WS / `bind`, stay on the slim bundle. For production builds, use
[`@hyperfixi/vite-plugin`](../../packages/vite-plugin/) — it scans your
HTML and emits a bundle with only the surface you actually use.

## Cross-link

- Reactivity package: [`packages/reactivity/`](../../packages/reactivity/) —
  the `hx-live` bridge is documented in [its README](../../packages/reactivity/README.md#hx-live-bridge).
- Plan: [`~/.claude/plans/htmx-v4-reactive-streaming.md`](file://~/.claude/plans/htmx-v4-reactive-streaming.md).

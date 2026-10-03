# hx-v4 examples

Demos of the two stacks that replace hyperfixi's embedded htmx layer (retired with
`packages/core` in the engine migration, 2026-10-03):

- **the engine alone** — `hyperfixi-hs.js` has upstream's reactive features, `live`, `when` and
  `bind`, built in: a hyperscript-bodied reactive block is `_="live put $count into me"`.
- **the engine beside real htmx 4** — `hyperfixi-hs.js` + `examples/vendor/htmx-4.0.0/htmx.min.js`
  and the extension a page needs (`hx-sse`, `hx-ws`). Hyperscript handles behavior, htmx handles
  requests and streams; neither reimplements the other. Localized attribute names come from
  `@lokascript/htmx-adapter` (see `../hx-v4-i18n/`).

## Run locally

From the project root:

```bash
npx http-server . -p 3000 -c-1
```

Then open one of:

- <http://127.0.0.1:3000/examples/hx-v4/hx-live-counter.html>
- <http://127.0.0.1:3000/examples/hx-v4/hx-live-multiple-deps.html>
- <http://127.0.0.1:3000/examples/hx-v4/bind-to-property.html>
- <http://127.0.0.1:3000/examples/hx-v4/sse-stream.html>
- <http://127.0.0.1:3000/examples/hx-v4/ws-chat.html>

## What each demo shows

### `hx-live-counter.html` — engine alone

The minimum `live` block. A counter mutates `$count`; a div with `_="live put $count into me"`
re-renders on every change. The engine records what the body read; a write to any of it re-runs
the body on the next microtask.

### `hx-live-multiple-deps.html` — engine alone

Same idea, two dependencies. The live body reads `$price` and `$quantity` and displays their
product. Either input change triggers a re-render, but writing an unrelated global does not (try
`hyperfixi.evaluate("set $other to 5")` in the console). htmx 4's own `hx-live` extension, by
contrast, holds a JavaScript expression and recomputes on every DOM mutation.

### `bind-to-property.html` — engine alone

Two-way `bind`. A color picker and a text input both carry `_="bind $color to me"` and stay in
sync through the shared `$color` global; a swatch's `live` block recomputes its `style`
attribute whenever `$color` changes.

### `sse-stream.html` — engine + htmx 4 + hx-sse

`hx-sse:connect="/fake-stream"` against an in-page mock of `fetch` that answers with a streaming
`text/event-stream` body (one unnamed `data: <div>…</div>` event every 800 ms). htmx swaps each
event's HTML into `hx-target` with `hx-swap="afterbegin"`. In production, point it at a real SSE
endpoint.

### `ws-chat.html` — engine + htmx 4 + hx-ws

`hx-ws:connect` / `hx-ws:send` against an in-page `WebSocket` mock. The form's fields are sent as
JSON; the mock echoes htmx 4's message shape (`{ target, swap, content }`), which htmx swaps
where the message says.

## Bundles

```html
<script src="../../packages/engine/dist/hyperfixi-hs.js"></script>
<!-- only the pages that make requests or stream: -->
<script src="../vendor/htmx-4.0.0/htmx.min.js"></script>
<script src="../vendor/htmx-4.0.0/ext/hx-sse.min.js"></script>
```

`hyperfixi-hx-v4.js`, which these pages used to load, is core's bundle and retires with core.

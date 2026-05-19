# hx-v4 server stubs

Tiny Node servers that let the `sse-stream.html` and `ws-chat.html` demos talk to a real backend instead of the in-page mocks. Useful when you want to feel the latency, observe the network panel, or copy/paste the patterns into a real app.

## Run

```bash
# SSE server (zero deps, uses node:http)
node examples/hx-v4/server/sse-server.mjs        # listens on :3001

# WS echo server (depends on `ws` — already in workspace devDeps)
node examples/hx-v4/server/ws-server.mjs         # listens on :3002
```

## Point demos at them

The default demos use in-page mocks. To switch to the real server, edit the `<div sse-connect="…">` / `<div ws-connect="…">` attributes (or the JS-level `EventSource` / `WebSocket` mock blocks) to point at the server URLs:

```html
<!-- sse-stream.html — replace the /fake-stream attribute -->
<div
  sse-connect="http://localhost:3001/stream"
  sse-swap="tick"
  hx-target="#feed"
  hx-swap="afterbegin"
></div>

<!-- ws-chat.html — replace the wss://example/echo attribute -->
<div ws-connect="ws://localhost:3002">…</div>
```

Then remove (or comment out) the in-page `MockEventSource` / `MockWebSocket` constructor overrides in the demo's `<script>` block so the native APIs are used.

## What they emit

- **SSE** (`/stream`):
  - `tick` event every `TICK_INTERVAL_MS` (default 1000ms) — `<li>tick #N @ <iso-timestamp></li>`
  - `note` event every 5 ticks — `<p>marker at tick N</p>`
- **WS** (`ws://localhost:3002`):
  - On connect: welcome envelope `{ target: '#messages', swap: 'beforeend', data: '<p><em>connected</em></p>' }`
  - On message: echoes the `msg` field back as an HTML-escaped paragraph in the same envelope shape

## Production notes

These are demo stubs, not production templates. Real servers should add:

- Proper auth and rate limiting on the connection accept path
- Per-client read/write timeouts (the `ws-server.mjs` only pings for liveness)
- Backpressure handling on bursty event streams (`res.write` returns `false` when the socket buffer is full)
- CORS scoped to your actual frontend origin (the SSE stub uses `*` for ease of local testing)

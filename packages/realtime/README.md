# @hyperfixi/realtime

Realtime features for [hyperfixi](https://github.com/codetalcott/hyperfixi) — adds the
`socket`, `eventsource`, and `worker` top-level features from upstream
\_hyperscript 0.9.93 (its official socket/worker/eventsource extensions).

## Syntax

```hyperscript
socket ChatSocket ws://localhost:8080
  on message put it into #chat
end

eventsource ChatStream from /events
  on message put it into #messages end
end

worker Calculator
  def add(a, b) return a + b end
end
```

- **socket** — named WebSocket. The `on message` body runs for every message
  with `it` bound to the parsed payload (JSON when possible, else the raw
  string; `as string` skips parsing). Reconnects with exponential backoff.
  `send hello to ChatSocket` transmits `"hello"`; `send msg(x: 1) to
ChatSocket` transmits `{"type":"msg","detail":{"x":1}}`.
- **eventsource** — named SSE source. One `on <event> … end` block per event
  name (`as json` to parse payloads), then a final `end` closes the feature.
- **worker** — named async function bundle: `Calculator.add(1, 2)` returns a
  Promise.

> **Worker v1 caveat:** the worker feature is an **async main-thread shim** —
> API-compatible with upstream's worker extension (every call returns a
> Promise), but the def bodies execute on the main thread with no isolation.
> Real Web Worker execution (AOT-compiled def bodies) is a planned follow-up;
> code written against the shim will keep working when it lands.

## Install

The full `hyperfixi.js` browser bundle installs this plugin automatically.
For custom runtimes:

```ts
import { createRuntime, installPlugin } from '@hyperfixi/core';
import { realtimePlugin } from '@hyperfixi/realtime';

const runtime = createRuntime();
installPlugin(runtime, realtimePlugin);
```

Tests and non-browser environments can inject transport constructors:

```ts
import { configureRealtime, realtime } from '@hyperfixi/realtime';

configureRealtime({ WebSocketCtor: FakeWebSocket, EventSourceCtor: FakeEventSource });
// …
realtime.closeAll(); // explicit teardown
```

When `WebSocket`/`EventSource` are unavailable (e.g. server-side rendering),
features install as inert connections with a console warning — they never
throw.

#!/usr/bin/env node
/**
 * Tiny SSE server for the hx-v4 sse-stream demo.
 *
 * Usage:  node examples/hx-v4/server/sse-server.mjs
 *         (then point examples/hx-v4/sse-stream.html at http://localhost:3001/stream)
 *
 * Endpoints:
 *   GET /stream  → text/event-stream, emits `tick` and `note` events
 *   GET /healthz → JSON liveness probe
 *
 * Zero dependencies — uses Node's built-in `http` module.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 3001);
const TICK_INTERVAL_MS = Number(process.env.TICK_INTERVAL_MS ?? 1000);

const server = createServer((req, res) => {
  // Permissive CORS so a page served from http://localhost:3000 can read
  // the stream during local development.
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url !== '/stream') {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found — try GET /stream');
    return;
  }

  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    // Disable proxy buffering — important if you put this behind nginx.
    'x-accel-buffering': 'no',
  });
  res.write(': sse stream open\n\n');

  let n = 0;
  const interval = setInterval(() => {
    n++;
    // Emit named `tick` events that match the sse-stream.html demo's
    // sse-swap="tick" attribute. Each event is a small HTML fragment so
    // the default innerHTML swap renders cleanly.
    res.write(`event: tick\ndata: <li>tick #${n} @ ${new Date().toISOString()}</li>\n\n`);
    // Throw a `note` every 5 ticks to show multi-event routing.
    if (n % 5 === 0) {
      res.write(`event: note\ndata: <p>marker at tick ${n}</p>\n\n`);
    }
  }, TICK_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(interval);
  });
});

server.listen(PORT, () => {
  console.log(`SSE server listening on http://localhost:${PORT}`);
  console.log(`  Stream:  GET /stream  (tick every ${TICK_INTERVAL_MS}ms)`);
  console.log(`  Health:  GET /healthz`);
});

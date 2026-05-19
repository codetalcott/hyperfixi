#!/usr/bin/env node
/**
 * Tiny WebSocket echo server for the hx-v4 ws-chat demo.
 *
 * Usage:  node examples/hx-v4/server/ws-server.mjs
 *         (then point examples/hx-v4/ws-chat.html at ws://localhost:3002)
 *
 * Behavior:
 *   - Echoes any incoming message back as a JSON envelope:
 *       { target: '#messages', swap: 'beforeend', data: '<p>echo: …</p>' }
 *     so the page's ws-connect element routes it through the same
 *     hx-target/hx-swap machinery as an SSE event.
 *   - Pings every 25s to keep idle connections warm through proxies.
 *
 * Requires the `ws` package. The hyperfixi workspace already lists it as a
 * transitive devDep (developer-tools, vscode-extension). If you're running
 * this outside the workspace: `npm install ws`.
 */
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 3002);

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', socket => {
  console.log(`[ws] client connected (${wss.clients.size} total)`);

  // Welcome envelope — exercises the target/swap envelope shape on
  // connect without requiring the client to send anything first.
  socket.send(
    JSON.stringify({
      target: '#messages',
      swap: 'beforeend',
      data: '<p><em>connected to server</em></p>',
    })
  );

  socket.on('message', raw => {
    // The page sends payloads as JSON objects (the ws-send serializer
    // emits `{ msg: '...' }` from the form's name/value pairs). Treat
    // non-JSON inputs as plain text for resilience.
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      payload = { msg: raw.toString() };
    }
    const text = String(payload.msg ?? '(no msg)');
    // Escape angle brackets so user input doesn't inject HTML — the
    // demo's swap target uses innerHTML by default.
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    socket.send(
      JSON.stringify({
        target: '#messages',
        swap: 'beforeend',
        data: `<p>echo: ${escaped}</p>`,
      })
    );
  });

  socket.on('close', () => {
    console.log(`[ws] client disconnected (${wss.clients.size} remaining)`);
  });
});

// Keepalive ping — helps when running through a proxy that closes idle
// connections (nginx, Cloudflare). Real production servers should also
// implement read-timeout detection; this is just the demo.
const keepalive = setInterval(() => {
  for (const c of wss.clients) if (c.readyState === 1) c.ping();
}, 25_000);
wss.on('close', () => clearInterval(keepalive));

console.log(`WS echo server listening on ws://localhost:${PORT}`);

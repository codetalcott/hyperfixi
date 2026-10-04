# htmx Compatibility

Use the real htmx library beside the engine. Hyperscript's `_` attributes run on
`@hyperfixi/engine`, and htmx 4 (or fixi) handles the `hx-*` attributes:

```html
<script src="https://unpkg.com/@hyperfixi/engine/dist/hyperfixi-hs.js"></script>
<script src="https://unpkg.com/htmx.org@4/dist/htmx.min.js"></script>

<button hx-get="/api/users" hx-target="#users-list" hx-swap="innerHTML">Load Users</button>
<div id="users-list"></div>
```

With the Vite plugin, set `htmx: true` so the engine also processes content htmx swaps in.

## `hx-*` attributes in other languages

[`@lokascript/htmx-adapter`](https://www.npmjs.com/package/@lokascript/htmx-adapter) lets you write
`hx-*` / `sse-*` / `ws-*` attribute names in 24 languages against stock htmx. It copies each
localized attribute to its canonical name before htmx processes the element; the attribute you
wrote stays in the DOM.

```html
<script src="https://unpkg.com/@lokascript/htmx-adapter/dist/htmx-i18n.global.js"></script>
<script src="https://unpkg.com/@lokascript/htmx-adapter/vocab/es.js"></script>
<script src="https://unpkg.com/htmx.org@4/dist/htmx.min.js"></script>

<section lang="es">
  <button hx-obtener="/api/usuarios" hx-objetivo="#out" hx-disparador="clic">Cargar</button>
</section>
```

Load the adapter first, then one vocab module per language on the page, then htmx. See the
adapter's README for `hx-on:` bodies written in hyperscript.

## Before 4.0

`@hyperfixi/core` 3.x shipped `hyperfixi-hx.js`, which reimplemented the htmx attributes on
hyperfixi's own runtime (and `hyperfixi-hx-v4.js` for `hx-live`, SSE and WebSockets). Both
retired in the 4.0 cycle: `hx-live` is the engine's `live` block, and SSE and WebSockets are
htmx 4's. Pages pinned to a 3.x release keep working.

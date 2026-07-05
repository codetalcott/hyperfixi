# Browser Bundles — full reference

> Relocated from the root CLAUDE.md (which keeps only the decision tree and
> summary table). This is the complete reference for bundle selection, the
> htmx-compat layer (hx-live / SSE / WebSocket / localized attributes), the
> lifecycle events, and the custom bundle generator.

## Choosing your bundle

Decision tree for the most common cases:

1. **Using `@hyperfixi/vite-plugin`?** Don't pick a bundle by hand — the plugin scans your project and emits the right one (minimal handcrafted when possible, falls back to `hx-v4` when it spots htmx v4 features). See [vite plugin README](../packages/vite-plugin/README.md).
2. **Need `hx-live`, `bind`, `when`, SSE, or WebSocket?** Use `hyperfixi-hx-v4.js` (~257 KB gz). Single script tag, everything auto-installed. The size cost buys correctness — the slim runtime can't satisfy these features (its `set` doesn't fire `notifyGlobalWrite`, the slim parser doesn't know reactive features, and SSE/WS modules aren't wired).
3. **Need only htmx v1/v2 attributes (`hx-get`/`hx-post`/etc.)?** Use `hyperfixi-hx.js` (~13 KB gz). Includes htmx-compat + the slim hybrid runtime for `_=` attributes. No reactivity, no streaming.
4. **Pure hyperscript (`_=` attributes), ~85% feature coverage, smallest realistic size?** Use `hyperfixi-hybrid-complete.js` (~7.3 KB gz). Full AST parser, expressions, event modifiers, block commands (`if`, `for`, `repeat`, `while`, `fetch`).
5. **Tiny static page (toggle / show / hide / put / set)?** Use `hyperfixi-lite.js` (~1.9 KB gz). Regex parser, 8 commands. Drops to `hyperfixi-lite-plus.js` (~2.6 KB gz) if you need a few more commands + i18n aliases.
6. **Authoring in multiple languages (Japanese, Korean, Arabic, etc.) or need the full semantic parser at runtime?** Use `hyperfixi.js` (full bundle, ~203 KB gz) or `hyperfixi-multilingual.js` (~64 KB, parser-free i18n via the semantic bundle loaded separately).

Rule of thumb: start as small as you can; upgrade when you hit a missing feature. The vite plugin removes this decision entirely for projects that use it.

## Core Bundles

| Bundle                                               | Global                  | Size (gzip) | Use Case                             |
| ---------------------------------------------------- | ----------------------- | ----------- | ------------------------------------ |
| `packages/core/dist/hyperfixi.js`                    | `window.hyperfixi`      | 203.5 KB    | Full bundle with parser              |
| `packages/behaviors/dist/resolver.browser.global.js` | `HyperFixiBehaviors`    | 3.8 KB      | Lazy behavior resolver (8 behaviors) |
| `packages/core/dist/hyperfixi-multilingual.js`       | `window.hyperfixi`      | 64.3 KB     | Multilingual (no parser)             |
| `packages/i18n/dist/lokascript-i18n.min.js`          | `window.LokaScriptI18n` | 35.0 KB     | Grammar transformation               |

> **Note**: As of v2.0.0, the primary bundles are `hyperfixi-*.js`. Backward-compatible aliases (`lokascript-*.js`) are provided but will be removed in v3.0.0. See [MIGRATION.md](../MIGRATION.md).

## Lite Bundles (Size-Optimized)

For projects prioritizing bundle size over features:

| Bundle                         | Size (gzip) | Commands  | Features                                                      |
| ------------------------------ | ----------- | --------- | ------------------------------------------------------------- |
| `hyperfixi-lite.js`            | 1.9 KB      | 8         | Regex parser, basic commands                                  |
| `hyperfixi-lite-plus.js`       | 2.6 KB      | 14        | Regex parser, more commands, i18n aliases                     |
| `hyperfixi-hybrid-complete.js` | 7.3 KB      | 21+blocks | Full AST parser, expressions, event modifiers                 |
| `hyperfixi-hx.js`              | 9.7 KB      | 21+blocks | hybrid-complete + htmx/fixi attribute support                 |
| `hyperfixi-hx-v4.js`           | ~257 KB     | 40+blocks | Full runtime + htmx-compat + reactivity (hx-live, bind, when) |

**Hybrid Complete** (~85% hyperscript coverage) is recommended - it supports:

- Full expression parser with operator precedence
- Block commands: `repeat N times`, `for each`, `if/else/else if`, `unless`, `fetch`, `while`, `async`
- Event modifiers: `.once`, `.prevent`, `.stop`, `.debounce(N)`, `.throttle(N)`
- Positional expressions: `first`, `last`, `next`, `previous`, `closest`, `parent`
- Function calls and method chaining: `str.toUpperCase()`, `arr.join('-')`
- HTML selectors: `<button.class#id/>`
- i18n keyword aliases

```html
<!-- Example: Hybrid Complete with expressions and blocks -->
<button
  _="on click
  set :total to #price's textContent then
  set :tax to :total * 0.1 then
  put :total + :tax into #grand-total"
>
  Calculate Total
</button>

<button
  _="on click.debounce(300)
  if me has .loading
    return
  end then
  add .loading then
  fetch /api/data as json then
  for each item in result
    append item.name to #results
  end then
  remove .loading"
>
  Load Data
</button>
```

**Hybrid-HX** adds htmx and fixi attribute compatibility for declarative AJAX:

```html
<!-- htmx-style attributes (hybrid-hx bundle) -->
<button hx-get="/api/users" hx-target="#users-list" hx-swap="innerHTML">Load Users</button>

<!-- fixi-style attributes (also supported) -->
<button fx-action="/api/users" fx-target="#users-list" fx-swap="innerHTML">Load Users</button>

<!-- hx-on:* for inline hyperscript -->
<button hx-on:click="toggle .active on me">Toggle</button>
```

Fixi features include request dropping (anti-double-submit), `fx-ignore` attribute, and a rich event lifecycle (`fx:init`, `fx:config`, `fx:before`, `fx:after`, `fx:error`, `fx:finally`, `fx:swapped`).

## `hx-live` reactive expressions (htmx v4)

When `@hyperfixi/reactivity` is installed, the htmx-compat layer recognizes the htmx v4 `hx-live` attribute and translates it to a `live ... end` block. The body is hyperscript syntax (not JavaScript like upstream htmx v4) — it gets fine-grained dependency tracking and inherits hyperscript's multilingual support:

```html
<div hx-live="put $count into me"></div>
```

The expression re-runs only when its tracked dependencies actually change (not on every DOM mutation, which is the upstream htmx v4 approach). If reactivity isn't installed, the element is skipped with a clear console error pointing to the install command.

**Easiest path: use the `hyperfixi-hx-v4.js` bundle.** It ships the full runtime + `@hyperfixi/reactivity` auto-installed + the htmx-compat layer in a single script tag. Larger than `hyperfixi-hx.js` (~257 KB vs 13 KB gzipped) but no manual plugin wiring required. For size-tuned production builds, use `@hyperfixi/vite-plugin` instead.

```html
<script src="hyperfixi-hx-v4.js"></script>
<div hx-live="put $count into me"></div>
<button _="on click set $count to ($count or 0) + 1">+1</button>
```

See the working demos in [`examples/hx-v4/`](../examples/hx-v4/).

## `sse-connect` / `sse-swap` (htmx v4)

The htmx-compat processor recognizes `sse-connect="<url>"` to open a long-lived `EventSource` against the URL, and `sse-swap="<event-name>[, <event-name>...]"` to route named events through the existing `hx-target` / `hx-swap` machinery.

```html
<!-- Stream incoming `tick` events into #notifications -->
<div sse-connect="/events" sse-swap="tick" hx-target="#notifications" hx-swap="beforeend"></div>

<!-- One connection, multiple named events -->
<div
  sse-connect="/feed"
  sse-swap="post, like, comment"
  hx-target="#timeline"
  hx-swap="afterbegin"
></div>
```

The connection auto-reconnects on transient errors with exponential backoff (1s → 2s → 4s …, capped at 30s, 5 retries before giving up). On element removal from the DOM, the connection is closed automatically via MutationObserver — no leaks. Custom lifecycle events fire on the element: `htmx:sseOpen`, `htmx:sseMessage`, `htmx:sseError`, `htmx:sseClose`.

The `hyperfixi-hx-v4.js` bundle bundles this support; the slim `hyperfixi-hx.js` doesn't ship the SSE module (size budget).

## `ws-connect` / `ws-send` (htmx v4)

WebSocket support follows the same shape as SSE but is bidirectional. `ws-connect="<url>"` on an element opens a per-element WebSocket; `ws-send` on a descendant form or button forwards a JSON-serialized payload over the socket on submit/click.

```html
<div ws-connect="wss://example/api">
  <form ws-send>
    <input name="msg" />
    <button type="submit">Send</button>
  </form>
</div>
```

Incoming messages are routed two ways:

- **JSON envelope** `{ target, swap?, data }` → applies through the existing `hx-target`/`hx-swap` machinery, letting the server drive surgical updates without the client knowing the layout up front.
- **Anything else** → dispatched as `htmx:wsMessage` with the raw text; consumers can subscribe and route however they like.

Reconnect on unclean close uses the same bounded exponential backoff as SSE (1s → 2s → 4s … capped at 30s, 5 retries). Outbound sends queue while the socket is connecting and flush on `htmx:wsOpen`. Lifecycle events: `htmx:wsOpen`, `htmx:wsMessage`, `htmx:wsError`, `htmx:wsClose`.

> **When to use SSE vs WS:** prefer SSE for server-push streams (notifications, telemetry, live feeds) — it's HTTP-native, plays nice with proxies and HTTP/2, and the browser handles reconnect. Reach for WebSockets when you genuinely need a low-latency bidirectional channel (chat, collaborative editing, control planes). SSE is the documented default for that reason.

The `hyperfixi-hx-v4.js` bundle bundles this support; the slim `hyperfixi-hx.js` doesn't.

## Localized htmx attribute names (Phase 8)

The htmx-compat layer in `hyperfixi-hx-v4.js` recognizes localized attribute names per-element based on the nearest `lang=` ancestor. Spanish authors can write `hx-obtener` / `hx-objetivo` / `sse-conectar`; Japanese authors `hx-取得` / `hx-ターゲット`; Arabic `hx-احصل` / `hx-هدف`. The orchestrator translates them to canonical English (`hx-get` / `hx-target` / `sse-connect`) before they hit the existing processor paths.

```html
<script src="hyperfixi-hx-v4.js"></script>
<!-- Opt in to languages by loading their vocab modules. -->
<script src="packages/core/vocab/htmx/es.js"></script>
<script src="packages/core/vocab/htmx/ja.js"></script>

<section lang="es">
  <button hx-obtener="/api/usuarios" hx-objetivo="#out">Cargar</button>
</section>
<section lang="ja">
  <button hx-取得="/api/ユーザー" hx-ターゲット="#out">読み込む</button>
</section>
```

**Resolution order** for `langOf(element)`:

1. `data-hyperfixi-lang` on the element itself
2. `data-hyperfixi-lang` on any ancestor
3. `lang=` on any ancestor (HTML standard)
4. `'en'` fallback

Regional variants collapse to base codes (`es-MX` → `es`). Elements outside any lang scope use English literals — same behavior as before Phase 8. Missing-vocab langs log a one-time console warning per language and fall back to English.

**Bundled vocab modules** (`packages/core/vocab/htmx/`) cover 8 priority languages — en, es, fr, ja, zh, ar, ko, de. Each is a self-registering `<script>` tag (loka-js convention). To add another language: edit the keyword translations in `packages/semantic/src/generators/profiles/{lang}.ts` and run `npm run generate:htmx-vocab --prefix packages/core`.

**The `hx-` / `sse-` / `ws-` prefixes are preserved across languages** — only the suffix is localized. Spanish writes `hx-obtener`, not `xx-obtener`. The brand prefix doubles as a discovery anchor.

**Out of scope** for this arc: localizing the `_=` hyperscript attribute itself. The vocab orchestrator translates htmx-compat attribute names only.

See the live demos in [`examples/hx-v4-i18n/`](../examples/hx-v4-i18n/).

## htmx Lifecycle Events

The htmx compatibility layer dispatches CustomEvents at key points in the request lifecycle:

| Event                | When                                                | Cancelable | Detail                     |
| -------------------- | --------------------------------------------------- | ---------- | -------------------------- |
| `htmx:configuring`   | After attributes collected, before translation      | Yes        | `{ config, element }`      |
| `htmx:beforeRequest` | Before hyperscript execution                        | Yes        | `{ element, url, method }` |
| `htmx:afterSettle`   | After successful execution                          | No         | `{ element, target }`      |
| `htmx:error`         | On execution failure                                | No         | `{ element, error }`       |
| `htmx:sseOpen`       | SSE connection opens                                | No         | `{ url }`                  |
| `htmx:sseMessage`    | SSE message received (any event)                    | No         | `{ url, event?, data }`    |
| `htmx:sseError`      | SSE error / connection lost                         | No         | `{ url, error or event }`  |
| `htmx:sseClose`      | SSE connection closed (manual or after retry limit) | No         | `{ url }`                  |
| `htmx:wsOpen`        | WS connection opens                                 | No         | `{ url }`                  |
| `htmx:wsMessage`     | WS message received (raw or envelope)               | No         | `{ url, envelope?, data }` |
| `htmx:wsError`       | WS error                                            | No         | `{ url, error or event }`  |
| `htmx:wsClose`       | WS connection closed                                | No         | `{ url, code, reason }`    |

**Example usage:**

```javascript
// Intercept and modify config before processing
document.addEventListener('htmx:configuring', e => {
  e.detail.config.headers = { 'X-Custom': 'value' };
});

// Cancel request based on condition
document.addEventListener('htmx:beforeRequest', e => {
  if (someCondition) {
    e.preventDefault(); // Cancels execution
  }
});

// React to successful completion
document.addEventListener('htmx:afterSettle', e => {
  console.log('Request completed for:', e.detail.url);
});

// Handle errors
document.addEventListener('htmx:error', e => {
  showErrorNotification(e.detail.error.message);
});
```

## Custom Bundle Generator

Generate minimal bundles with only the commands you need:

```bash
cd packages/core

# Generate from config file
npm run generate:bundle -- --config bundle-configs/textshelf.config.json

# Generate from command line with blocks and positional expressions
npm run generate:bundle -- --commands toggle,add,set --blocks if,repeat --positional --output src/my-bundle.ts
```

See [bundle-configs/README.md](../packages/core/bundle-configs/README.md) for full documentation.

## Semantic Bundles (Regional Options)

| Bundle                                    | Global                        | Size (gzip) | Languages          |
| ----------------------------------------- | ----------------------------- | ----------- | ------------------ |
| `browser.global.js`                       | `LokaScriptSemantic`          | 90 KB       | All 24             |
| `browser-priority.priority.global.js`     | `LokaScriptSemanticPriority`  | 48 KB       | 11 priority        |
| `browser-western.western.global.js`       | `LokaScriptSemanticWestern`   | 30 KB       | en, es, pt, fr, de |
| `browser-east-asian.east-asian.global.js` | `LokaScriptSemanticEastAsian` | 24 KB       | ja, zh, ko         |
| `browser-es-en.es-en.global.js`           | `LokaScriptSemanticEsEn`      | 25 KB       | en, es             |
| `browser-en.en.global.js`                 | `LokaScriptSemanticEn`        | 20 KB       | en only            |
| `browser-es.es.global.js`                 | `LokaScriptSemanticEs`        | 16 KB       | es only            |

Choose the smallest bundle that covers your target languages. See `packages/semantic/README.md` for details.

## Multilingual Bundle (Recommended for i18n)

For developers writing hyperscript in their native language:

```html
<!-- Load both bundles -->
<script src="lokascript-semantic.browser.global.js"></script>
<script src="hyperfixi-multilingual.js"></script>
<script>
  // Execute in any of 24 supported languages
  await hyperfixi.execute('토글 .active', 'ko');      // Korean
  await hyperfixi.execute('トグル .active', 'ja');    // Japanese
  await hyperfixi.execute('alternar .active', 'es');  // Spanish

  // Translate between languages
  const korean = await hyperfixi.translate('toggle .active', 'en', 'ko');
</script>
```

**Total size:** ~511 KB (250 KB + 261 KB) vs 924 KB with full bundle

## Full Bundle Usage

```html
<script src="hyperfixi.js"></script>
<script src="lokascript-i18n.min.js"></script>
<script src="lokascript-semantic.browser.global.js"></script>
<script>
  // Grammar transformation (i18n)
  const result = LokaScriptI18n.translate('on click toggle .active', 'en', 'ja');

  // Semantic parsing (24 languages)
  const parsed = LokaScriptSemantic.parse('トグル .active', 'ja');
  const translations = LokaScriptSemantic.getAllTranslations('toggle .active', 'en');
</script>
```

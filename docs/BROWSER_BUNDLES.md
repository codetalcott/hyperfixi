# Browser Bundles — full reference

> Relocated from the root CLAUDE.md (which keeps only the decision tree and
> summary table). This is the complete reference for bundle selection, the
> htmx-compat layer (hx-live / SSE / WebSocket / localized attributes), the
> lifecycle events, and the custom bundle generator.

## Choosing your bundle

**The engine (2026-10-03).** `@hyperfixi/engine` replaces core's engine (the migration plan is
`~/.claude/plans/engine-replaces-core.md`; every tracked gallery page runs on it). Its script-tag
bundle is **`hyperfixi-hs.js`** (34.1 KB gzipped): hyperscript and nothing else, every module,
upstream-faithful, with upstream's reactive features (`live`, `when`, `bind`) built in. For
hypermedia attributes it pairs with an upstream library instead of reimplementing one:

| Stack                                                              | Gzipped | For                                                                                                   |
| ------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------- |
| `hyperfixi-hs.js`                                                  | ~34 KB  | Hyperscript, including reactive blocks (`_="live put $count into me"`)                                |
| `hyperfixi-hs.js` + [fixi](https://github.com/bigskysoftware/fixi) | ~35 KB  | The minimal hypermedia stack: fixi's `fx-action` / `fx-target` / `fx-swap` beside hyperscript         |
| `hyperfixi-hs.js` + htmx 4 (+ `@lokascript/htmx-adapter`)          | ~50 KB  | The full one: htmx's attributes, `hx-sse` / `hx-ws` extensions; the adapter localizes attribute names |

Hyperscript handles behavior, the hypermedia library handles requests and streams, and neither
reimplements the other. `examples/hx-v4/` and `examples/hx-v4-i18n/` are the second and third
stacks running (htmx 4 is vendored for them under `examples/vendor/`). Localized attribute names
on real htmx are the adapter's job ([packages/htmx-adapter](../packages/htmx-adapter/README.md));
on fixi, loka-js's.

**Core's bundles** (`hyperfixi.js`, `hyperfixi-hx.js`, `hyperfixi-hx-v4.js`,
`hyperfixi-multilingual.js`) are still built and published until the cutover; the rest of this
document describes them. The embedded htmx layer they carry (`hx-live` with a hyperscript body,
`sse-connect`, `ws-connect`, fixi's `fx-*`, localized names) was retired by owner decision on
2026-10-03 and goes with core: it reimplemented htmx on core's runtime, and what it offered that
users touched survives on upstream code (the engine's `live` blocks, the htmx adapter, loka-js).

**Using Vite?** Add `@hyperfixi/vite-plugin` and stop reading: it scans your
project and emits a bundle on `@hyperfixi/engine` that registers only the grammar
modules your hyperscript uses (17.9 KB gzipped for three commands, 34.4 KB for
everything; one grammar, upstream's). Non-English scripts are translated as the
engine reads them. See the [vite plugin README](../packages/vite-plugin/README.md).
(Since 2026-10-03, Phase C1 of the cutover plan; it no longer embeds core's parsers
or falls back to core's bundles.)

**Script tag, on core?** Two prebuilt names:

| Bundle            | Size (gzip) | What it is                                                                                          |
| ----------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `hyperfixi-hx.js` | ~22.0 KB    | The small one. Hybrid AST parser, blocks, expressions, event modifiers, plus htmx v1/v2 attributes. |
| `hyperfixi.js`    | ~352 KB     | Everything. Full parser, reactivity and realtime plugins, 24 languages, `window.hyperfixi`.         |

Start with `hyperfixi-hx.js`. A command it does not ship fails **loudly** —
the console names the command and `hyperfixi.js` — so the upgrade moment is
the first time it is needed, not a table read in advance.

Two further bundles are separate products, not sizes of the same thing:

| Bundle                      | Size (gzip) | Product                                                                                                                       |
| --------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `hyperfixi-hx-v4.js`        | ~363 KB     | htmx v4 on the full runtime: `hx-live`, `bind`, `when`, SSE and WebSocket, auto-installed. The Vite plugin selects it itself. |
| `hyperfixi-multilingual.js` | ~93 KB      | Parser-free multilingual runtime; pair with the all-24 `@lokascript/semantic` browser bundle (below).                         |

> **Retired in the 4.0 cycle:** `hyperfixi-lite.js`, `hyperfixi-lite-plus.js`,
> `hyperfixi-minimal.js` and `hyperfixi-standard.js` are no longer built or
> exported. The regex "lite" tier lived on inside the Vite plugin's generated
> bundles until Phase C1 (2026-10-03), when the plugin moved to engine modules;
> `minimal`/`standard` were the full parser with a hand-picked command subset.
> `hyperfixi-hybrid-complete.js` is still built and exported as
> `@hyperfixi/core/browser/hybrid-complete` until the cutover retires it — nothing
> in this repo imports it any more; treat it as retired-but-shipping.

## What `hyperfixi-hx.js` runs

The hybrid parser covers ~85% of everyday hyperscript:

- Full expression parser with operator precedence
- Block commands: `repeat N times`, `for each`, `if/else/else if`, `unless`, `fetch`, `while`
- Event modifiers: `.once`, `.prevent`, `.stop`, `.debounce(N)`, `.throttle(N)`
- Positional expressions: `first`, `last`, `next`, `previous`, `closest`, `parent`
- Function calls and method chaining: `str.toUpperCase()`, `arr.join('-')`
- HTML selectors: `<button.class#id/>`
- i18n keyword aliases

What it does not run, it refuses at parse time with a message that names the
remedy: `on click … catch e … end` / `finally`, `repeat forever` / `until` /
`while` (its `repeat` takes a count), and any command outside its set —
`'make' needs the full parser (use hyperfixi.js)`. A refused attribute is
inert; nothing runs on the wrong path. Use `hyperfixi.js` for handler-level
error handling.

```html
<!-- Expressions and blocks -->
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

It also carries htmx and fixi attribute compatibility for declarative AJAX:

```html
<!-- htmx-style attributes -->
<button hx-get="/api/users" hx-target="#users-list" hx-swap="innerHTML">Load Users</button>

<!-- fixi-style attributes (also supported) -->
<button fx-action="/api/users" fx-target="#users-list" fx-swap="innerHTML">Load Users</button>

<!-- hx-on:* for inline hyperscript -->
<button hx-on:click="toggle .active on me">Toggle</button>
```

Fixi features include request dropping (anti-double-submit), `fx-ignore` attribute, and a rich event lifecycle (`fx:init`, `fx:config`, `fx:before`, `fx:after`, `fx:error`, `fx:finally`, `fx:swapped`).

## Companion bundles

| Bundle                                               | Global                  | Size (gzip) | Use Case                                                                          |
| ---------------------------------------------------- | ----------------------- | ----------- | --------------------------------------------------------------------------------- |
| `packages/behaviors/dist/resolver.browser.global.js` | `HyperFixiBehaviors`    | 5.7 KB      | The 11 standard behaviors, defined on `hyperfixi-hs.js` (or upstream) as it loads |
| `packages/i18n/dist/lokascript-i18n.min.js`          | `window.LokaScriptI18n` | 38.5 KB     | Per-language vocabulary and profiles                                              |

> **Note**: As of v2.0.0, the primary bundles are `hyperfixi-*.js`. Deprecated `lokascript-*.js` copies of some of them (`lokascript-browser.js`, `lokascript-hybrid-hx.js`, `lokascript-multilingual.js`, …) are still emitted by `build:browser` (`packages/core/scripts/create-bundle-aliases.mjs`); they were slated for removal in v3.0.0 but still ship in 3.x. Use the `hyperfixi-*.js` names. See [MIGRATION.md](../MIGRATION.md).

## Core-era htmx-compat layer (retired 2026-10-03; ships until the cutover)

The sections below describe core's embedded layer. On the engine, a reactive block is
`_="live … end"`, and SSE / WebSocket / localized names are real htmx 4 with its extensions and
the htmx adapter (see "Choosing your bundle").

### `hx-live` reactive expressions (htmx v4)

When `@hyperfixi/reactivity` is installed, the htmx-compat layer recognizes the htmx v4 `hx-live` attribute and translates it to a `live ... end` block. The body is hyperscript syntax (not JavaScript like upstream htmx v4) — it gets fine-grained dependency tracking and inherits hyperscript's multilingual support:

```html
<div hx-live="put $count into me"></div>
```

The expression re-runs only when its tracked dependencies actually change (not on every DOM mutation, which is the upstream htmx v4 approach). If reactivity isn't installed, the element is skipped with a clear console error pointing to the install command.

**Easiest path: use the `hyperfixi-hx-v4.js` bundle.** It ships the full runtime + `@hyperfixi/reactivity` auto-installed + the htmx-compat layer in a single script tag. Larger than `hyperfixi-hx.js` (~363 KB vs 22.0 KB gzipped) but no manual plugin wiring required. For size-tuned production builds, use `@hyperfixi/vite-plugin` instead.

```html
<script src="hyperfixi-hx-v4.js"></script>
<div hx-live="put $count into me"></div>
<button _="on click set $count to ($count or 0) + 1">+1</button>
```

The pages in [`examples/hx-v4/`](../examples/hx-v4/) now show the same thing as the engine's `live` blocks.

### `sse-connect` / `sse-swap` (htmx v4)

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

### `ws-connect` / `ws-send` (htmx v4)

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

### Localized htmx attribute names (Phase 8)

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

**Bundled vocab modules** (`packages/core/vocab/htmx/`) cover all 24 languages. Each is a self-registering `<script>` tag (loka-js convention). Attribute names that are hyperscript keywords (`get`, `swap`, `trigger`, …) come from `packages/semantic/src/generators/profiles/{lang}.ts`; htmx-only names (`post`, `delete`, `confirm`, `boost`, `push-url`, `indicator`, `include`, `vals`, `select`, `swap-oob`, `sync`) and the `search` trigger head are authored in `packages/core/scripts/htmx-attr-vocab.mjs` — for all 23 non-English languages, which cover every attribute the _Hypermedia Systems_ Contact.app uses and every attribute the book's code listings use (except `hx-ext`, which htmx 4 removed). A vocab may list several names for one attribute: the first is the form to teach, later ones are aliases that keep already-authored pages working (`hx-トリガー` leads, `hx-引き金` still resolves). Edit either source and run `npm run generate:htmx-vocab --prefix packages/core`. An attribute with no localized name is written in its canonical English form.

**The `hx-` / `sse-` / `ws-` prefixes are preserved across languages** — only the suffix is localized. Spanish writes `hx-obtener`, not `xx-obtener`. The brand prefix doubles as a discovery anchor.

**Out of scope** for this arc: localizing the `_=` hyperscript attribute itself. The vocab orchestrator translates htmx-compat attribute names only.

The pages in [`examples/hx-v4-i18n/`](../examples/hx-v4-i18n/) now show the same thing on real htmx 4 through `@lokascript/htmx-adapter`.

### htmx Lifecycle Events

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

Files live in `@lokascript/semantic/dist/`; each is also exported as `@lokascript/semantic/browser` (all 24) or `@lokascript/semantic/browser/<name>` (e.g. `/browser/priority`, `/browser/es`). Sizes are gzipped, measured locally on 2026-09-30 (`gzip -9`, macOS; CI's Linux zlib reads slightly higher).

| Bundle                                    | Global                        | Size (gzip) | Languages                                      |
| ----------------------------------------- | ----------------------------- | ----------- | ---------------------------------------------- |
| `browser.global.js`                       | `LokaScriptSemantic`          | ~260 KB     | All 24                                         |
| `browser-priority.priority.global.js`     | `LokaScriptSemanticPriority`  | ~151 KB     | 11: en, es, pt, fr, de, ja, zh, ko, ar, tr, id |
| `browser-western.western.global.js`       | `LokaScriptSemanticWestern`   | ~128 KB     | en, es, pt, fr, de, it                         |
| `browser-east-asian.east-asian.global.js` | `LokaScriptSemanticEastAsian` | ~106 KB     | ja, zh, ko                                     |
| `browser-es-en.es-en.global.js`           | `LokaScriptSemanticEsEn`      | ~116 KB     | en, es                                         |
| `browser-en.en.global.js`                 | `LokaScriptSemanticEn`        | ~111 KB     | en only                                        |
| `browser-es.es.global.js`                 | `LokaScriptSemanticEs`        | ~96 KB      | es only                                        |

Every other language except Hebrew has its own `browser-<code>.<code>.global.js` (~94–98 KB). Most of each bundle is the shared parser (`browser-core.core.global.js`, which registers no language, is ~90 KB), so a language costs only a few KB on top.

Choose the smallest bundle that covers your target languages. See `packages/semantic/README.md` for details.

## Multilingual Bundle (Recommended for i18n)

For developers writing hyperscript in their native language:

```html
<!-- Load both bundles -->
<script src="node_modules/@lokascript/semantic/dist/browser.global.js"></script>
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

`hyperfixi-multilingual.js` looks up the `LokaScriptSemantic` global, which only the all-24 `browser.global.js` defines; the regional and single-language bundles use other globals (`LokaScriptSemanticEs`, …).

**Total size:** ~353 KB gz (93 KB multilingual + ~260 KB all-24 semantic) vs ~352 KB gz full bundle

## Full Bundle Usage

```html
<script src="hyperfixi.js"></script>
<script src="node_modules/@lokascript/semantic/dist/browser.global.js"></script>
<script>
  // Translation (semantic; i18n's translator was retired 2026-08-28)
  const result = LokaScriptSemantic.translate('toggle .active', 'en', 'ja');

  // Semantic parsing (24 languages)
  const parsed = LokaScriptSemantic.parse('トグル .active', 'ja');
  const translations = LokaScriptSemantic.getAllTranslations('toggle .active', 'en');
</script>
```

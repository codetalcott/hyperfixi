# @hyperfixi/intent-element

The `<lse-intent>` custom element for [hyperfixi](https://github.com/codetalcott/hyperfixi) — a declarative way to run **LSE protocol JSON** (LokaScript Explicit Syntax) from HTML. The element validates the JSON against the LSE schema, renders it to English hyperscript, and runs that on the page's hyperscript host.

## Install

```bash
npm install @hyperfixi/intent-element
```

Every peer dependency is optional: validation works with none of them. Executing an intent needs a **hyperscript host** and a **renderer**:

- the host is `@hyperfixi/engine`'s `hyperfixi-hs.js` (`window.hyperfixi`) or upstream `_hyperscript` — anything with `evaluate(source, context)`;
- the renderer is `@lokascript/semantic`'s `render(node, 'en')`, taken from whichever `LokaScriptSemantic*` browser bundle the page loads (`browser-en.en.global.js` is the English-only one), or set on `LSEIntentElement.render`.

The intent is rendered to English (`toggle .active on #sidebar`) and evaluated with the element as `me` — the same text path as the `lse_to_hyperscript` tool. Without a renderer the element validates but does not execute, and reports `NO_RENDERER`. (`@hyperfixi/core` 3.x's `window.hyperfixi.evalLSENode` fallback is gone: `hyperfixi.js` is the engine's file, which has no such method.)

## Usage

The browser build auto-registers `<lse-intent>`:

```html
<script src="hyperfixi-hs.js"></script>
<script src="browser-en.en.global.js"></script>
<script src="intent-element.iife.global.js"></script>

<!-- Inline LSE JSON -->
<lse-intent trigger="click">
  <script type="application/lse+json">
    {
      "action": "toggle",
      "roles": { "patient": { "type": "selector", "value": ".active" } }
    }
  </script>
  <button>Toggle</button>
</lse-intent>

<!-- …or fetch the intent from a URL -->
<lse-intent src="/intents/toggle.json"></lse-intent>
```

The intent is read from a child `<script type="application/lse+json">` or fetched via the `src` attribute. The optional `trigger` attribute names the DOM event that runs the intent (default: run on connect).

## Why a custom element

- **Declarative.** Behavior travels as data — LSE JSON — not imperative code. It can be authored, stored, and served like any other content.
- **Validated.** The JSON is checked against the LSE schema (via the zero-dependency `@lokascript/intent` package) before anything executes; malformed intents fail loudly instead of silently misbehaving.
- **Sandboxed.** Execution runs through a bounded sandbox with a timeout, so a runaway intent can't lock the page.
- **Composable.** Because the element accepts `src="/intents/foo.json"`, intents can live in static files or come from an API.

## API exports

For programmatic use (e.g. registering the element yourself, or custom schemas):

- `LSEIntentElement` — the `HTMLElement` subclass (already defined as `lse-intent` by the browser build).
- `intentRegistry` — the LSE command-schema registry.
- Type: `SandboxResult`.

The IIFE build exposes these on `window.HyperFixiIntentElement`.

## License

MIT

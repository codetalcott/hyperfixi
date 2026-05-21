# @hyperfixi/intent-element

The `<lse-intent>` custom element for [hyperfixi](https://github.com/codetalcott/hyperfixi) — a declarative way to run **LSE protocol JSON** (LokaScript Explicit Syntax) from HTML. The element validates the JSON against the LSE schema, then executes it through the hyperfixi runtime.

## Install

```bash
npm install @hyperfixi/intent-element
```

`@hyperfixi/core` is an optional peer dependency: validation works without it, but executing an intent needs the runtime (`window.hyperfixi.evalLSENode`).

## Usage

The browser build auto-registers `<lse-intent>`:

```html
<script src="hyperfixi.js"></script>
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

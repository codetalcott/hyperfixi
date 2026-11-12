# @hyperfixi/intent-element

The `<lse-intent>` custom element for [hyperfixi](https://github.com/codetalcott/hyperfixi): it runs **LSE protocol JSON** (LokaScript Explicit Syntax) from HTML. The element validates the JSON, renders it to one English hyperscript script, and runs that on the page's hyperscript host.

It runs an intent as written or not at all. Anything it cannot run faithfully is refused with an `lse:error` event: see [What it refuses](#what-it-refuses).

## Install

```bash
npm install @hyperfixi/intent-element
```

Running an intent needs two things on the page, both optional peers:

- a **hyperscript host**: `@hyperfixi/engine`'s `hyperfixi-hs.js` (`window.hyperfixi`) or upstream `_hyperscript`, anything with `evaluate(source, context)`;
- a **renderer**: `@lokascript/semantic`'s `render(node, 'en')`, taken from whichever `LokaScriptSemantic*` browser bundle the page loads (`browser-en.en.global.js` is the English-only one), or set on `LSEIntentElement.render`.

Without either, a run is an `lse:error` (`NO_RUNTIME`, `NO_RENDERER`).

## Usage

```html
<script src="hyperfixi-hs.js"></script>
<script src="browser-en.en.global.js"></script>
<script src="intent-element.iife.global.js"></script>

<!-- A command, run when the element is clicked -->
<lse-intent trigger="click">
  <script type="application/lse+json">
    {
      "action": "toggle",
      "roles": {
        "patient": { "type": "selector", "value": ".active" },
        "destination": { "type": "selector", "value": "#sidebar" }
      }
    }
  </script>
  <button>Toggle</button>
</lse-intent>

<!-- A handler names its own event -->
<lse-intent>
  <script type="application/lse+json">
    {
      "action": "add",
      "roles": { "patient": { "type": "selector", "value": ".seen" } },
      "trigger": { "event": "click", "modifiers": { "once": true } }
    }
  </script>
  <button>Mark seen</button>
</lse-intent>

<!-- From a URL, restricted to three actions -->
<lse-intent src="/intents/sidebar.json" allow="toggle add remove"></lse-intent>
```

In a bundler, `import '@hyperfixi/intent-element'` defines the element. The scripts may come before or after the markup; if `src` or the inline JSON changes later, the element reads it again when `src` changes or `refresh()` is called, and only the latest read counts.

### When it runs

The `trigger` attribute decides, when present:

| `trigger`       | Runs                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| `load`          | on connect                                                                |
| `manual`        | only when the page calls `element.refresh()`                              |
| `intersect`     | once, when the element scrolls into view                                  |
| `submit`        | on submit of the closest ancestor `<form>` (`preventDefault()` is called) |
| any other value | on that DOM event, listened for on the element (the name's case is kept)  |

Without the attribute, an event handler (the verbose `kind: "event-handler"` form, or a command with `trigger`) runs on its own event, and anything else runs on connect.

### What runs

One script per run. A handler's body of several commands is rendered as a `then` chain, so `it` and `result` carry from one command to the next. The script's `me` is the element, and `event` is the event that triggered it. `lse:executed` carries the script that ran.

### Attributes

| Attribute  | Meaning                                                                               |
| ---------- | ------------------------------------------------------------------------------------- |
| `src`      | fetch the JSON from a URL instead of an inline `<script type="application/lse+json">` |
| `trigger`  | see above                                                                             |
| `allow`    | the actions this intent may run (space or comma separated); see [Trust](#trust)       |
| `timeout`  | milliseconds to wait for a run before reporting `EXECUTION_TIMEOUT` (default 5000)    |
| `disabled` | do nothing, `refresh()` included                                                      |

A child marked `slot="error"` (a plain attribute: the element has no shadow DOM) is shown on a refusal or a failed run and hidden again on the next success.

### Events

All three bubble.

| Event           | When                                            | `detail`                   |
| --------------- | ----------------------------------------------- | -------------------------- |
| `lse:validated` | the intent was read and will run on its trigger | `{ node, diagnostics }`    |
| `lse:executed`  | a run finished                                  | `{ node, script, result }` |
| `lse:error`     | a refusal, or a failed run                      | `{ diagnostics, error }`   |

## Trust

**An intent is code.** An `expression` value is hyperscript, and hyperscript can call any JavaScript. Values are written into the script as they are, so a selector value of `.a then call steal()` is two commands. By default the element trusts its JSON exactly as much as a page trusts its own `_="…"` attributes: fine for JSON you wrote, not for JSON from an API or a model.

For JSON from anywhere else, set `allow`:

```html
<lse-intent src="/api/next-action" allow="toggle add remove show hide"></lse-intent>
```

With an allow list:

- every command in the intent (nested ones too) must use a listed action;
- no value may be an `expression` or an interpolated literal;
- a selector must be one selector (`.a`, `#a`, `@a`, `*a`, or one `<…/>` query), a reference one name, a bare literal one word or number, a property one name;
- a string may hold any text but a backslash.

The list is yours to choose, and an allowed command still does what it does: `put` writes HTML, so allowing `put` on JSON you do not control allows markup injection.

The `timeout` is not a sandbox. When it passes, the element stops waiting and reports `EXECUTION_TIMEOUT`; the script is not interrupted, and a synchronous loop is never timed out.

## What it refuses

Each is an `lse:error` with the code in `detail.diagnostics`, and nothing runs.

| Code                                                   | Why                                                                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_JSON`, `FETCH_ERROR`, `NO_INTENT`             | the JSON could not be read, or there is none                                                                                |
| wire-format codes (`MISSING_ACTION`, …)                | `validateProtocolJSON` rejects it                                                                                           |
| `UNKNOWN_FIELD`                                        | a field that is not part of an LSE node, which the reader would skip                                                        |
| `MISSING_REQUIRED_ROLE`                                | a schema registered in `intentRegistry` requires a role the intent lacks                                                    |
| `UNSUPPORTED_MODIFIER`                                 | an event modifier other than `once` (`debounce`, `throttle`, `queue`)                                                       |
| `UNSUPPORTED_EVENT`, `INVALID_EVENT`                   | the event is not one plain name (a filter, alternatives, an expression)                                                     |
| `NESTED_HANDLER`, `EMPTY_HANDLER`                      | a handler inside another node; a handler with no body                                                                       |
| `ACTION_NOT_ALLOWED`, `VALUE_NOT_ALLOWED`              | outside the `allow` list                                                                                                    |
| `NO_ANCESTOR_FORM`, `NO_INTERSECTION_OBSERVER`         | the trigger cannot be wired                                                                                                 |
| `NO_RUNTIME`, `NO_RENDERER`                            | at run time: no host, or no renderer                                                                                        |
| `RENDER_ERROR`, `EXECUTION_ERROR`, `EXECUTION_TIMEOUT` | at run time: the node did not render, the script failed, or it is still running                                             |
| `RENDER_DROPPED_VALUE`                                 | at run time: the rendered script lacks a value of the intent (a role the renderer has no place for, such as a misspelt one) |

Measured on the 781 scripts from upstream's test suite and the reference examples that protocol JSON carries: the element runs 745 as written and refuses 36 (a second handler in the script, an event that is not a plain name); none runs as anything else (`src/corpus.test.ts`). LSE itself carries commands and simple handlers, not whole programs: see [`protocol/README.md`](../../protocol/README.md).

A literal with no `dataType` is written bare, as the wire format says: a word, not text. For text, write `"dataType": "string"`. The element warns (`BARE_LITERAL`, in `lse:validated`) when a bare literal has several words.

## API

- `LSEIntentElement`: the `HTMLElement` subclass. `node`, `diagnostics`, `refresh()`; static `render` to supply a renderer.
- `intentRegistry`: command schemas the page registers; an intent that breaks one is refused.
- `planIntent(json, { allow?, schemaFor? })`: the element's decision without a DOM. Returns `{ ok: true, node, body, trigger?, diagnostics }` or `{ ok: false, diagnostics }`.

The IIFE build exposes these on `window.HyperFixiIntentElement`.

## License

MIT

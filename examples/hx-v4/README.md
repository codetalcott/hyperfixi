# hx-v4 examples

Interactive demos of HyperFixi's htmx v4 attribute support.

> **Status: scaffolded; reactive re-render lands in Phase 5.**
>
> The example HTML files demonstrate the intended user-facing shape and
> end-to-end exercise the bundle wiring. Smoke-testing them in a real
> browser confirms:
>
> - ✅ `hx-live` is recognized by the htmx processor
> - ✅ The reactivity-feature gate passes (parser-extension registry is now
>   shared across bundles — fixed in this commit)
> - ✅ The translator emits the correct `live ... end` block
> - ✅ The initial live-block run executes (the live target shows the
>   initial value)
> - ⚠️ **Subsequent writes via `_=` event handlers don't trigger the live
>   effect to re-run.** The `hyperfixi-hx.js` bundle uses the slim
>   `hybrid-complete` runtime for `_=` attribute processing — its `set`
>   command path doesn't route through the same notify-global hook the
>   reactivity effect subscribes to.
>
> Phase 5 will ship a single `hyperfixi-hx-v4.js` bundle that uses the full
> runtime and auto-installs reactivity, eliminating the dual-runtime split.
> When that lands, these demos will work end-to-end without the manual
> wiring shown below.

## Run locally

From the project root:

```bash
npx http-server . -p 3000 -c-1
```

Then open one of:

- <http://127.0.0.1:3000/examples/hx-v4/hx-live-counter.html>
- <http://127.0.0.1:3000/examples/hx-v4/hx-live-multiple-deps.html>
- <http://127.0.0.1:3000/examples/hx-v4/hx-live-no-reactivity.html>

## What each demo shows

### `hx-live-counter.html`

The minimum viable `hx-live` setup. A counter mutates `$count`; a div with
`hx-live="put $count into me"` re-renders on every change. Demonstrates that the
live body re-runs whenever a tracked dependency changes.

### `hx-live-multiple-deps.html`

Same idea, two dependencies. The live body reads `$price` and `$quantity` and
displays their product. Either input change triggers a re-render — but mutating
an unrelated global does NOT (try it in the console). This is the key
ergonomic win over htmx v4's vanilla `hx-live`, which re-evaluates on every DOM
mutation event regardless of relevance.

### `hx-live-no-reactivity.html`

The error path. This page intentionally does NOT install
`@hyperfixi/reactivity`. The processor's gate fires: `hx-live` elements are
skipped with a clear console error, and other htmx attributes on the same page
(here, `hx-on:click`) continue to work. Open devtools console to see the
diagnostic message.

## Bundle wiring (interim, until Phase 5)

These demos load three things:

1. **`hyperfixi.js`** (full bundle) — provides `Runtime`, `createRuntime`,
   `installPlugin`, and `getParserExtensionRegistry` on `window.hyperfixi`.
2. **`@hyperfixi/reactivity`** (ESM module) — imported inline; its
   `reactivityPlugin` registers the `live` / `when` / `bind` features on the
   global parser-extension registry.
3. **`hyperfixi-hx.js`** (htmx-compat bundle) — dynamically injected
   _after_ reactivity is installed, so its scanner sees `live` registered when
   it encounters `hx-live` attributes.

The order matters because `hyperfixi-hx.js` auto-initializes on
`DOMContentLoaded` (or immediately if the DOM is already parsed). Loading it
last ensures reactivity is in place first.

**Phase 5** will ship a single `hyperfixi-hx-v4.js` bundle that auto-installs
reactivity, collapsing this three-step wiring into one script tag. These demos
will be updated when that bundle exists.

## Cross-link

- Reactivity package: [`packages/reactivity/`](../../packages/reactivity/) —
  the `hx-live` bridge is documented in [its README](../../packages/reactivity/README.md#hx-live-bridge).
- Plan: [`~/.claude/plans/htmx-v4-reactive-streaming.md`](file://~/.claude/plans/htmx-v4-reactive-streaming.md).

# @hyperfixi/behaviors

Reusable hyperscript behaviors. A behavior is installed on any element with
`_="install BehaviorName(params)"` and is defined in **pure hyperscript** (its `source`),
in upstream `_hyperscript`'s own idioms. The host is `@hyperfixi/engine` (the
`hyperfixi-hs.js` script-tag bundle); every source also runs, unchanged, on upstream
`_hyperscript` 0.9.93.

```html
<script src="hyperfixi-hs.js"></script>
<script src="resolver.browser.global.js"></script>
<!-- install X just works — the bundle defines every behavior on the host -->
<button _="install Toggleable(cls: 'active')">Toggle</button>
```

## Hosts

The bundle (and the npm `register*()` functions) define each behavior with the host's
`evaluate(source)`, exactly as a page's `<script type="text/hyperscript">` would. Anything
shaped like upstream's `_hyperscript` object is a host; `window.hyperfixi` is tried first,
then `window._hyperscript`.

- **`@hyperfixi/engine`** (`hyperfixi-hs.js`): the peer dependency, and what the tests run
  on. `install Toggleable` with no arguments works.
- **upstream `_hyperscript`** (0.9.93): every source runs the same, measured in a browser
  (2026-10-03). One difference, upstream's: `install Toggleable` _without parentheses_ throws
  there, so write `install Toggleable()` (or give an argument) on upstream.

Two things the sources never do, because no hyperscript engine reads them that way: default a
parameter with a bare `set cls to "active"` (it makes a local the handlers never see — the
sources write `set element's cls to …`), and name a parameter `target` (that is hyperscript's
own name for the event target, so Toggleable's is `targetEl`).

## The boundary rule — what a behavior _is_

> **A behavior is a named, parameterized, _reusable inline script_ — `on event →
DOM action`. It is not a component.** When something needs an observer, a focus
> model, or an async pointer loop, it has left the inline-scripting lane and belongs
> in a web component or a plain module instead.

This rule is why the set is small and tiered. Most "behaviors" people reach for are
really just short inline scripts — see [Recipes](#recipes--most-things-are-inline-scripts).

A single source of truth drives every consumer: the hyperscript `source` string in
each `src/schemas/*.schema.ts`. The npm `register*()` functions, the browser
`resolver.browser.global.js` bundle, and `@hyperfixi/patterns-reference` all define
that **same source** — one runtime path, identical in the browser and Node. **Every
behavior is defined from `source`; there is no imperative-JS installer.** (An earlier
imperative-installer experiment forked a second, diverging path; it has been removed
for all tiers — including the three experimental components, which now run their
pointer loops from `source` like everything else.)

**Writing or installing a behavior?** See **[AUTHORING.md](AUTHORING.md)** — the
canonical guide (boundary test, anatomy, schema, install/resolver, agent checklist).

## Tiers

Curation status (`curated` / `optional` / `experimental`) is exported
programmatically from [`src/curation.ts`](src/curation.ts). It is orthogonal to the
lazy-loading `tier` (core/common/optional).

### Curated (5) — reliable, runtime-tested, the supported story

| Behavior       | What it does                              | Notes                                   |
| -------------- | ----------------------------------------- | --------------------------------------- |
| `Toggleable`   | Toggle a class on click                   | accordions, dropdowns, toggle buttons   |
| `Removable`    | Remove an element on click                | dismiss notifications; optional confirm |
| `ClickOutside` | Fire `clickoutside` on an outside press   | a primitive (dropdown/menu dismissal)   |
| `Clipboard`    | Copy text on click + `.copied` feedback   | JS-backed convenience (Clipboard API)   |
| `AutoDismiss`  | Auto-remove after a delay, pause-on-hover | JS-backed convenience (timers)          |

`Toggleable` / `Removable` / `ClickOutside` are genuinely hyperscript-native (real
`on event → action` bodies) and translate meaningfully across languages.
`Clipboard` / `AutoDismiss` ship in the curated set for their user value but are
honestly JS-backed (their `js()` core stays English — fidelity-neutral).

Each curated behavior has a real-runtime DOM test in
[`src/behaviors/curated-runtime.test.ts`](src/behaviors/curated-runtime.test.ts)
asserting both the effect and its lifecycle events — "parses ≠ works".

### Optional (3) — kept, documented as primitives / nice-to-haves

`FocusTrap` · `ScrollReveal` · `Tabs`. `FocusTrap` + `ClickOutside` are the
primitives a Modal composes from; `Tabs` is high-value but heavy (a future
web-component candidate). They carry their web-API logic (a focus model, an
`IntersectionObserver`, ARIA/keyboard wiring) in an `init`-block `js()` body, but
flow through the **same single compile path** as the curated set — no
imperative-installer fork. Each has a real-runtime DOM test in
[`src/behaviors/optional-runtime.test.ts`](src/behaviors/optional-runtime.test.ts).

### Experimental (3) — beyond the boundary

`Draggable` · `Sortable` · `Resizable` — stateful async components (`repeat until
event` + `wait for` pointer loops). Kept working, but explicitly **outside** the
curated/supported/marketed story. If you need robust drag/sort/resize, prefer a
dedicated library or web component.

## Recipes — most things are inline scripts

Before installing a behavior, check whether a short inline script does the job. The
upstream \_hyperscript cookbook (`www/patterns/`) is almost entirely inline patterns,
not `behavior` definitions. See [`examples/behaviors/recipes.html`](../../examples/behaviors/recipes.html)
for adapted recipes (toggle, fade-and-remove, character counter, …). Promote a
recipe to an installed behavior only when it is genuinely reusable and parameterized.

## API

```javascript
import { registerAll } from '@hyperfixi/behaviors';
await registerAll(); // defines every behavior on window.hyperfixi (or window._hyperscript)

import { registerToggleable } from '@hyperfixi/behaviors/toggleable';
await registerToggleable(); // tree-shakeable single behavior

import { CURATED_BEHAVIORS, curationStatusOf } from '@hyperfixi/behaviors';
curationStatusOf('Draggable'); // 'experimental'
```

See [`examples/behaviors/demo.html`](../../examples/behaviors/demo.html) for a live
demo grouped by tier.

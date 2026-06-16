# @hyperfixi/behaviors

Reusable hyperscript behaviors for HyperFixi / LokaScript. A behavior is installed
on any element with `_="install BehaviorName(params)"` and is defined in **pure
hyperscript** (its `source`), compiled on demand.

```html
<script src="hyperfixi.js"></script>
<script src="resolver.browser.global.js"></script>
<!-- install X just works — behaviors compile on first use -->
<button _="install Toggleable(cls: 'active')">Toggle</button>
```

## The boundary rule — what a behavior _is_

> **A behavior is a named, parameterized, _reusable inline script_ — `on event →
DOM action`. It is not a component.** When something needs an observer, a focus
> model, or an async pointer loop, it has left the inline-scripting lane and belongs
> in a web component or a plain module instead.

This rule is why the set is small and tiered. Most "behaviors" people reach for are
really just short inline scripts — see [Recipes](#recipes--most-things-are-inline-scripts).

A single source of truth drives every consumer: the hyperscript `source` string in
each `src/schemas/*.schema.ts`. The npm `register*()` functions, the CDN
`resolver.browser.global.js` bundle, and `@hyperfixi/patterns-reference` all compile
that **same source** — one runtime path, identical in the browser and Node. **Every
behavior compiles from `source`; there is no imperative-JS installer.** (An earlier
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
await registerAll(); // registers every behavior with window.hyperfixi

import { registerToggleable } from '@hyperfixi/behaviors/toggleable';
await registerToggleable(); // tree-shakeable single behavior

import { CURATED_BEHAVIORS, curationStatusOf } from '@hyperfixi/behaviors';
curationStatusOf('Draggable'); // 'experimental'
```

See [`examples/behaviors/demo.html`](../../examples/behaviors/demo.html) for a live
demo grouped by tier.

# Authoring & installing behaviors

The canonical guide to **what a behavior is**, **how to write one**, and **how to
install it** — for human authors and LLM agents alike. Pairs with the
[package overview](README.md) (the curated set + tiers) and the programmatic
boundary in [`src/curation.ts`](src/curation.ts).

> HyperFixi ships a deliberately small behavior set. The goal is **getting the
> behavior _system_ right** — a clear path for the community and for agents to write
> and install new behaviors — not a comprehensive library. The curated set is a
> showcase of _what a behavior is_, not the boundary of what you can build.

---

## 1. What a behavior is — the boundary rule

> **A behavior is a named, parameterized, _reusable inline script_ — `on event →
DOM action`. It is not a component.** When something needs an observer, a focus
> model, or an async pointer loop, it has left the inline-scripting lane and belongs
> in a web component or a plain module instead.

Every behavior is defined in **pure hyperscript** — its `source` string — and
compiled on demand. That single source of truth drives every consumer (the npm
`register*()` functions, the CDN resolver bundle, and `@hyperfixi/patterns-reference`),
so a behavior behaves identically in the browser and in Node, and is multilingual for
free (the source parses once; the semantic layer handles 24 languages).

**There is no imperative-JS installer path.** A behavior is its hyperscript `source`
— never a hand-written `addEventListener`/observer function. (An earlier
imperative-installer experiment was removed; if you find one, it's a bug.) Web-platform
APIs are still fair game — you call them _from_ the source via a `js()` block (see
§4), not from a separate TS installer.

## 2. The boundary test (run this first)

Before writing a `behavior`, check whether it belongs in the lane at all:

1. **Is it expressible as runnable hyperscript `source`?** If you cannot write it as a
   `behavior … end` block the runtime executes, it is not a behavior.
2. **Is it `on event → DOM action`?** A handler that reacts to an event and mutates
   the DOM (toggle a class, remove an element, copy text). Yes → in lane.
3. **Does it need a long-lived observer, a focus model, or an async pointer loop?**
   (`IntersectionObserver`, `ResizeObserver`, focus trapping, drag loops.) That is a
   _component_. Prefer a web component or a dedicated library. If you ship it anyway,
   it belongs in the **experimental** tier, clearly marked "beyond the boundary."
4. **Is it actually reusable and parameterized?** If it's a one-off, keep it as a
   plain inline script (`_="on click …"`) — most "behaviors" people reach for are
   really just short inline patterns. See [Recipes](README.md#recipes--most-things-are-inline-scripts).

Promote an inline script to an installed behavior only when 1–4 all hold.

## 3. Anatomy of a behavior

A behavior is a `behavior` block: a name, optional parameters, an `init` block, and
one or more `on <event>` handlers. Here is the curated **Toggleable** verbatim
([toggleable.schema.ts](src/schemas/toggleable.schema.ts)), annotated:

```hyperscript
behavior Toggleable(cls, targetEl)     -- PascalCase name + parameters
  init                                  -- runs once on install
    if cls is undefined set element's cls to "active" end        -- default a parameter
    if targetEl is undefined set element's targetEl to me end
  end
  on click                              -- on event → DOM action
    toggle .{cls} on targetEl           --   .{cls} = dynamic class from a param
    js(targetEl, cls)                   --   a js() block dispatches the lifecycle
      var name = targetEl.classList.contains(cls) ? 'toggleable:on' : 'toggleable:off';
      targetEl.dispatchEvent(new CustomEvent(name, { bubbles: true }));
    end
  end
end
```

Install it on any element:

```html
<button _="install Toggleable(cls: 'expanded', targetEl: #menu)">Menu</button>
```

### Key source idioms

Every idiom here is upstream `_hyperscript`'s: the sources run on `@hyperfixi/engine` and
on upstream alike (see the README's "Hosts").

- **Parameters + defaults** — declare in `behavior Name(a, b)`; default a _value_ in
  `init` with `if a is undefined set element's a to … end`. The parameters live in the
  behavior's element scope, which is what `element's a` writes; a bare `set a to …` would
  make a local of `init` that the handlers never see.
- **A `from` target** cannot be defaulted in `init` — `from` is resolved when the behavior
  is installed, before `init` runs. Default it inline: `on click from (triggerEl or me)`.
- **Never name a parameter `target`** — that is hyperscript's name for the event target, and
  it shadows the parameter in every handler. Removable's is `triggerEl`, Toggleable's
  `targetEl`.
- **Position and size** — `my offsetLeft` / `my offsetTop`, `my offsetWidth` /
  `my offsetHeight` (`measure x` then `it` was a core-only reading).
- **Dynamic class selector `.{param}`** — `toggle .{cls}`, `add .{cls}`,
  `remove .{cls}` resolve a parameter as a class name at runtime.
- **Inline style writes** — `set my *width to "200px"` (the `*prop` style idiom) or
  `set my style.width to "200px"` (member write); both target the writable inline
  style. `add { left: ${x}px; top: ${y}px }` writes a style object (expressions and
  spaces inside `${…}` are preserved).
- **Event-argument destructuring** — `on pointermove(clientX, clientY) …` binds the
  named event properties as locals (works at the top level and in behaviors).
- **Scoped events** — `on pointerup from document`, `on click from triggerEl`.
- **The element** — `me` is the installed element inside a handler.

## 4. Web-platform APIs — from `source`, via `js()`

When a behavior genuinely needs a platform API (Clipboard, timers, ARIA wiring), call
it from a `js()` block inside the source — still one compiled source, no separate
installer. The Toggleable above used `js()` to dispatch its lifecycle event; the
curated **Clipboard** uses it for the Clipboard API (simplified — the real
[clipboard.schema.ts](src/schemas/clipboard.schema.ts) adds an `execCommand`
fallback):

```hyperscript
behavior Clipboard(text, source)
  init
    if source is undefined set source to me end
  end
  on click
    if text is undefined set text to source's textContent end
    js(text)
      (async () => { await navigator.clipboard.writeText(text); })();
    end
    add .copied then wait 1s then remove .copied
  end
end
```

`js(text)` passes named locals into the JS block (and `js()` has no top-level await —
wrap async work in an IIFE). Keep `js()` bodies small and English (they're
fidelity-neutral — the multilingual layer doesn't translate JS). A behavior that is
_mostly_ a `js()` body is a smell — reconsider the boundary test.

## 5. Lifecycle events

Dispatch namespaced lifecycle events with `trigger name:phase` so consumers can react:

```hyperscript
trigger removable:before          -- before the action
trigger removable:removed         -- after the action
```

Fire a `name:before` _before_ a destructive action and a `name:removed`/`name:done`
_after_, so consumers can observe each phase. You can make a phase **cancelable** by
checking whether the `before` event was `preventDefault()`-ed and `halt`-ing if so —
an optional pattern, worth it for irreversible actions. Document every event you
dispatch in the schema's `events` array (§6).

## 6. The schema file

Each behavior is a `BehaviorSchema` in `src/schemas/<name>.schema.ts` — the source of
truth for the source string plus its metadata:

```typescript
export const toggleableSchema: BehaviorSchema = {
  name: 'Toggleable', // PascalCase
  category: 'ui', // ui | data | animation | form | layout
  tier: 'core', // lazy-load tier: core | common | optional
  version: '1.0.0',
  description: 'Toggle a class on click',
  parameters: [
    {
      name: 'cls',
      type: 'string',
      optional: true,
      default: 'active',
      description: 'Class to toggle',
    },
    {
      name: 'target',
      type: 'selector',
      optional: true,
      default: 'me',
      description: 'Element to toggle the class on',
    },
  ],
  events: [
    { name: 'toggleable:on', description: 'Fired when the class is added' },
    { name: 'toggleable:off', description: 'Fired when the class is removed' },
  ],
  source: `behavior Toggleable(cls, target) … end`.trim(),
};
```

Then add a thin loader in `src/behaviors/<name>.ts` (mirror any existing one, e.g.
[`toggleable.ts`](src/behaviors/toggleable.ts)): a `register<Name>(host?)` that calls
`defineBehavior(schema, host)` — the host's `evaluate(source)`, as a
`<script type="text/hyperscript">` would — plus a `default` export of
`{ source, metadata, register }`. Register the loader + schema in
[`src/loaders.ts`](src/loaders.ts) and the source in the
[`BEHAVIOR_SOURCES`](src/behavior-resolver.ts) map.

### Pick a curation status

Set it in [`src/curation.ts`](src/curation.ts): `curated` (reliable, supported,
runtime-tested), `optional` (kept primitive / nice-to-have), or `experimental`
(beyond the boundary, unmarketed). Be honest — a drag/observer behavior is
`experimental`, not `curated`.

## 7. Installing & registering

**End users** install with the `_=` attribute; the browser bundle defines every behavior
on the host as it loads:

```html
<script src="hyperfixi-hs.js"></script>
<script src="resolver.browser.global.js"></script>
<button _="install Toggleable(cls: 'active')">Toggle</button>
```

**Programmatically** (tree-shakeable):

```javascript
import { registerAll } from '@hyperfixi/behaviors';
await registerAll(); // every behavior
import { registerToggleable } from '@hyperfixi/behaviors/toggleable';
await registerToggleable(); // just one
```

**Custom behaviors** — a behavior is a global the host defines when it reads a
`behavior … end` program, so define yours the way upstream does, before the elements that
install it: in a `<script type="text/hyperscript">`, or from a string with
`window.hyperfixi.evaluate(MY_SOURCE)` (`defineBehavior(schema)` from this package does
the same for a schema).

## 8. Testing — "parses ≠ works"

A behavior that _parses_ is not a behavior that _works_. Add a real-runtime DOM test:
register → install on an element → drive the event → assert **both** the DOM effect
**and** the documented lifecycle events. Mirror
[`curated-runtime.test.ts`](src/behaviors/curated-runtime.test.ts) /
[`experimental-runtime.test.ts`](src/behaviors/experimental-runtime.test.ts).

## 9. Checklist for LLM agents

When asked to author a behavior, produce a `BehaviorSchema` and verify:

- [ ] **Boundary (§2):** `on event → DOM action`, expressible as runnable hyperscript
      `source`, reusable + parameterized. No standalone observer / focus model / async
      pointer loop — if it needs one, say so and recommend a component instead, or mark
      it `experimental`.
- [ ] **Source only:** the behavior is its `source` string. No imperative
      `addEventListener`/observer installer. Platform APIs go in a small `js()` block.
- [ ] **Schema complete:** PascalCase `name`; `category`; `tier`; every `parameter`
      (type, optional, default, description); every lifecycle `event` documented.
- [ ] **Idioms:** values defaulted in `init` with `set element's x to …`, `from` targets
      inline with `from (x or me)`, no parameter named `target`; dynamic classes via
      `.{param}`; inline style via `*prop` or `style.prop`; event args via
      `on event(a, b)`.
- [ ] **Curation (§6):** honest status. Curated ⇒ runtime-tested + multilingual-friendly.
- [ ] **Test:** a register → install → drive → assert-effect-and-events runtime test.

---

_Superseded `packages/core/BEHAVIORS.md`, which documented an earlier imperative,
class-based behavior architecture that no longer exists._

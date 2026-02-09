# Plan: @lokascript/siren — Siren Hypermedia Plugin

## siren-grail local path

/Users/williamtalcott/projects/siren-grail

## Goal

Create a LokaScript plugin package that makes Siren hypermedia responses drive DOM behavior declaratively. The server's affordances (actions, links, entities) become the engine of UI state — no client-side router, no local state machine.

## Package Location

`packages/siren/` — follows existing monorepo conventions (behaviors, server-integration, etc.)

---

## Phase 1: Foundation — Siren Client + Context Provider

**What:** A thin Siren HTTP client and a context provider that exposes the current entity as `siren.*` in any `_="..."` attribute.

### Files

```
packages/siren/
├── src/
│   ├── index.ts                 # Barrel exports + browser auto-register
│   ├── types.ts                 # SirenEntity, SirenAction, SirenLink, SirenField
│   ├── siren-client.ts          # fetch wrapper: Accept negotiation, response parsing
│   ├── siren-context.ts         # Context provider: siren.properties, siren.actions, etc.
│   ├── plugin.ts                # LokaScriptPlugin definition (wires everything)
│   └── util.ts                  # URL resolution, field reconciliation
├── test/
│   ├── siren-client.test.ts
│   └── siren-context.test.ts
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### siren-client.ts

Responsibilities:

- `fetchSiren(url, opts?)` — sets `Accept: application/vnd.siren+json`, parses response
- Handles 201+Location (follow redirect), 204 (return null), 200 (parse entity)
- Stores `currentEntity` and `currentUrl` as module-level state
- Emits a `siren:entity` CustomEvent on `document` when entity changes
- Emits `siren:blocked` CustomEvent on 409 with cooperative affordance body

No SirenBin in Phase 1. JSON only. Binary support is a later phase.

### siren-context.ts

Register a context provider so LokaScript expressions can access:

```
siren.properties        → current entity properties object
siren.class              → current entity class array
siren.actions            → array of action name strings
siren.links              → array of link rel strings
siren.action(name)       → full action object by name (fields, method, href)
siren.link(rel)          → full link object by rel
siren.entities           → sub-entity array
```

Pattern: `registry.context.register('siren', provider)` per existing convention.

### types.ts

Minimal Siren type definitions (not importing from siren-grail — this package stands alone):

```typescript
interface SirenEntity {
  class?: string[];
  properties?: Record<string, unknown>;
  actions?: SirenAction[];
  links?: SirenLink[];
  entities?: SirenSubEntity[];
}

interface SirenAction {
  name: string;
  title?: string;
  method?: string;
  href: string;
  type?: string;
  fields?: SirenField[];
  preconditions?: string[];
  effects?: string[];
}

interface SirenField {
  name: string;
  type?: string;
  value?: unknown;
  title?: string;
  description?: string;
  options?: unknown[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
}

interface SirenLink {
  rel: string[];
  href: string;
  title?: string;
}

interface SirenSubEntity {
  class?: string[];
  rel?: string[];
  href?: string;
  properties?: Record<string, unknown>;
}
```

### plugin.ts

Wire the LokaScriptPlugin interface:

```typescript
export const sirenPlugin: LokaScriptPlugin = {
  name: '@lokascript/siren',
  version: '1.3.0',
  contextProviders: [sirenContextProvider],
  setup(registry) {
    /* init client, attach document listeners */
  },
  teardown(registry) {
    /* cleanup */
  },
};
```

### util.ts

- `resolveUrl(href, baseUrl)` — `new URL(href, baseUrl).href`
- `reconcileFields(data, fields)` — fill in field defaults from action.fields[].value when caller omits them
- `classifyError(status)` — transient (429, 5xx) vs permanent (4xx)

### Tests

Test against a mock fetch (no real server needed):

- `siren-client.test.ts` — fetch, content negotiation, 201/204/200/409 handling
- `siren-context.test.ts` — context provider returns correct values for sample entities

### Deliverable

After Phase 1, this works:

```html
<div _="on siren:entity put siren.properties.status into me">(status appears here)</div>
```

---

## Phase 2: Commands — fetch-siren, follow-link, execute-action

**What:** Three LokaScript commands that let `_="..."` attributes drive Siren navigation.

### Files (additions)

```
src/
├── commands/
│   ├── fetch-siren.ts          # `fetch <url> as siren`
│   ├── follow-link.ts          # `follow siren link <rel>`
│   └── execute-action.ts       # `execute siren action <name> [with <data>]`
```

### fetch-siren command

Syntax: `fetch <url> as siren [then ...]`

Extends the mental model of LokaScript's existing `fetch ... as json`. Sets context variable `siren` to the parsed entity. Fires `siren:entity` event.

```html
<button _="on click fetch /api/ as siren then put siren.properties into #info">Load API</button>
```

Implementation: register via `@command({ name: 'fetch-siren' })`. Internally calls `fetchSiren()` from Phase 1.

Decision: implement as a standalone command rather than patching the existing `fetch` command. Avoids coupling to core internals. The syntax `fetch ... as siren` is achieved by registering a conversion type (`as siren`) if the core expression system supports it, otherwise use `fetch-siren <url>` as the command name.

**Investigation needed:** check whether LokaScript's `as` conversion system is extensible via registry. If yes, register a `siren` conversion. If no, use a distinct command name.

### follow-link command

Syntax: `follow siren link <rel>`

Resolves the link href relative to `currentUrl`, fetches it, updates client state, fires `siren:entity`.

```html
<a _="on click follow siren link 'orders' then put siren.properties into #orders"> Orders </a>
```

### execute-action command

Syntax: `execute siren action <name> [with <expr>]`

Looks up action by name on current entity, builds request from action.method + action.href, reconciles field defaults, sends request, handles response.

```html
<form
  _="on submit
  execute siren action 'create-order' with my values as Values
  then put siren.properties into #result"
></form>
```

The `my values as Values` is existing LokaScript — serializes form fields to an object.

### Tests

- Command parsing (AST node → typed input)
- Execution against mock fetch
- Error paths (action not found, link not found, network error)

### Deliverable

After Phase 2, full Siren navigation from HTML attributes:

```html
<main>
  <nav _="on load fetch-siren /api/">
    <a _="on click follow siren link 'orders'">Orders</a>
  </nav>
  <section
    id="content"
    _="on siren:entity
    put siren.properties into me"
  ></section>
</main>
```

---

## Phase 3: Event Source — siren:entity, siren:blocked, siren:error

**What:** Register a `siren` event source so `on siren:entity`, `on siren:blocked`, and `on siren:error` work as first-class LokaScript events with detail payloads.

### Files (additions)

```
src/
├── events/
│   └── siren-event-source.ts   # EventSource implementation
```

### Event source registration

```typescript
const sirenEventSource: EventSource = {
  name: 'siren',
  supportedEvents: ['entity', 'blocked', 'error'],
  subscribe(options, context) {
    // Listen for CustomEvents on document
    // Filter by event type (entity, blocked, error)
    // Return subscription with unsubscribe
  },
};
```

### Events

| Event           | Fires when                                   | detail payload                               |
| --------------- | -------------------------------------------- | -------------------------------------------- |
| `siren:entity`  | New entity loaded (any fetch/follow/execute) | `{ entity, url, previousUrl }`               |
| `siren:blocked` | 409 Conflict with cooperative affordances    | `{ message, blockedAction, offeredActions }` |
| `siren:error`   | Non-409 HTTP error or network error          | `{ status, message, transient, url }`        |

### Deliverable

After Phase 3:

```html
<div
  _="on siren:entity
  if event.detail.entity.class contains 'collection'
    show #pagination
  else
    hide #pagination
  end"
></div>

<div
  _="on siren:blocked
  put event.detail.message into #error
  then show #prerequisite-form"
></div>
```

---

## Phase 4: Affordance-Driven Visibility

**What:** A convenience behavior that shows/hides elements based on available actions and links.

### Files (additions)

```
src/
├── behaviors/
│   └── siren-affordance.ts     # Behavior: auto-show/hide based on affordances
```

### Behavior: SirenAffordance

```html
<!-- Show only when action exists -->
<button
  _="behavior SirenAffordance(action: 'ship-order')
  on click execute siren action 'ship-order'"
>
  Ship Order
</button>

<!-- Show only when link exists -->
<a
  _="behavior SirenAffordance(link: 'next')
  on click follow siren link 'next'"
>
  Next Page →
</a>
```

The behavior listens to `siren:entity` events and toggles `display` based on whether the named action or link exists on the current entity. This is the core "server drives the UI" pattern.

### Deliverable

After Phase 4, UI elements appear/disappear as the entity's affordances change — no conditional logic needed in each element.

---

## Phase 5: SirenForm Behavior — Auto-Generated Forms

**What:** A behavior that renders form fields from a Siren action's `fields[]` array.

### Files (additions)

```
src/
├── behaviors/
│   └── siren-form.ts           # Behavior: render form from action fields
```

### Behavior: SirenForm

```html
<form _="behavior SirenForm(action: 'create-order')">
  <!-- fields auto-generated here from action.fields[] -->
  <button type="submit">Create</button>
</form>
```

On `siren:entity`, the behavior:

1. Finds the named action on the current entity
2. Clears existing generated fields (preserves manually-authored children like the submit button)
3. For each `field` in `action.fields[]`:
   - `type: 'text'` → `<input type="text" name="...">`
   - `type: 'number'` → `<input type="number" ...>` with min/max/step
   - `type: 'checkbox'` → `<input type="checkbox" ...>`
   - `options` present → `<select>` with `<option>` elements
   - `required` → adds required attribute
   - `value` → sets default value
   - `description` → adds as placeholder or aria-describedby
   - `title` → adds as `<label>`
4. On submit: calls `execute siren action` with form values, field defaults reconciled

### Design decision

Fields are rendered as plain HTML — not shadow DOM. This means the host page's CSS applies naturally. The behavior adds a `data-siren-generated` attribute to generated fields so it can distinguish them from manually-authored children on re-render.

### Deliverable

After Phase 5, forms self-generate from server affordances:

```html
<form _="behavior SirenForm(action: 'add-item')">
  <!-- Server says fields: [{name:'productCode',type:'text'}, {name:'quantity',type:'number',value:1}] -->
  <!-- Behavior renders: -->
  <!--   <label>productCode<input type="text" name="productCode"></label> -->
  <!--   <label>quantity<input type="number" name="quantity" value="1"></label> -->
  <button type="submit">Add Item</button>
</form>
```

---

## Phase 6 (Optional): Cooperative 409 Pursuit

**What:** When an action returns 409 with offered affordances, automatically render a prerequisite form and chain the original action after fulfillment.

### Concept

```html
<div _="behavior SirenPursuit">
  <!-- When siren:blocked fires: -->
  <!--   1. Render offered action as a form -->
  <!--   2. On submit of that form, retry the original blocked action -->
  <!--   3. If retry succeeds, dismiss the prerequisite form -->
</div>
```

This is the UI equivalent of siren-grail's OODAAgent pursuit stack. The server guides the user through prerequisites without the client encoding the workflow.

**Complexity note:** This phase is optional because it requires managing a pursuit stack (what if the offered action is also blocked?). Start with single-level pursuit; multi-level can follow.

---

## Phase 7 (Optional): SirenBin Binary Format Support

**What:** Add `application/vnd.siren+bin` content negotiation to the client.

### Approach

- Import `bind()` from siren-grail (or vendor a minimal version)
- Update `fetchSiren()` to prefer binary Accept header
- Parse ArrayBuffer responses via `bind()`
- Proxy objects from `bind()` already implement property access — context provider works unchanged

### Why optional

JSON is sufficient for most use cases. SirenBin matters for:

- Large collections (lazy parsing saves time)
- High-frequency SSE updates (smaller payloads)
- Real-time dashboards

Bundle size concern: `bind()` is ~2KB, acceptable for an opt-in import.

---

## Build & Integration

### package.json

```json
{
  "name": "@lokascript/siren",
  "version": "1.3.0",
  "peerDependencies": { "@lokascript/core": "*" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./plugin": { "types": "./dist/plugin.d.ts", "import": "./dist/plugin.js" }
  }
}
```

### tsup.config.ts

Two builds:

1. ESM/CJS library (tree-shakeable, for bundlers)
2. Browser IIFE (`LokaScriptSiren` global, for CDN/script tag)

### Registration

```typescript
// Bundler usage
import { registry } from '@lokascript/core';
import { sirenPlugin } from '@lokascript/siren';
registry.use(sirenPlugin);

// Script tag usage (auto-registers if window.lokascript exists)
<script src="lokascript-core.js"></script>
<script src="lokascript-siren.js"></script>
```

---

## Implementation Order

| Phase | Scope                             | Depends on     | Est. complexity                 |
| ----- | --------------------------------- | -------------- | ------------------------------- |
| 1     | Client + context provider         | Nothing        | Small — ~200 LOC                |
| 2     | Commands (fetch, follow, execute) | Phase 1        | Medium — ~300 LOC               |
| 3     | Event source                      | Phase 1        | Small — ~100 LOC                |
| 4     | SirenAffordance behavior          | Phases 1, 3    | Small — ~80 LOC                 |
| 5     | SirenForm behavior                | Phases 1, 2, 3 | Medium — ~200 LOC               |
| 6     | Cooperative 409 pursuit           | Phases 1–5     | Medium — ~150 LOC               |
| 7     | SirenBin support                  | Phase 1        | Small — ~50 LOC (mostly import) |

Phases 1–3 can be implemented together as the core. Phase 4 is quick and high-impact. Phase 5 is the most user-visible feature. Phases 6–7 are stretch goals.

Total core (Phases 1–5): ~880 LOC + tests.

---

## Testing Strategy

- **Unit tests** (vitest): mock fetch, test command parsing/execution, context provider values, behavior rendering
- **Integration test**: spin up siren-grail server (`npm start` in siren-grail), run a LokaScript snippet against it in jsdom or Playwright
- **Cross-project test**: add a test in siren-grail that imports `@lokascript/siren` and validates interop

---

## Open Questions

1. **`as siren` conversion vs distinct command name** — Need to check if LokaScript's `as` keyword is extensible via registry. If not, `fetch-siren` works fine.
2. **State scope** — Module-level singleton (one entity at a time) vs per-element state (multiple Siren contexts on one page). Start with singleton; per-element is a Phase 2+ concern.
3. **URL routing** — Should `follow siren link` call `history.pushState`? Probably yes (LokaScript has `push-url`), but needs explicit opt-in to avoid surprises.
4. **CORS** — Browser fetch to Siren APIs will need CORS. This is a server concern, not a plugin concern, but docs should mention it.

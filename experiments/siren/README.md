# @lokascript/siren

Siren hypermedia plugin for LokaScript — server affordances drive DOM behavior.

The server's [Siren](https://github.com/kevinswiber/siren) responses become the engine of UI state: actions, links, and entities are exposed declaratively to hyperscript, with no client-side router or local state machine required.

## Features

- **`fetch ... as siren`** — content negotiation via LokaScript's extensible fetch
- **`follow` command** — navigate Siren links by rel
- **`execute` command** — invoke Siren actions by name, with optional data
- **`siren.*` context** — access entity properties, actions, links in hyperscript expressions
- **`SirenAffordance` behavior** — show/hide elements based on available affordances
- **CustomEvents** — `siren:entity`, `siren:blocked`, `siren:error` on `document`
- **Optional SirenBin** — binary content negotiation when `siren-agent` is installed

## Installation

```bash
npm install @lokascript/siren
```

### Optional: SirenBin support

```bash
npm install siren-agent   # adds binary content negotiation
```

## Quick Start

### Bundler usage

```typescript
import { registry } from '@lokascript/core';
import { sirenPlugin } from '@lokascript/siren';

registry.use(sirenPlugin);
```

### Script tag usage (auto-registers)

```html
<script src="lokascript-core.js"></script>
<script src="lokascript-siren.js"></script>
```

## Usage

### Fetching a Siren entity

```html
<button _="on click fetch /api/orders/1 as siren">Load Order</button>
```

### Following links

```html
<button _="on click follow siren link 'next'">Next Page</button>

<!-- shorthand -->
<button _="on click follow 'self'">Refresh</button>
```

### Executing actions

```html
<button _="on click execute siren action 'ship-order'">Ship Order</button>

<!-- with data -->
<button _="on click execute siren action 'update-status' with { status: 'shipped' }">
  Mark Shipped
</button>
```

### Context expressions

```html
<!-- Display entity properties -->
<span _="on siren:entity put siren.properties.status into me">--</span>

<!-- Check for an action -->
<div
  _="on siren:entity
  if siren.actions contains 'ship-order'
    remove .hidden from #ship-btn
  end"
></div>
```

### Affordance-driven visibility

```html
<!-- Button only visible when the action exists on the current entity -->
<button
  _="behavior SirenAffordance(action: 'ship-order')
  on click execute siren action 'ship-order'"
>
  Ship Order
</button>

<a
  _="behavior SirenAffordance(link: 'next')
  on click follow siren link 'next'"
>
  Next Page
</a>
```

### Events

```html
<!-- React to entity changes -->
<div _="on siren:entity put event.detail.entity.properties.total into me">
  <!-- Handle 409 Conflict (cooperative affordances) -->
  <div _="on siren:blocked put event.detail.message into #error">
    <!-- Handle errors -->
    <div
      _="on siren:error
  if event.detail.transient
    put 'Retrying...' into #status
  else
    put event.detail.message into #error
  end"
    ></div>
  </div>
</div>
```

## API

### Plugin

| Export        | Description                              |
| ------------- | ---------------------------------------- |
| `sirenPlugin` | Plugin object — pass to `registry.use()` |

### Client

| Export                          | Description                                   |
| ------------------------------- | --------------------------------------------- |
| `fetchSiren(url, opts?)`        | Fetch a Siren entity with content negotiation |
| `getCurrentEntity()`            | Get the current Siren entity (or `null`)      |
| `getCurrentUrl()`               | Get the current entity's URL (or `null`)      |
| `setCurrentEntity(entity, url)` | Set entity state and dispatch `siren:entity`  |
| `resetClient()`                 | Clear entity state (testing/teardown)         |

### Context (`siren.*`)

| Expression             | Type                       | Description        |
| ---------------------- | -------------------------- | ------------------ |
| `siren.properties`     | `Record<string, unknown>`  | Entity properties  |
| `siren.class`          | `string[]`                 | Entity class array |
| `siren.actions`        | `string[]`                 | Action names       |
| `siren.links`          | `string[]`                 | Link rels          |
| `siren.action('name')` | `SirenAction \| undefined` | Full action object |
| `siren.link('rel')`    | `SirenLink \| undefined`   | Full link object   |
| `siren.entities`       | `SirenSubEntity[]`         | Sub-entities       |

### Events

| Event           | Detail                                       | When                       |
| --------------- | -------------------------------------------- | -------------------------- |
| `siren:entity`  | `{ entity, url, previousUrl }`               | Entity loaded successfully |
| `siren:blocked` | `{ message, blockedAction, offeredActions }` | 409 Conflict               |
| `siren:error`   | `{ status, message, transient, url }`        | Network or HTTP error      |

### Utilities

| Export                          | Description                                 |
| ------------------------------- | ------------------------------------------- |
| `resolveUrl(href, base)`        | Resolve relative URL against base           |
| `reconcileFields(data, fields)` | Merge user data with action field defaults  |
| `classifyError(status)`         | Classify HTTP status as transient/permanent |

## SirenBin Support

When `siren-agent` is installed as a peer dependency, the plugin automatically upgrades content negotiation to support SirenBin (binary Siren encoding) alongside JSON. The `Accept` header expands to include `application/vnd.siren+bin`.

If `siren-agent` is not installed, the plugin operates in JSON-only mode with no degradation of functionality.

## License

MIT

# @lokascript/intent

> The base of the LokaScript stack: the node model, the command-schema vocabulary, and LSE. Zero dependencies.

Three things live here, because everything above builds on them:

| Part               | Entry point                 | What it is                                                                                                                                                                                         |
| ------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node model**     | `@lokascript/intent`        | `SemanticNode`, its value types and factories: the role-labeled tree `@lokascript/semantic` and the domain DSLs parse to and render from                                                           |
| **Command schema** | `@lokascript/intent/schema` | `defineCommand`, `defineRole`, `CommandSchema`, `RoleSpec`: how a DSL declares its commands, roles, markers and word-order positions                                                               |
| **LSE**            | `@lokascript/intent/lse`    | Bracket syntax (`[toggle patient:.active]`) and protocol JSON for one command or a simple handler: `parseExplicit`, `renderExplicit`, `toProtocolJSON`, `fromProtocolJSON`, `validateProtocolJSON` |

The root entry exports all three; the subpaths are for a consumer that wants one part. Most
packages reach these through `@lokascript/framework`, which re-exports them.

**LSE's scope.** LSE carries commands and simple handlers, not whole hyperscript programs. `toProtocolJSON`
and `renderExplicit` throw a `LossyEncodingError` for a node outside that (a `behavior`, a handler
with a `from` modifier, an expression of several words in bracket syntax); `{ lossy: 'allow' }`
returns the partial encoding. The specification, with what is and is not carried, is in
[`protocol/`](../../protocol/README.md).

## Installation

```bash
npm install @lokascript/intent
```

## What's included

- **Node types**: `SemanticNode` in five kinds (command, event-handler, conditional, compound, loop) and six value types (literal, selector, reference, property-path, expression, flag)
- **Bracket syntax**: `parseExplicit`, `parseCompound`, `renderExplicit`
- **Protocol JSON**: `toProtocolJSON`, `fromProtocolJSON`, `validateProtocolJSON` (LSE 3.0)
- **Schema primitives**: `CommandSchema`, `RoleSpec`, `defineCommand`, `defineRole`
- **Diagnostics**: `IRDiagnostic`, `createDiagnosticCollector`

## Quick start

```typescript
import {
  parseExplicit,
  renderExplicit,
  toProtocolJSON,
  fromProtocolJSON,
  validateProtocolJSON,
} from '@lokascript/intent';

// Bracket syntax to a node (throws on text it cannot read)
const node = parseExplicit('[toggle patient:.active destination:#button]');
node.action; // 'toggle'
node.roles.get('patient'); // { type: 'selector', value: '.active', selectorKind: 'class' }

// ...and back
renderExplicit(node); // '[toggle patient:.active destination:#button]'

// Protocol JSON (the wire format)
const json = toProtocolJSON(node);
// { kind: 'command', action: 'toggle', roles: { patient: { type: 'selector', value: '.active', … }, … } }

// Validate JSON from outside before reading it
const errors = validateProtocolJSON(json).filter(d => d.severity === 'error');
if (errors.length === 0) {
  const restored = fromProtocolJSON(json);
}
```

## A node the encodings cannot carry

```typescript
import { renderExplicit, LossyEncodingError } from '@lokascript/intent';

try {
  renderExplicit(node);
} catch (error) {
  if (error instanceof LossyEncodingError) {
    error.losses; // e.g. ['event-handler.eventModifiers.from']
    error.partial; // what would have been written
  }
}

renderExplicit(node, { lossy: 'allow' }); // the partial text, knowingly
```

## Schema validation

```typescript
import { defineCommand, defineRole, parseExplicit } from '@lokascript/intent';

const toggle = defineCommand({
  action: 'toggle',
  roles: [
    defineRole({ role: 'patient', required: true, expectedTypes: ['selector'] }),
    defineRole({ role: 'destination', required: false, expectedTypes: ['selector', 'reference'] }),
  ],
});

const schemaLookup = { getSchema: (action: string) => (action === 'toggle' ? toggle : undefined) };

parseExplicit('[toggle patient:.active]', { schemaLookup }); // ok
parseExplicit('[toggle colour:.active]', { schemaLookup }); // throws: unknown role "colour"
```

## Zero dependencies

This package has no runtime dependencies. It is designed to be embedded in any ecosystem — Alpine.js, React, Vue, Svelte, vanilla JS, or server-side tooling — without imposing transitive dependencies.

## License

MIT

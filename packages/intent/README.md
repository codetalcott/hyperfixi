# @lokascript/intent

> LSE types, bracket syntax, and protocol JSON for commands and simple handlers. Zero dependencies.

LSE (LokaScript Explicit Syntax) is a role-labeled notation for one UI action:
`[toggle patient:.active destination:#button]`, or the same as JSON. `@lokascript/intent` holds its
node types, parser, writers and schema primitives. `@lokascript/semantic` and the domain DSLs build
on the node types; `<lse-intent>` and the MCP server's `lse` tools read and write the encodings.

**Scope.** LSE carries commands and simple handlers, not whole hyperscript programs. `toProtocolJSON`
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

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

- **`SemanticNode`** — 5 node kinds (command, event-handler, conditional, compound, loop) with 7 value types
- **Bracket syntax** — parse `[toggle patient:.active on:click]` into a `SemanticNode`
- **Protocol JSON** — serialize/deserialize to the LSE wire format (v1.0–v1.2)
- **Schema primitives** — `CommandSchema`, `RoleSpec`, `defineCommand`, `defineRole`
- **Diagnostics** — `IRDiagnostic`, `createDiagnosticCollector`

## Quick start

```typescript
import {
  parseExplicit,
  toProtocolJSON,
  fromProtocolJSON,
  validateProtocolJSON,
} from '@lokascript/intent';

// Parse bracket syntax
const result = parseExplicit('[toggle patient:.active]');
if (result.ok) {
  const node = result.node;

  // Serialize to protocol JSON (wire format)
  const json = toProtocolJSON(node);

  // Validate incoming JSON
  const errors = validateProtocolJSON(json);
  if (errors.length === 0) {
    // Deserialize
    const restored = fromProtocolJSON(json);
  }
}
```

## Schema validation

```typescript
import { defineCommand, defineRole, parseExplicit } from '@lokascript/intent';

const toggleCommand = defineCommand('toggle', {
  patient: defineRole('patient', { required: true, types: ['selector', 'reference'] }),
  on: defineRole('on', { required: false, types: ['literal'] }),
});

const result = parseExplicit('[toggle patient:.active on:click]', {
  schema: toggleCommand,
});
```

## Protocol envelope

```typescript
import { toEnvelopeJSON, fromEnvelopeJSON } from '@lokascript/intent';

// Wrap a node in a versioned envelope for transport
const envelope = toEnvelopeJSON(node, { version: '1.2', source: 'my-dsl' });
const { node: restored } = fromEnvelopeJSON(envelope);
```

## Zero dependencies

This package has no runtime dependencies. It is designed to be embedded in any ecosystem — Alpine.js, React, Vue, Svelte, vanilla JS, or server-side tooling — without imposing transitive dependencies.

## License

MIT

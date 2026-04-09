# @lokascript/intent

> **Universal UI intent protocol** — LSE types, bracket syntax, and protocol JSON. Zero dependencies.

LSE (LokaScript Explicit Syntax) is a language-agnostic intermediate representation for UI interactions. `@lokascript/intent` provides the core types, parsers, renderers, and wire-format serialization that any ecosystem can adopt without pulling in the full multilingual hyperscript infrastructure.

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

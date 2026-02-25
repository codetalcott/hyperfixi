# Wire Format

LSE has two JSON representations. Both serialize the same semantic content; they differ in fidelity and verbosity.

## Full-Fidelity Format

Lossless round-trip between parse and render. Used for tool-to-tool interchange.

### Command Node

```json
{
  "kind": "command",
  "action": "toggle",
  "roles": {
    "patient": { "type": "selector", "value": ".active" },
    "destination": { "type": "selector", "value": "#button" }
  }
}
```

### Event Handler Node

```json
{
  "kind": "event-handler",
  "action": "on",
  "roles": {
    "event": { "type": "literal", "value": "click", "dataType": "string" }
  },
  "body": [
    {
      "kind": "command",
      "action": "toggle",
      "roles": {
        "patient": { "type": "selector", "value": ".active" }
      }
    }
  ]
}
```

### Compound Node

```json
{
  "kind": "compound",
  "action": "compound",
  "chainType": "then",
  "statements": [
    {
      "kind": "command",
      "action": "add",
      "roles": { "patient": { "type": "selector", "value": ".loading" } }
    },
    {
      "kind": "command",
      "action": "fetch",
      "roles": { "source": { "type": "literal", "value": "/api/data", "dataType": "string" } }
    }
  ]
}
```

### Value Shapes

| Type               | JSON Shape                                                            | Example                                               |
| ------------------ | --------------------------------------------------------------------- | ----------------------------------------------------- |
| selector           | `{ "type": "selector", "value": ".active" }`                          | `#id`, `.class`, `[attr]`, `@aria`, `*wild`           |
| selector (v1.1)    | `{ "type": "selector", "value": ".active", "selectorKind": "class" }` | Optional kind: id, class, attribute, element, complex |
| literal (string)   | `{ "type": "literal", "value": "hello", "dataType": "string" }`       | Quoted or fallback strings                            |
| literal (number)   | `{ "type": "literal", "value": 42, "dataType": "number" }`            | Integer or decimal                                    |
| literal (boolean)  | `{ "type": "literal", "value": true, "dataType": "boolean" }`         | `true` / `false`                                      |
| literal (duration) | `{ "type": "literal", "value": "500ms", "dataType": "duration" }`     | Number + suffix                                       |
| reference          | `{ "type": "reference", "value": "me" }`                              | Built-in names                                        |
| expression         | `{ "type": "expression", "raw": "[nested cmd]" }`                     | Nested syntax or raw expressions                      |
| flag (enabled)     | `{ "type": "flag", "name": "primary-key", "enabled": true }`          | `+flag`                                               |
| flag (disabled)    | `{ "type": "flag", "name": "nullable", "enabled": false }`            | `~flag`                                               |

> **Note (v1.1):** `selectorKind` is optional on selector values and may be omitted. The `enabled` field on flag values is **required** and MUST be present in all conformant implementations.

### Conditional Node (v1.1)

A command node with optional `thenBranch` and `elseBranch` arrays encodes conditional logic losslessly:

```json
{
  "kind": "command",
  "action": "if",
  "roles": {
    "condition": { "type": "expression", "raw": "x > 0" }
  },
  "thenBranch": [
    {
      "kind": "command",
      "action": "toggle",
      "roles": { "patient": { "type": "selector", "value": ".active" } }
    }
  ],
  "elseBranch": [
    {
      "kind": "command",
      "action": "remove",
      "roles": { "patient": { "type": "selector", "value": ".active" } }
    }
  ]
}
```

### Loop Node (v1.1)

A command node with `loopVariant`, `loopBody`, and optional `loopVariable`/`indexVariable` encodes loops losslessly. Five variants are supported: `forever`, `times`, `for`, `while`, `until`.

```json
{
  "kind": "command",
  "action": "repeat",
  "roles": {
    "source": { "type": "selector", "value": "#items" }
  },
  "loopVariant": "for",
  "loopBody": [
    {
      "kind": "command",
      "action": "add",
      "roles": { "patient": { "type": "selector", "value": ".active" } }
    }
  ],
  "loopVariable": "item"
}
```

### Diagnostics (v1.2)

An optional `diagnostics` array on command nodes carries type constraint validation results. Diagnostics are produced when a role value doesn't match the command schema's `expectedTypes` or `selectorKinds` constraints.

```json
{
  "kind": "command",
  "action": "toggle",
  "roles": {
    "patient": { "type": "selector", "value": "#button", "selectorKind": "id" }
  },
  "diagnostics": [
    {
      "level": "error",
      "role": "patient",
      "message": "toggle.patient expects selector kind [class, attribute], got 'id'",
      "code": "SCHEMA_SELECTOR_KIND_MISMATCH"
    }
  ]
}
```

Diagnostics are informational — they don't prevent the node from being transmitted. Consumers MAY use diagnostics for IDE integration (red squiggles), build warnings, or LLM feedback.

### Annotations (v1.2)

An optional `annotations` array on any node type attaches metadata. Annotations are non-semantic — they don't affect command meaning and parsers MUST preserve them but MAY ignore unknown names.

```json
{
  "kind": "command",
  "action": "fetch",
  "roles": {
    "source": { "type": "literal", "value": "/api/users", "dataType": "string" }
  },
  "annotations": [
    { "name": "timeout", "value": "5s" },
    { "name": "retry", "value": "3" }
  ]
}
```

Annotations with no argument omit the `value` field:

```json
{
  "kind": "command",
  "action": "toggle",
  "roles": { "patient": { "type": "selector", "value": ".active" } },
  "annotations": [{ "name": "deprecated" }]
}
```

Annotation order is preserved — order matters for middleware-like composition (e.g., `@retry` before `@timeout` means retry each attempt before timing out the whole sequence).

### Versioned Envelope (v1.2)

A versioned envelope wraps multiple nodes with protocol metadata:

```json
{
  "lseVersion": "1.2",
  "features": ["diagnostics", "version-header"],
  "nodes": [
    { "kind": "command", "action": "toggle", "roles": { ... } },
    { "kind": "command", "action": "add", "roles": { ... } }
  ]
}
```

The envelope is optional. Single-node documents MAY use the bare `SemanticNode` format (backward-compatible with v1.0/v1.1). The envelope is recommended when:

- The document contains multiple top-level nodes
- The producer wants to declare which LSE version and features are in use
- Feature detection is needed by the consumer

### Node Shape

```typescript
interface SemanticNodeJSON {
  kind: 'command' | 'event-handler' | 'compound';
  action: string;
  roles: Record<string, SemanticValueJSON>;
  // event-handler only:
  body?: SemanticNodeJSON[];
  // compound only:
  statements?: SemanticNodeJSON[];
  chainType?: 'then' | 'and' | 'async' | 'sequential';
  // conditional (v1.1, command nodes only):
  thenBranch?: SemanticNodeJSON[];
  elseBranch?: SemanticNodeJSON[];
  // loop (v1.1, command nodes only):
  loopVariant?: 'forever' | 'times' | 'for' | 'while' | 'until';
  loopBody?: SemanticNodeJSON[];
  loopVariable?: string;
  indexVariable?: string;
  // type constraint diagnostics (v1.2, command nodes only):
  diagnostics?: DiagnosticJSON[];
  // metadata annotations (v1.2, all node kinds):
  annotations?: AnnotationJSON[];
}

interface DiagnosticJSON {
  level: 'error' | 'warning';
  role: string;
  message: string;
  code: string;
}

interface AnnotationJSON {
  name: string;
  value?: string;
}

interface LSEEnvelopeJSON {
  lseVersion: string;
  features?: string[];
  nodes: SemanticNodeJSON[];
}
```

## LLM-Simplified Format

Compact format optimized for LLM generation. Omits `kind` and uses a flat `trigger` field for event handlers.

### Command

```json
{
  "action": "toggle",
  "roles": {
    "patient": { "type": "selector", "value": ".active" }
  }
}
```

### Event Handler

```json
{
  "action": "toggle",
  "roles": {
    "patient": { "type": "selector", "value": ".active" }
  },
  "trigger": {
    "event": "click",
    "modifiers": {}
  }
}
```

### Differences from Full-Fidelity

| Aspect            | Full-Fidelity                                      | LLM-Simplified                             |
| ----------------- | -------------------------------------------------- | ------------------------------------------ |
| `kind` field      | Required                                           | Absent                                     |
| Event handlers    | Separate `event-handler` kind with `body`          | `trigger` field wraps a command            |
| Compound          | `statements` array                                 | Not supported (single commands only)       |
| Expression values | `{ "type": "expression", "raw": "..." }`           | `{ "type": "expression", "value": "..." }` |
| Flag values       | `{ "type": "flag", "name": "x", "enabled": true }` | `{ "type": "flag", "value": true }`        |

### When to Use Which

- **Full-fidelity**: Tool-to-tool interchange, round-trip testing, storage
- **LLM-simplified**: LLM code generation, API responses, lightweight clients

Both formats MUST be accepted by conformant parsers. Conformant renderers MUST produce the full-fidelity format by default.

## JSON Schema

A machine-checkable JSON Schema (Draft 7) for the full-fidelity format is available at:

```text
protocol/spec/lse-wire-format.schema.json
```

The schema enforces:

- Exactly 3 node kinds (`command`, `event-handler`, `compound`)
- All 6 value types with required fields (`name`+`enabled` for flags, `raw` for expressions)
- `additionalProperties: false` on value types
- Optional v1.1 fields on command nodes: `thenBranch`, `elseBranch`, `loopVariant`, `loopBody`, `loopVariable`, `indexVariable`, `selectorKind`

## TypeScript Extensions (TS-Layer Only)

The TypeScript framework (`packages/framework`) extends the internal AST with additional
node kinds and value fields. These are losslessly encoded in the wire format (v1.1).

| TS feature                        | Wire format handling                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| `kind: 'conditional'`             | Lossless: encoded as `command` with `thenBranch`/`elseBranch` arrays     |
| `kind: 'loop'`                    | Lossless: encoded as `command` with `loopVariant`/`loopBody`/etc. fields |
| `selectorKind` on `SelectorValue` | Preserved as optional field (v1.1)                                       |
| `roles: ReadonlyMap`              | Converted to `Record<string, ...>`                                       |
| `property-path` value             | Flattened to `expression` via `extractValue()`                           |

Use `toProtocolJSON()` from `@lokascript/framework/ir` to serialize with these rules applied:

```typescript
import { toProtocolJSON, fromProtocolJSON } from '@lokascript/framework/ir';

// Serialize TS SemanticNode → protocol wire format
const wireJSON = toProtocolJSON(semanticNode);

// Deserialize protocol wire format → TS SemanticNode
// Detects v1.1 fields and reconstructs conditional/loop nodes
const node = fromProtocolJSON(wireJSON);
```

`fromProtocolJSON()` detects v1.1 fields (`thenBranch`, `loopVariant`) on command nodes
and reconstructs `conditional` and `loop` node kinds using `createConditionalNode()` and
`createLoopNode()` respectively.

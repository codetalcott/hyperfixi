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

### Pipe Chain (v1.2)

The `|>` operator creates a compound node with `chainType: "pipe"`. It explicitly threads the output of the left command into the `patient` role of the right command (or `source` if `patient` is already present):

```json
{
  "kind": "compound",
  "action": "compound",
  "chainType": "pipe",
  "statements": [
    {
      "kind": "command",
      "action": "fetch",
      "roles": { "source": { "type": "literal", "value": "/api/users", "dataType": "string" } }
    },
    {
      "kind": "command",
      "action": "filter",
      "roles": { "condition": { "type": "expression", "raw": "role == 'admin'" } }
    },
    {
      "kind": "command",
      "action": "put",
      "roles": { "destination": { "type": "selector", "value": "#user-list" } }
    }
  ]
}
```

**Pipe semantics:**

- `|>` desugars to `then` with an implicit `patient:result` on the right command
- If the right command already has `patient`, feeds into `source` instead
- If both `patient` and `source` are present, `|>` is a parse error (ambiguous)

### Match Command (v1.2)

A `match` command node carries `arms` (ordered array of pattern→body pairs) and an optional `defaultArm` catch-all:

```json
{
  "kind": "command",
  "action": "match",
  "roles": {
    "patient": { "type": "reference", "value": "result" }
  },
  "arms": [
    {
      "pattern": { "type": "literal", "value": "200", "dataType": "string" },
      "body": [
        {
          "kind": "command",
          "action": "put",
          "roles": {
            "patient": { "type": "reference", "value": "body" },
            "destination": { "type": "selector", "value": "#result" }
          }
        }
      ]
    },
    {
      "pattern": { "type": "literal", "value": "404", "dataType": "string" },
      "body": [
        {
          "kind": "command",
          "action": "show",
          "roles": { "patient": { "type": "selector", "value": "#not-found" } }
        }
      ]
    }
  ],
  "defaultArm": [
    {
      "kind": "command",
      "action": "log",
      "roles": { "patient": { "type": "reference", "value": "result" } }
    }
  ]
}
```

- `arms` are checked in order; first match wins
- `defaultArm` is optional; without it, a non-matching value is a no-op
- No implicit fallthrough between arms
- v1.2 supports literal patterns only; guard clauses and range patterns are deferred

### Error Handling Node (v1.2)

A `try` command node uses `body` (in roles), `catchBranch`, and `finallyBranch` arrays — the same structural-field pattern as `if`/`else` and `repeat`/`loopBody`:

```json
{
  "kind": "command",
  "action": "try",
  "roles": {},
  "body": [
    {
      "kind": "command",
      "action": "fetch",
      "roles": { "source": { "type": "literal", "value": "/api/users", "dataType": "string" } }
    }
  ],
  "catchBranch": [
    {
      "kind": "command",
      "action": "show",
      "roles": { "patient": { "type": "selector", "value": "#error-message" } }
    }
  ],
  "finallyBranch": [
    {
      "kind": "command",
      "action": "remove",
      "roles": { "patient": { "type": "selector", "value": ".loading" } }
    }
  ]
}
```

`catchBranch` and `finallyBranch` are both optional. A `try` with only `finallyBranch` (no `catchBranch`) is valid for guaranteed cleanup.

### Async Coordination Node (v1.2)

`all` and `race` command nodes use `asyncVariant` and `asyncBody` — the body commands run concurrently:

```json
{
  "kind": "command",
  "action": "all",
  "roles": {},
  "asyncVariant": "all",
  "asyncBody": [
    {
      "kind": "command",
      "action": "fetch",
      "roles": { "source": { "type": "literal", "value": "/api/user", "dataType": "string" } }
    },
    {
      "kind": "command",
      "action": "fetch",
      "roles": { "source": { "type": "literal", "value": "/api/prefs", "dataType": "string" } }
    }
  ]
}
```

- **`all`**: Resolves when all body commands complete. Result is an array. If any fails, the whole `all` fails.
- **`race`**: Resolves with the first to complete. Remaining commands are cancelled.

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
  kind?: 'command' | 'event-handler' | 'compound'; // defaults to "command"
  action: string;
  roles: Record<string, SemanticValueJSON>;
  // convenience sugar: wraps command in event handler
  trigger?: { event: string; modifiers?: Record<string, unknown> };
  // event-handler only:
  body?: SemanticNodeJSON[];
  // compound only:
  statements?: SemanticNodeJSON[];
  chainType?: 'then' | 'and' | 'async' | 'sequential' | 'pipe';
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
  // error handling (v1.2, command nodes only):
  catchBranch?: SemanticNodeJSON[];
  finallyBranch?: SemanticNodeJSON[];
  // async coordination (v1.2, command nodes only):
  asyncVariant?: 'all' | 'race';
  asyncBody?: SemanticNodeJSON[];
  // pattern matching (v1.2, command nodes only):
  arms?: MatchArmJSON[];
  defaultArm?: SemanticNodeJSON[];
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

interface MatchArmJSON {
  pattern: SemanticValueJSON;
  body: SemanticNodeJSON[];
}

interface LSEEnvelopeJSON {
  lseVersion: string;
  features?: string[];
  nodes: SemanticNodeJSON[];
}
```

## Optional Fields and Convenience Sugar

### Optional `kind`

The `kind` field defaults to `"command"` when absent. This allows compact single-command
representations without boilerplate:

```json
{
  "action": "toggle",
  "roles": {
    "patient": { "type": "selector", "value": ".active" }
  }
}
```

This is equivalent to `{ "kind": "command", "action": "toggle", ... }`.

Event handler (`kind: "event-handler"`) and compound (`kind: "compound"`) nodes still
require explicit `kind` since they have distinct structural requirements (`body` and
`statements` arrays, respectively).

### `trigger` Sugar

The `trigger` field is convenience sugar that wraps a command in an event handler.
When `trigger` is present, the node is treated as an event handler regardless of `kind`:

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

This is equivalent to:

```json
{
  "kind": "event-handler",
  "action": "on",
  "roles": { "event": { "type": "literal", "value": "click" } },
  "body": [
    {
      "kind": "command",
      "action": "toggle",
      "roles": { "patient": { "type": "selector", "value": ".active" } }
    }
  ]
}
```

### Value Shorthand Forms

Expression and flag values accept shorthand forms for convenience:

| Value type | Full form                                          | Shorthand form                               |
| ---------- | -------------------------------------------------- | -------------------------------------------- |
| Expression | `{ "type": "expression", "raw": "x + 1" }`         | `{ "type": "expression", "value": "x + 1" }` |
| Flag       | `{ "type": "flag", "name": "x", "enabled": true }` | `{ "type": "flag", "value": true }`          |

Conformant parsers MUST accept both forms. Conformant renderers SHOULD produce the full form by default.

## JSON Schema

A machine-checkable JSON Schema (Draft 7) for the protocol JSON format is available at:

```text
protocol/spec/lse-wire-format.schema.json
```

The schema enforces:

- 3 node kinds (`command`, `event-handler`, `compound`) — `kind` optional on commands (defaults to `"command"`)
- All 6 value types with full or shorthand forms (expressions accept `raw` or `value`; flags accept `name`+`enabled` or `value`)
- `trigger` convenience sugar on command nodes
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

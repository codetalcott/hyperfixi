# Wire Format

> **LSE 3.0.** The format carries commands and simple handlers. Version 3.0 removed the constructs
> that had no producer: `try` (`catchBranch`, `finallyBranch`), `all`/`race` (`asyncVariant`,
> `asyncBody`), `match` (`arms`, `defaultArm`), pipe chains (`chainType: "pipe"`) and the versioned
> envelope. `fromProtocolJSON` refuses a node that has one of them and `validateProtocolJSON`
> reports it (`REMOVED_IN_LSE_3`): read as if absent, they would be a silent loss.

LSE has two JSON representations. Both serialize the same semantic content; they differ in fidelity and verbosity.

## Full-Fidelity Format

Lossless round-trip between parse and render, for the nodes it has fields for. Used for tool-to-tool interchange.

> **What it does not carry.** The format has three node kinds and the fields below. A parser's
> other kinds (`feature`, `def`, `behavior`) and clauses (an event handler's `from` or `every`
> modifier, its `catch` block, a selector's `in` scope) have no place in it, and `toProtocolJSON`
> refuses such a node with a `LossyEncodingError` (`{ lossy: 'allow' }` returns the partial
> encoding). Counts and the full list: [What LSE cannot carry](../README.md#what-lse-cannot-carry).

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

| Type               | JSON Shape                                                              | Example                                               |
| ------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| selector           | `{ "type": "selector", "value": ".active" }`                            | `#id`, `.class`, `[attr]`, `@aria`, `*wild`           |
| selector (v1.1)    | `{ "type": "selector", "value": ".active", "selectorKind": "class" }`   | Optional kind: id, class, attribute, element, complex |
| selector (v2.0)    | `{ "type": "selector", "value": "ul > li", "selectorKind": "complex" }` | Bracket syntax `<ul > li/>`; delimiters are stripped  |
| literal (string)   | `{ "type": "literal", "value": "hello", "dataType": "string" }`         | A quoted string; a bare one has no `dataType`         |
| literal (number)   | `{ "type": "literal", "value": 42, "dataType": "number" }`              | Integer or decimal                                    |
| literal (boolean)  | `{ "type": "literal", "value": true, "dataType": "boolean" }`           | `true` / `false`                                      |
| literal (duration) | `{ "type": "literal", "value": "500ms", "dataType": "duration" }`       | Number + suffix                                       |
| reference          | `{ "type": "reference", "value": "me" }`                                | Built-in names                                        |
| expression         | `{ "type": "expression", "raw": "[nested cmd]" }`                       | Nested syntax or raw expressions                      |
| flag (enabled)     | `{ "type": "flag", "name": "primary-key", "enabled": true }`            | `+flag`                                               |
| flag (disabled)    | `{ "type": "flag", "name": "nullable", "enabled": false }`              | `~flag`                                               |

A **property path** is written as itself, its owner a value of any type:

```json
{
  "type": "property-path",
  "object": { "type": "selector", "value": "#input", "selectorKind": "id" },
  "property": "value",
  "access": "possessive"
}
```

`access` (`dot` or `possessive`, optional) is the spelling that was read: `#input.value` or
`#input's value`. The older shape, the whole path as one string under `value`, is still read, as an
expression. Until 3.0's last revision a writer flattened a path to an expression (`#input.value`);
for a style or an attribute that was text no reader takes (`me.@bar`, `#d2.*color`).

**Marks.** Three optional fields say how a value was written. A renderer reads each, so an encoding
that drops one changes the script:

| Field          | On        | Meaning                                                                                                                                            |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implicit`     | any value | The parser supplied it from the command's default (`remove #x` has the source `me`). It is not written back: without the mark, `remove #x from me` |
| `quoted`       | a literal | Written in quotes where a bare word was possible (`send "a-b"`). Written back in quotes                                                            |
| `interpolates` | a literal | A naked `${…}` URL. Written back naked: quoted, it would not interpolate                                                                           |

Each is `true` or absent. Bracket syntax has no field for them: its writer leaves an implicit reference out
(`[toggle patient:.active]`) and quotes every string, quoted by the author or not.

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

### Node Shape

```typescript
// `@lokascript/intent` exports these as ProtocolCommandJSON, ProtocolEventHandlerJSON,
// ProtocolCompoundJSON and their union ProtocolNodeJSON. A field on the wrong kind is a type error.
type SemanticNodeJSON = CommandJSON | EventHandlerJSON | CompoundJSON;

interface NodeBaseJSON {
  action: string;
  diagnostics?: DiagnosticJSON[]; // type-constraint results (v1.2)
  annotations?: AnnotationJSON[]; // metadata (v1.2)
}

interface CommandJSON extends NodeBaseJSON {
  kind?: 'command'; // the default
  roles: Record<string, SemanticValueJSON>;
  // convenience sugar: a handler around this one command
  trigger?: { event: string; modifiers?: Record<string, unknown> };
  // a block command's commands (`tell`):
  body?: SemanticNodeJSON[];
  // conditional (v1.1):
  thenBranch?: SemanticNodeJSON[];
  elseBranch?: SemanticNodeJSON[];
  // loop (v1.1):
  loopVariant?: 'forever' | 'times' | 'for' | 'while' | 'until';
  loopBody?: SemanticNodeJSON[];
  loopVariable?: string;
  indexVariable?: string;
}

interface EventHandlerJSON extends NodeBaseJSON {
  kind: 'event-handler';
  roles: Record<string, SemanticValueJSON>; // the event
  body: SemanticNodeJSON[];
}

interface CompoundJSON extends NodeBaseJSON {
  kind: 'compound';
  statements: SemanticNodeJSON[];
  chainType?: 'then' | 'and' | 'async' | 'sequential';
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

| TS feature                           | Wire format handling                                                     |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `kind: 'conditional'`                | Lossless: encoded as `command` with `thenBranch`/`elseBranch` arrays     |
| `kind: 'loop'`                       | Lossless: encoded as `command` with `loopVariant`/`loopBody`/etc. fields |
| `selectorKind` on `SelectorValue`    | Preserved as optional field (v1.1)                                       |
| `roles: ReadonlyMap`                 | Converted to `Record<string, ...>`                                       |
| `property-path` value                | As itself: `object`, `property`, `access` (see Value Shapes)             |
| `implicit`, `quoted`, `interpolates` | Carried as optional `true` fields on the value                           |

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

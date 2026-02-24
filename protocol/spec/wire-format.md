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

| Type               | JSON Shape                                                        | Example                                     |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------- |
| selector           | `{ "type": "selector", "value": ".active" }`                      | `#id`, `.class`, `[attr]`, `@aria`, `*wild` |
| literal (string)   | `{ "type": "literal", "value": "hello", "dataType": "string" }`   | Quoted or fallback strings                  |
| literal (number)   | `{ "type": "literal", "value": 42, "dataType": "number" }`        | Integer or decimal                          |
| literal (boolean)  | `{ "type": "literal", "value": true, "dataType": "boolean" }`     | `true` / `false`                            |
| literal (duration) | `{ "type": "literal", "value": "500ms", "dataType": "duration" }` | Number + suffix                             |
| reference          | `{ "type": "reference", "value": "me" }`                          | Built-in names                              |
| expression         | `{ "type": "expression", "raw": "[nested cmd]" }`                 | Nested syntax or raw expressions            |
| flag (enabled)     | `{ "type": "flag", "name": "primary-key", "enabled": true }`      | `+flag`                                     |
| flag (disabled)    | `{ "type": "flag", "name": "nullable", "enabled": false }`        | `~flag`                                     |

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
- `additionalProperties: false` on value types (prevents TS-only fields like `selectorKind`)

## TypeScript Extensions (TS-Layer Only)

The TypeScript framework (`packages/framework`) extends the internal AST with additional
node kinds and value fields that do **not** appear in the wire format. These exist only
in-memory during processing within TypeScript code.

| TS-only feature                   | Wire format handling                                               |
| --------------------------------- | ------------------------------------------------------------------ |
| `kind: 'conditional'`             | Downgraded to `kind: 'command'`; `thenBranch`/`elseBranch` dropped |
| `kind: 'loop'`                    | Downgraded to `kind: 'command'`; `body`/`loopVariable` dropped     |
| `selectorKind` on `SelectorValue` | Stripped                                                           |
| `roles: ReadonlyMap`              | Converted to `Record<string, ...>`                                 |
| `property-path` value             | Flattened to `expression` via `extractValue()`                     |

Use `toProtocolJSON()` from `@lokascript/framework/ir` to serialize with these rules applied:

```typescript
import { toProtocolJSON, fromProtocolJSON } from '@lokascript/framework/ir';

// Serialize TS SemanticNode → protocol wire format
const wireJSON = toProtocolJSON(semanticNode);

// Deserialize protocol wire format → TS SemanticNode
const node = fromProtocolJSON(wireJSON);
```

The downgrades for `conditional` and `loop` are **lossy**: branch bodies are dropped.
`fromProtocolJSON()` never produces `conditional` or `loop` nodes — only the 3 protocol kinds.

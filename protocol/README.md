# LokaScript Explicit Syntax (LSE) Protocol

A formal specification and reference implementations for the LokaScript Explicit Syntax (LSE) — a language-agnostic, role-labeled format for imperative commands.

```
[toggle patient:.active destination:#button]
[select patient:name source:users condition:age>25]
[on event:click body:[toggle patient:.active]]
```

## What is LSE?

LSE is an intermediate representation based on semantic roles (case grammar). It eliminates word order, morphology, and prepositions — the aspects of natural language that vary across the world's languages — leaving only the universal semantic structure.

Any imperative command in any language can be represented as an action with named roles:

```
[action role1:value1 role2:value2 +flag ~negated-flag @annotation:metadata]
```

The core semantic roles:

| Role          | Meaning               | Example                     |
| ------------- | --------------------- | --------------------------- |
| `patient`     | What to act on        | `.active`, `#count`, `name` |
| `destination` | Where to put/target   | `#output`, `me`             |
| `source`      | Where to get from     | `#input`, `/api/data`       |
| `condition`   | Filter/guard          | `age>25`, `:count>0`        |
| `+flag`       | Boolean true          | `+primary-key`, `+async`    |
| `~flag`       | Boolean false/negated | `~nullable`                 |

LSE is used as the interchange format for [LokaScript](https://github.com/codetalcott/hyperfixi) — a multilingual hyperscript ecosystem supporting 24 natural languages. But LSE itself is language-independent and can be used by any tool that emits or consumes imperative commands.

## Contents

| Directory                        | Package                                    | Description                                            |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| [spec/](spec/)                   | —                                          | Formal ABNF grammar, wire format, streaming convention |
| [test-fixtures/](test-fixtures/) | `@lokascript/lse-conformance`              | 121 language-independent conformance test cases        |
| [typescript/](typescript/)       | `@lokascript/explicit-syntax`              | TypeScript reference parser                            |
| [python/](python/)               | `lokascript-explicit` (PyPI)               | Python reference parser                                |
| [go/](go/)                       | `github.com/lokascript/explicit-syntax-go` | Go reference parser                                    |
| [rust/](rust/)                   | `lokascript-explicit` (crates.io)          | Rust reference parser                                  |

## Quick Start

### TypeScript / JavaScript

```bash
npm install @lokascript/explicit-syntax
```

```typescript
import { parseExplicit, renderExplicit } from '@lokascript/explicit-syntax';

const node = parseExplicit('[toggle patient:.active destination:#button]');
console.log(node.action); // "toggle"
console.log(node.roles.patient.value); // ".active"

const text = renderExplicit(node);
console.log(text); // "[toggle patient:.active destination:#button]"
```

### Python

```bash
pip install lokascript-explicit
```

```python
from lokascript_explicit import parse_explicit, render_explicit

node = parse_explicit('[toggle patient:.active destination:#button]')
print(node.action)  # "toggle"
print(node.roles['patient'].value)  # ".active"

text = render_explicit(node)
print(text)  # "[toggle patient:.active destination:#button]"
```

### Go

```go
import lse "github.com/lokascript/explicit-syntax-go"

node, err := lse.ParseExplicit("[toggle patient:.active destination:#button]", nil)
fmt.Println(node.Action) // "toggle"
fmt.Println(node.Roles["patient"].StringValue()) // ".active"

text := lse.RenderExplicit(node)
fmt.Println(text) // "[toggle patient:.active destination:#button]"
```

### Rust

```rust
use lokascript_explicit::*;

let node = parse_explicit("[toggle patient:.active destination:#button]", None).unwrap();
assert_eq!(node.action, "toggle");

let rendered = render_explicit(&node);
// "[toggle patient:.active destination:#button]"
```

### CLI

```bash
echo '[toggle patient:.active]' | python -m lokascript_explicit parse
# {"kind": "command", "action": "toggle", "roles": {"patient": {"type": "selector", "value": ".active"}}}

echo '{"kind":"command","action":"toggle","roles":{"patient":{"type":"selector","value":".active"}}}' | python -m lokascript_explicit render
# [toggle patient:.active]
```

## Conformance Testing

Any LSE implementation can validate itself against the shared test fixtures:

```bash
npm install @lokascript/lse-conformance
```

```javascript
import { loadFixture, listFixtures } from '@lokascript/lse-conformance';

// See all fixture categories
console.log(listFixtures());
// ['annotations', 'async-coordination', 'basic', 'compound', 'conditionals', ...]

// Load a specific category
const basics = loadFixture('basic');
for (const test of basics) {
  const result = yourParser(test.input);
  assert(result.action === test.expected.action);
}
```

The JSON fixture format works with any language — no npm required:

```json
{
  "id": "basic-001",
  "description": "Toggle with class selector",
  "input": "[toggle patient:.active]",
  "expected": {
    "kind": "command",
    "action": "toggle",
    "roles": {
      "patient": { "type": "selector", "value": ".active" }
    }
  }
}
```

## Emitting LSE from Your Tool

If you're building a tool (DSL compiler, LLM agent, code generator) that produces behavioral commands, emit LSE for maximum interoperability:

1. **Format**: `[action role:value ...]` — brackets required, action first, then space-separated `role:value` pairs
2. **Roles**: Use standard semantic roles (`patient`, `destination`, `source`, `condition`, `instrument`, `quantity`)
3. **Values**: Selectors (`.class`, `#id`), literals (`'string'`, `42`, `true`), references (`me`, `it`, `result`)
4. **Flags**: `+flag` for boolean true, `~flag` for negated
5. **Nesting**: `body:[...]` for event handlers, conditionals, loops
6. **Validation**: Use the [ABNF grammar](spec/lokascript-explicit-syntax.abnf) or [JSON Schema](spec/lse-wire-format.schema.json)

Example for an LLM system prompt:

```text
When generating UI behavior, emit LSE bracket syntax:
  [toggle patient:.active destination:#menu]
  [on event:click body:[add patient:.highlight destination:me]]
  [fetch source:/api/users destination:#user-list]
```

See [spec/wire-format.md](spec/wire-format.md) for the JSON wire format (for structured tool output).

## Specification

- [ABNF Grammar](spec/lokascript-explicit-syntax.abnf) — formal syntax definition (v1.2.0)
- [Wire Format](spec/wire-format.md) — JSON representation for APIs and LLM tool use
- [JSON Schema](spec/lse-wire-format.schema.json) — machine-readable schema for validation
- [Streaming Convention](spec/streaming.md) — conventions for streaming LSE over WebSocket/SSE

## Spec Version

1.2.0

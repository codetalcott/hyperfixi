# LokaScript Explicit Syntax (LSE) Protocol

A formal specification and reference implementations for the LokaScript Explicit Syntax (LSE) — a language-agnostic, role-labeled format for imperative commands.

```text
[toggle patient:.active destination:#button]
[select patient:name source:users condition:age>25]
[on event:click body:[toggle patient:.active]]
```

## Who this is for

LSE serves five distinct audiences. Find yours to know where to read next.

### LLMs (or engineers prompting LLMs) generating UI behavior

**Use:** bracket syntax (`[toggle patient:.active]`). It's compact, schema-validated, and roughly a third the token cost of equivalent JSON.

**If your LLM is constrained to JSON output** (function-calling APIs, structured-output endpoints): use the LLM-simplified JSON form — same semantics, encoded as JSON. See [docs/llm-guide.md](docs/llm-guide.md) for both formats and when to use which.

### Tool authors doing tool-to-tool interchange

**Use:** the full-fidelity JSON wire format. Lossless round-trip, typed, machine-oriented. See [spec/wire-format.md](spec/wire-format.md) and the [JSON Schema](spec/lse-wire-format.schema.json).

Do not hand-write bracket syntax in your tool. Parse bracket syntax only if you need to accept user/LLM input in that form.

### Humans writing behavior code

**Don't use LSE directly.** Write in your native DSL (hyperscript, SQL, a domain DSL, etc.). LSE is the _underlying_ representation — you write in a higher-level surface syntax and the DSL produces LSE for you.

Hand-writing `[toggle patient:.active destination:#button]` in a codebase is an anti-pattern. Use `toggle .active on #button` (hyperscript) or whatever your DSL's native syntax is.

### DSL authors building a new imperative DSL on LSE

**Start here:**

1. Read "[What is LSE?](#what-is-lse)" below to understand the two-layer model
2. Pick or design a vocabulary — see [docs/vocabularies.md](docs/vocabularies.md) for the catalog of existing ones and [docs/defining-vocabularies.md](docs/defining-vocabularies.md) for guidance on reusing vs. inventing role names
3. Use one of the four reference parsers (or `createMultilingualDSL()` from `@lokascript/framework` if you're building on the hyperfixi stack)
4. Validate against the conformance fixtures in [test-fixtures/](test-fixtures/)

### Cross-language parser implementers / spec contributors

**Read:** the ABNF grammar ([spec/lokascript-explicit-syntax.abnf](spec/lokascript-explicit-syntax.abnf)), wire format ([spec/wire-format.md](spec/wire-format.md)), and conformance fixtures ([test-fixtures/](test-fixtures/)). Look at the four existing implementations ([typescript/](typescript/), [python/](python/), [go/](go/), [rust/](rust/)) for reference patterns.

## What is LSE?

LSE is a **two-layer protocol** for representing imperative commands.

**Layer A — Universal infrastructure.** A formal grammar, JSON wire format, and tree structure that work across any imperative command DSL. Every LSE implementation supports this layer, and every LSE-conformant document uses it. Layer A is fully specified, versioned, and conformance-tested across four reference parsers (TypeScript, Python, Go, Rust).

**Layer B — Pluggable domain vocabularies.** A set of action and role names that describe a specific domain. Different DSLs use different vocabularies. The UI-behavior vocabulary (derived from Fillmore's case grammar) is the reference vocabulary used by the hyperscript DSL, but it is not the only vocabulary and LSE does not require it. SQL DSLs use a SQL vocabulary. JSX DSLs use a JSX vocabulary. BDD DSLs use a testing vocabulary. All of them share Layer A.

### Example

The same Layer A infrastructure carries different Layer B vocabularies:

```text
[toggle patient:.active destination:#button]       # UI-behavior (hyperscript)
[select columns:name source:users]                  # SQL
[element tag:div props:className]                   # JSX
[given target:#button state:exists]                 # BDD
```

All four parse via the same grammar, serialize to the same wire format, and pass the same structural validation. They differ only in which role names they use.

### Which layer does what?

- **Layer A handles:** bracket grammar, tokenization, node kinds (command, event-handler, conditional, compound, loop), value types (selector, literal, reference, property-path, expression, flag), JSON wire format, streaming convention. These are universal.
- **Layer B defines:** the action names your DSL recognizes (`toggle`, `select`, `element`, `given`, ...) and the role names those actions take (`patient`, `columns`, `tag`, `target`, ...). These are per-domain.

### Which vocabulary should I use?

- **Building a UI-behavior DSL?** Use the UI-behavior vocabulary (`patient`, `destination`, `source`, `condition`, etc.). This is the vocabulary used by hyperscript and a natural fit for imperative commands that describe actions on UI elements. See [docs/vocabularies.md](docs/vocabularies.md) for the full role list.
- **Building a DSL for another domain?** Reuse existing role names where the semantic is genuinely the same (e.g., `condition` for a filter, `destination` for a target). Invent new role names where the existing vocabulary doesn't fit (e.g., `columns` for SQL, `tag` for JSX). See [docs/vocabularies.md](docs/vocabularies.md) for examples from SQL, JSX, and BDD.
- **Not sure if LSE is for you?** LSE is designed for imperative command DSLs — DSLs that describe "do X" rather than "X is Y." If your DSL is declarative (a data description language, a configuration format, a type system), LSE is probably not the right fit.

LSE is used as the interchange format for [LokaScript](https://github.com/codetalcott/hyperfixi) — a multilingual hyperscript ecosystem supporting 24 natural languages. Layer A of LSE is language-independent and reused across 9 in-repo DSLs.

## Contents

> **Status:** The four reference parsers and the conformance fixtures live in this repository as in-repo implementations. They are **not currently published** to npm, PyPI, or crates.io. To use them, clone this repository and work from source (see "Building from source" below). A publishing decision is tracked separately.

| Directory                        | Package name                  | Status          | Description                                            |
| -------------------------------- | ----------------------------- | --------------- | ------------------------------------------------------ |
| [spec/](spec/)                   | —                             | —               | Formal ABNF grammar, wire format, streaming convention |
| [test-fixtures/](test-fixtures/) | `@lokascript/lse-conformance` | in-repo, v1.2.0 | 121 language-independent conformance test cases        |
| [typescript/](typescript/)       | `@lokascript/explicit-syntax` | in-repo, v1.2.0 | TypeScript reference parser                            |
| [python/](python/)               | `lokascript-explicit`         | in-repo, v1.2.0 | Python reference parser                                |
| [go/](go/)                       | (in-repo, see note)           | in-repo         | Go reference parser                                    |
| [rust/](rust/)                   | `lokascript-explicit`         | in-repo, v1.2.0 | Rust reference parser                                  |

> **Go module note:** the Go `go.mod` declares the module path `github.com/lokascript/explicit-syntax-go`, but the code lives at `github.com/codetalcott/hyperfixi/protocol/go`. This path mismatch will be corrected when the protocol reaches a publishing decision.

## Building from source

The reference implementations are not yet published to package registries. To use them, clone this repository and build from source.

### TypeScript / JavaScript

```bash
git clone https://github.com/codetalcott/hyperfixi
cd hyperfixi/protocol/typescript
npm install
npm run build
```

```typescript
// In a project that links to the built package:
import { parseExplicit, renderExplicit } from '@lokascript/explicit-syntax';

const node = parseExplicit('[toggle patient:.active destination:#button]');
console.log(node.action); // "toggle"
console.log(node.roles.patient.value); // ".active"

const text = renderExplicit(node);
console.log(text); // "[toggle patient:.active destination:#button]"
```

### Python

```bash
git clone https://github.com/codetalcott/hyperfixi
cd hyperfixi/protocol/python
pip install -e .
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
// Local replace directive in your go.mod until the module is published:
//   replace github.com/lokascript/explicit-syntax-go => /path/to/hyperfixi/protocol/go

import lse "github.com/lokascript/explicit-syntax-go"

node, err := lse.ParseExplicit("[toggle patient:.active destination:#button]", nil)
fmt.Println(node.Action) // "toggle"
fmt.Println(node.Roles["patient"].StringValue()) // ".active"

text := lse.RenderExplicit(node)
fmt.Println(text) // "[toggle patient:.active destination:#button]"
```

### Rust

```bash
git clone https://github.com/codetalcott/hyperfixi
# Add to your Cargo.toml:
#   lokascript-explicit = { path = "/path/to/hyperfixi/protocol/rust" }
```

```rust
use lokascript_explicit::*;

let node = parse_explicit("[toggle patient:.active destination:#button]", None).unwrap();
assert_eq!(node.action, "toggle");

let rendered = render_explicit(&node);
// "[toggle patient:.active destination:#button]"
```

### CLI

```bash
# After installing the Python package from source:
echo '[toggle patient:.active]' | python -m lokascript_explicit parse
# {"kind": "command", "action": "toggle", "roles": {"patient": {"type": "selector", "value": ".active"}}}

echo '{"kind":"command","action":"toggle","roles":{"patient":{"type":"selector","value":".active"}}}' | python -m lokascript_explicit render
# [toggle patient:.active]
```

## Conformance Testing

Any LSE implementation can validate itself against the shared test fixtures. The fixtures are not yet published; use them directly from this repository.

```bash
git clone https://github.com/codetalcott/hyperfixi
# Fixtures are at hyperfixi/protocol/test-fixtures/*.json
```

```javascript
// In-repo index helper (protocol/test-fixtures/index.js):
import { loadFixture, listFixtures } from '../test-fixtures/index.js';

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

# LokaScript Explicit Syntax Protocol

A formal specification and reference implementations for the LokaScript Explicit Syntax (LSE) — a language-agnostic, role-labeled format for imperative commands.

```
[toggle patient:.active destination:#button]
[select patient:name source:users condition:age>25]
[column name:id type:uuid +primary-key +not-null]
```

## What is LSE?

LSE is an intermediate representation based on semantic roles (case grammar). It eliminates word order, morphology, and prepositions — the aspects of natural language that vary across the world's languages — leaving only the universal semantic structure.

Every imperative command has an action and named roles:

- **patient** — what to act on
- **destination** — where to put/target
- **source** — where to get from
- `+flag` / `~flag` — boolean attributes

## Contents

| Directory                        | Description                                            |
| -------------------------------- | ------------------------------------------------------ |
| [spec/](spec/)                   | Formal ABNF grammar, wire format, streaming convention |
| [test-fixtures/](test-fixtures/) | Language-independent conformance test cases            |
| [python/](python/)               | Python reference parser (pip-installable)              |
| [go/](go/)                       | Go reference parser                                    |
| [rust/](rust/)                   | Rust reference parser (crate)                          |

## Quick Start

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

## Spec Version

1.0.0

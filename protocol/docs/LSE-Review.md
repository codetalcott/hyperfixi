# LSE Protocol Consistency Report

**Overall verdict:** Implementations are highly consistent across Go/Python/Rust, with the TypeScript layer being a superset that extends the protocol. There are no formal schema validators — everything is hand-implemented against the spec.

## Cross-Language Consistency (`protocol/` directory)

All three reference implementations (Go, Python, Rust) are spec-conformant and mutually consistent:

| Feature                     | Go          | Python       | Rust        | Spec               |
| --------------------------- | ----------- | ------------ | ----------- | ------------------ |
| Value priority order        | 7-step      | 7-step       | 7-step      | 7-step             |
| Default references (7)      | all 7       | all 7        | all 7       | all 7              |
| Node kinds                  | 3           | 3            | 3           | 3                  |
| Value types                 | 6           | 5+expression | 6           | 6                  |
| Flags (+/~)                 | yes         | yes          | yes         | yes                |
| JSON full-fidelity          | yes         | yes          | yes         | yes                |
| JSON LLM-simplified         | yes         | yes          | yes         | yes                |
| Compound parsing            | render-only | render-only  | render-only | render-only (v1.0) |
| Nested body dual-role       | correct     | correct      | correct     | correct            |
| Context-sensitive tokenizer | correct     | correct      | correct     | correct            |
| Conformance fixtures        | 56/56       | 56/56        | 56/56       | —                  |

No spec violations found in any of the three implementations.

## TypeScript (`packages/framework` + `packages/semantic`) vs Protocol Spec

The TypeScript layer is the primary production codebase and extends the protocol in several ways. These are the inconsistencies to be aware of:

### 1. Extra node kinds (TS has 5, spec has 3)

| Kind            | In Spec | In TS | In Go/Py/Rust |
| --------------- | ------- | ----- | ------------- |
| `command`       | yes     | yes   | yes           |
| `event-handler` | yes     | yes   | yes           |
| `compound`      | yes     | yes   | yes           |
| `conditional`   | **no**  | yes   | no            |
| `loop`          | **no**  | yes   | no            |

The `conditional` and `loop` kinds are TypeScript-only extensions. If these ever need to round-trip through Go/Python/Rust, they'll be dropped or cause errors.

### 2. Extra fields on `SelectorValue`

```text
Protocol spec:  { "type": "selector", "value": ".active" }
TypeScript:     { "type": "selector", "value": ".active", "selectorKind": "class" }
```

The `selectorKind` field (`'id' | 'class' | 'attribute' | 'element' | 'complex'`) exists only in TS. Go/Python/Rust don't produce or consume it.

### 3. Roles representation differs

- **Protocol (Go/Py/Rust):** `roles: Record<string, SemanticValue>` — plain object/dict/map with string keys
- **TypeScript:** `roles: ReadonlyMap<SemanticRole, SemanticValue>` — Map with typed `SemanticRole` keys

JSON serialization should be consistent (both become `{"roleName": {...}}`), but in-memory representations differ.

### 4. `FlagValue.enabled` optionality

| Lang             | Type                         |
| ---------------- | ---------------------------- |
| Go               | `*bool` (pointer, nullable)  |
| Rust             | `Option<bool>`               |
| Python           | `bool` (required)            |
| TS               | `boolean` (required)         |
| Spec wire format | `"enabled": true` (required) |

Go and Rust allow `nil`/`None` for `enabled`, which the spec doesn't mention. Minor risk if a nil flag is serialized.

## No Formal Schema Validators Exist

This is the most significant gap. There is no shared schema definition that all implementations derive from:

- No JSON Schema (`.json` with `$schema`) for the wire format
- No Zod/Joi/AJV schemas in TypeScript
- No protobuf/flatbuffers definition
- No OpenAPI spec for the wire format

Each implementation defines types independently:

- **Go:** `types.go` structs
- **Python:** `types.py` dataclasses
- **Rust:** `types.rs` structs + enums
- **TypeScript:** `packages/framework/src/core/types.ts` interfaces

The only shared contract is:

1. The **ABNF grammar** (`lokascript-explicit-syntax.abnf`) — covers bracket syntax only
2. The **wire-format.md** prose — covers JSON, but not machine-enforceable
3. The **56 shared test fixtures** — the actual consistency enforcement mechanism

## Test Fixture Coverage Gaps

The shared fixtures are comprehensive for bracket syntax but have gaps:

| Area                          | Covered | Gap                                                           |
| ----------------------------- | ------- | ------------------------------------------------------------- |
| All 5 selector types          | yes     | —                                                             |
| All 7 value types             | yes     | —                                                             |
| All 7 references              | yes     | —                                                             |
| Flags +/~                     | yes     | —                                                             |
| Nested body                   | yes     | —                                                             |
| Error cases                   | yes (7) | —                                                             |
| Round-trip                    | yes (7) | —                                                             |
| LLM-simplified JSON format    | **no**  | No fixtures test `trigger` wrapping or simplified flag format |
| Duration `m` and `h` suffixes | **no**  | Only `ms` and `s` tested                                      |
| Expression values             | **no**  | `{ type: "expression" }` untested                             |
| Unicode in values             | **no**  | —                                                             |
| Deeply nested commands (3+)   | **no**  | —                                                             |

## Recommendations

1. **Add a JSON Schema for the wire format** — A single `lse-wire-format.schema.json` in `protocol/spec/` would give all implementations a machine-checkable contract. Both full-fidelity and LLM-simplified formats should be covered.

2. **Add LLM-simplified format fixtures** — The wire format spec defines two JSON representations, but only full-fidelity is tested. Add fixtures for `trigger` wrapping, simplified flags, and expression value differences.

3. **Document TS extensions explicitly** — The `conditional` and `loop` node kinds, plus `selectorKind`, should either be:
   - Added to the spec as optional extensions, or
   - Stripped when serializing to protocol-level JSON

4. **Add missing duration fixtures** — Minutes (`m`) and hours (`h`) suffixes should be tested, not just `ms` and `s`.

5. **Consider a `protocol/typescript/` reference implementation** — A minimal, spec-only TS parser (without the `conditional`/`loop`/`selectorKind` extensions) would close the loop and could auto-generate types for the framework package.

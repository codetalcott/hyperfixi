# LSE Protocol Consistency Report

**Overall verdict:** Implementations are highly consistent across Go/Python/Rust, with the TypeScript layer being a superset that extends the protocol. A formal JSON Schema now exists (`protocol/spec/lse-wire-format.schema.json`), and a serialization boundary (`toProtocolJSON`/`fromProtocolJSON` in `packages/framework/src/ir/`) bridges the TS extensions to the protocol wire format.

## Cross-Language Consistency (`protocol/` directory)

All three reference implementations (Go, Python, Rust) are spec-conformant and mutually consistent:

| Feature                     | Go          | Python       | Rust        | TypeScript  | Spec               |
| --------------------------- | ----------- | ------------ | ----------- | ----------- | ------------------ |
| Value priority order        | 7-step      | 7-step       | 7-step      | 7-step      | 7-step             |
| Default references (7)      | all 7       | all 7        | all 7       | all 7       | all 7              |
| Node kinds                  | 3           | 3            | 3           | 3           | 3                  |
| Value types                 | 6           | 5+expression | 6           | 6           | 6                  |
| Flags (+/~)                 | yes         | yes          | yes         | yes         | yes                |
| JSON full-fidelity          | yes         | yes          | yes         | yes         | yes                |
| JSON LLM-simplified         | yes         | yes          | yes         | yes         | yes                |
| Compound parsing            | render-only | render-only  | render-only | render-only | render-only (v1.0) |
| Nested body dual-role       | correct     | correct      | correct     | correct     | correct            |
| Context-sensitive tokenizer | correct     | correct      | correct     | correct     | correct            |
| Conformance fixtures        | 56/56       | 56/56        | 56/56       | 63/63       | —                  |

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

The `conditional` and `loop` kinds are TypeScript-only extensions. `toProtocolJSON()` downgrades them to `command` (lossy — branch/body data dropped). `fromProtocolJSON()` never produces these kinds. See `wire-format.md` § TypeScript Extensions.

### 2. Extra fields on `SelectorValue`

```text
Protocol spec:  { "type": "selector", "value": ".active" }
TypeScript:     { "type": "selector", "value": ".active", "selectorKind": "class" }
```

The `selectorKind` field (`'id' | 'class' | 'attribute' | 'element' | 'complex'`) exists only in TS. Go/Python/Rust don't produce or consume it. `toProtocolJSON()` strips it on serialization.

### 3. Roles representation differs

- **Protocol (Go/Py/Rust):** `roles: Record<string, SemanticValue>` — plain object/dict/map with string keys
- **TypeScript:** `roles: ReadonlyMap<SemanticRole, SemanticValue>` — Map with typed `SemanticRole` keys

`toProtocolJSON()` converts `ReadonlyMap` → `Record` at the boundary. JSON serialization is consistent.

### 4. `FlagValue.enabled` optionality

| Lang             | Type                         |
| ---------------- | ---------------------------- |
| Go               | `*bool` (pointer, nullable)  |
| Rust             | `Option<bool>`               |
| Python           | `bool` (required)            |
| TS               | `boolean` (required)         |
| Spec wire format | `"enabled": true` (required) |

Go and Rust allow `nil`/`None` for `enabled`, which the spec doesn't mention. Minor risk if a nil flag is serialized.

## Formal Schema Validator

**Resolved.** `protocol/spec/lse-wire-format.schema.json` (JSON Schema Draft 7) now provides a machine-checkable contract for the full-fidelity wire format. It enforces `additionalProperties: false` on all value types, blocking TS-only fields like `selectorKind` from crossing the protocol boundary.

Each implementation still defines its own types independently:

- **Go:** `types.go` structs
- **Python:** `types.py` dataclasses
- **Rust:** `types.rs` structs + enums
- **TypeScript (spec-only):** `protocol/typescript/src/types.ts` interfaces
- **TypeScript (framework):** `packages/framework/src/core/types.ts` interfaces + `protocol-json.ts` boundary (superset)

The shared contract is now:

1. The **ABNF grammar** (`lokascript-explicit-syntax.abnf`) — covers bracket syntax only
2. The **wire-format.md** prose — updated with TS extensions section
3. The **JSON Schema** (`lse-wire-format.schema.json`) — machine-enforceable full-fidelity format
4. The **58 shared test fixtures** — the actual consistency enforcement mechanism (56 + 2 new duration cases)

## Test Fixture Coverage Gaps

The shared fixtures are comprehensive for bracket syntax but have gaps:

| Area                          | Covered    | Gap                                                 |
| ----------------------------- | ---------- | --------------------------------------------------- |
| All 5 selector types          | yes        | —                                                   |
| All 7 value types             | yes        | —                                                   |
| All 7 references              | yes        | —                                                   |
| Flags +/~                     | yes        | —                                                   |
| Nested body                   | yes        | —                                                   |
| Error cases                   | yes (7)    | —                                                   |
| Round-trip                    | yes (7)    | —                                                   |
| LLM-simplified JSON format    | **yes(5)** | Added `llm-simplified.json` (trigger, flags, expr)  |
| Duration `m` and `h` suffixes | **yes**    | Added lit-015, lit-016                              |
| Expression values             | **no**     | `{ type: "expression" }` untested in bracket parser |
| Unicode in values             | **no**     | —                                                   |
| Deeply nested commands (3+)   | **no**     | —                                                   |

## Recommendations

1. ~~**Add a JSON Schema for the wire format**~~ — **Done.** `protocol/spec/lse-wire-format.schema.json` added.

2. ~~**Add LLM-simplified format fixtures**~~ — **Done.** `protocol/test-fixtures/llm-simplified.json` added (5 cases: trigger wrapping, simplified flags, expression differences).

3. ~~**Document TS extensions explicitly**~~ — **Done.** `toProtocolJSON()`/`fromProtocolJSON()` added to `packages/framework/src/ir/`; TS-only kinds downgraded to `command` on serialization. See `wire-format.md` § TypeScript Extensions.

4. ~~**Add missing duration fixtures**~~ — **Done.** `lit-015` (`2m`) and `lit-016` (`1h`) added to `literals.json`.

5. ~~**Consider a `protocol/typescript/` reference implementation**~~ — **Done.** `protocol/typescript/` added: spec-only `parseExplicit`, `renderExplicit`, `fromJSON`/`toJSON`, with 63 conformance tests passing (`npm test` from `protocol/typescript/`). The implementation uses 3 node kinds and `Record<string, SemanticValue>` matching Go/Python/Rust exactly.

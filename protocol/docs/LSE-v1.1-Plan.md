# LSE Protocol v1.1 Implementation Plan

Based on parallel research into Fillmore/FrameNet, PropBank/SRL, and AMR/UMR, this document defines the concrete implementation plan for improving LSE to be lossless for conditionals and loops.

## Research Basis

Three findings drove this plan:

1. **Conditionals should be relations between command nodes, not new node kinds.** AMR uses a `:condition` edge connecting two event subgraphs. PropBank puts `if`-clauses in ARGM-ADV (sentential modifier), not as core arguments. FrameNet's `Conditional_scenario` frame defines `Antecedent` and `Consequent` as propositional Frame Elements. The current TS `conditional` node kind is modeled at the wrong layer — it should dissolve into a `command` node with `thenBranch`/`elseBranch` top-level fields (parallel to how `event-handler` uses `body`).

2. **Iteration requires a genuine new primitive.** AMR explicitly states it cannot represent universal quantification. Variable binding (`for item in collection`) requires something outside case grammar's entity-denoting world. The minimum extension is a `repeat` command with an explicit bound `loopVariable` field and a `loopBody` array.

3. **Sequential chaining is already handled** by `compound` with `chainType`. No changes needed.

## Scope

### What does NOT change

- The 3 protocol node kinds (`command`, `event-handler`, `compound`)
- The ABNF bracket command syntax
- The 7 value types
- The 7 default references
- All existing conformance fixtures (fully backward-compatible)

### What DOES change

- Phase 1: ABNF nested-body rule generalized from `body:`-only to a structural-role whitelist
- Phase 2: Conditionals encoded losslessly as `command` nodes with `thenBranch`/`elseBranch` top-level arrays
- Phase 3: Loops encoded losslessly as `command` nodes with `loopVariant`/`loopBody`/`loopVariable` top-level fields
- Phase 4: `selectorKind` made optional in JSON Schema; `FlagValue.enabled` optionality fixed in Go/Rust
- Phase 5: Wire-format.md updated to reflect lossless encoding (no structural TS type changes)

## Phase Ordering

```
Phase 4 (independent — do first, no deps)

Phase 1 (ABNF structural-role generalization)
    ├── Phase 2 (conditional encoding)
    │       └── Phase 5 (doc update)
    └── Phase 3 (loop encoding)
            └── Phase 5 (doc update)
```

Recommended order: **4A → 4B → 1 → 2 → 3 → 5**

---

## Phase 1: Generalize Nested-Body Parsing

**Size: Small**
**Dependencies: None (prerequisite for Phases 2 and 3)**

### Problem

The ABNF currently triggers nested-bracket-command parsing only when the role name is `body`. This blocks `condition:`, `then:`, `else:`, and `loop-body:` from carrying nested commands, which are required for Phases 2 and 3.

### Design Decision: Structural-Role Whitelist

Use an explicit whitelist of structural role names rather than universal detection (any `[`-prefixed value). The universal rule is ambiguous: `condition:[data-active]` could be an attribute selector or a nested command. The whitelist is explicit and predictable.

**Disambiguation rule for whitelist members:** A role value is parsed as a nested bracket command if:

1. The role name is in `structural-role-names`, AND
2. The value starts with `[`, AND
3. After stripping the outer `[]`, the inner content contains at least one ASCII space at bracket-depth 0, OR at least one `:` character — i.e., it has argument tokens beyond just the command name.

This distinguishes `[data-active]` (no space, no colon → attribute selector) from `[toggle patient:.active]` (has space and colon → nested command).

**Structural-role whitelist:**

```
structural-role-names = "body" / "then" / "else" / "condition" / "loop-body" / "variable"
```

### Files to Change

| File                                                | Change                                                                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol/spec/lokascript-explicit-syntax.abnf`     | Replace `nested-body` section with `structural-roles` section; define `structural-role-names` rule; update disambiguation note; bump to v1.1.0        |
| `protocol/spec/README.md`                           | Replace "body dual role" section with "Structural Roles" section explaining whitelist and disambiguation rule                                         |
| `protocol/typescript/src/parser.ts`                 | Change `if (roleName === 'body' && ...)` to `if (STRUCTURAL_ROLES.has(roleName) && ...)`; add disambiguation check                                    |
| `protocol/go/parser.go`                             | Same — use `map[string]bool` for O(1) lookup                                                                                                          |
| `protocol/rust/src/parser.rs`                       | Same — use `HashSet<&str>`                                                                                                                            |
| `protocol/python/src/lokascript_explicit/parser.py` | Same — use `frozenset`                                                                                                                                |
| `packages/framework/src/ir/explicit-parser.ts`      | Same change; export `STRUCTURAL_ROLES` constant                                                                                                       |
| `protocol/test-fixtures/structural-roles.json`      | **New file** — 2 fixtures: (1) attribute selector in structural role → selector value; (2) attribute selector in non-structural role → selector value |

---

## Phase 2: Lossless Conditional Encoding

**Size: Medium**
**Dependencies: Phase 1**

### Problem

`toProtocolJSON()` lossily downgrades `ConditionalSemanticNode` to `command`, dropping `thenBranch` and `elseBranch`. `fromProtocolJSON()` never reconstructs a `conditional`.

### Design Decision: Top-Level Array Fields on `command` Nodes

Three options were evaluated:

| Option                                    | Description                           | Decision                                                          |
| ----------------------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| A: New `node`/`node-list` value types     | Add to `roles` map                    | Rejected — too intrusive, breaks role heterogeneity               |
| B: Top-level optional fields on `command` | Parallel to `body` on `event-handler` | **Chosen** — consistent with existing pattern, lossless, readable |
| C: `expression` type with raw string      | Semi-opaque, requires re-parsing      | Rejected — information not recoverable without re-parsing         |

### Wire Format

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

- `kind` stays `"command"` — the research finding is that conditionals are command nodes with structural relations
- `thenBranch` / `elseBranch` are top-level optional arrays, not roles
- `elseBranch` is omitted entirely when absent (not `null`, not `[]`)
- The `condition` role holds an `expression` value with raw string

### Bracket Syntax

```
[if condition:"x > 0" then:[toggle patient:.active] else:[remove patient:.active]]
```

`then:` and `else:` are in the structural-role whitelist (Phase 1), so values starting with `[` that contain spaces are parsed as nested bracket commands.

### Files to Change

| File                                                      | Change                                                                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol/spec/wire-format.md`                            | Add "Conditional Node" section with example; add `thenBranch`/`elseBranch` to `SemanticNodeJSON` interface; update "TypeScript Extensions" table row                                   |
| `protocol/spec/lse-wire-format.schema.json`               | Add optional `thenBranch` and `elseBranch` to `CommandNode` properties                                                                                                                 |
| `packages/framework/src/ir/types.ts`                      | Add `thenBranch?: ProtocolNodeJSON[]` and `elseBranch?: ProtocolNodeJSON[]` to `ProtocolNodeJSON`                                                                                      |
| `packages/framework/src/ir/protocol-json.ts`              | **`toProtocolJSON()`**: `conditional` case → encode as `command` with `thenBranch`/`elseBranch`. **`fromProtocolJSON()`**: detect `thenBranch` → reconstruct `ConditionalSemanticNode` |
| `packages/framework/src/ir/protocol-json.test.ts`         | Replace "lossy downgrade" tests with lossless round-trip tests                                                                                                                         |
| `protocol/typescript/src/types.ts`                        | Add optional `thenBranch`/`elseBranch` to `SemanticNode`                                                                                                                               |
| `protocol/typescript/src/renderer.ts`                     | Render `then:[...]` / `else:[...]` for nodes with these fields                                                                                                                         |
| `protocol/typescript/src/parser.ts`                       | Restore `thenBranch`/`elseBranch` from JSON                                                                                                                                            |
| `protocol/go/types.go`                                    | Add `ThenBranch []SemanticNode` / `ElseBranch []SemanticNode`; update `MarshalJSON()`                                                                                                  |
| `protocol/go/json_convert.go`                             | Parse `thenBranch`/`elseBranch` in `FromJSON()`                                                                                                                                        |
| `protocol/go/renderer.go`                                 | Render structural roles for conditional nodes                                                                                                                                          |
| `protocol/rust/src/types.rs`                              | Add loop fields with `#[serde(skip_serializing_if = "Vec::is_empty")]`                                                                                                                 |
| `protocol/rust/src/json_convert.rs`                       | Deserialize `thenBranch`/`elseBranch`                                                                                                                                                  |
| `protocol/rust/src/renderer.rs`                           | Render structural roles                                                                                                                                                                |
| `protocol/python/src/lokascript_explicit/types.py`        | Add fields to `SemanticNode` dataclass                                                                                                                                                 |
| `protocol/python/src/lokascript_explicit/json_convert.py` | Update `from_json()`                                                                                                                                                                   |
| `protocol/python/src/lokascript_explicit/renderer.py`     | Update rendering                                                                                                                                                                       |
| `protocol/test-fixtures/conditionals.json`                | **New file** — 3 fixtures: then-only, then+else, render-only round-trip                                                                                                                |

---

## Phase 3: Lossless Loop Encoding

**Size: Medium-Large**
**Dependencies: Phase 1, Phase 2 (pattern established)**

### Problem

`LoopSemanticNode` has 5 variants with different role structures. `toProtocolJSON()` lossily downgrades all to `command`, dropping `loopVariant`, `body`, `loopVariable`, `indexVariable`. `fromProtocolJSON()` never reconstructs a `loop`.

### Wire Format

All 5 variants share `kind: "command"`, `action: "repeat"`, and `loopBody: SemanticNode[]`. The `loopVariant` field distinguishes them. The `for` variant introduces the key new primitive: `loopVariable` — an explicit bound variable name.

```json
// forever
{ "kind": "command", "action": "repeat", "loopVariant": "forever", "roles": {}, "loopBody": [...] }

// times
{ "kind": "command", "action": "repeat", "loopVariant": "times", "roles": { "quantity": { "type": "literal", "value": 5, "dataType": "number" } }, "loopBody": [...] }

// for (the genuine new primitive — variable binding)
{ "kind": "command", "action": "repeat", "loopVariant": "for", "roles": { "source": { "type": "selector", "value": "#items" } }, "loopVariable": "item", "indexVariable": "i", "loopBody": [...] }

// while
{ "kind": "command", "action": "repeat", "loopVariant": "while", "roles": { "condition": { "type": "expression", "raw": "counter < 10" } }, "loopBody": [...] }

// until
{ "kind": "command", "action": "repeat", "loopVariant": "until", "roles": { "condition": { "type": "expression", "raw": "isDone" } }, "loopBody": [...] }
```

Key decisions:

- Field name is `loopBody` (not `body`) to avoid collision with `event-handler`'s `body` field
- `loopVariable` / `indexVariable` are plain string fields — they are bound variable **names**, not semantic values, so they do not go in the `roles` map
- The `condition` for `while`/`until` is in `roles` as an `expression` value (same pattern as `if`)

### Bracket Syntax

`loop-body:` is in the structural-role whitelist (Phase 1):

```
[repeat loopVariant:forever loop-body:[wait duration:1s]]
[repeat loopVariant:times quantity:5 loop-body:[toggle patient:.active]]
[repeat loopVariant:for source:#items loopVariable:"item" loop-body:[add patient:.active destination:it]]
[repeat loopVariant:while condition:"counter < 10" loop-body:[increment destination:#counter]]
[repeat loopVariant:until condition:isDone loop-body:[wait duration:100ms]]
```

### Files to Change

| File                                              | Change                                                                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol/spec/lokascript-explicit-syntax.abnf`   | Add `"loop-body"` to `structural-role-names`                                                                                                 |
| `protocol/spec/wire-format.md`                    | Add "Loop Node" section with all 5 variant examples                                                                                          |
| `protocol/spec/lse-wire-format.schema.json`       | Add `loopVariant` (enum), `loopBody` (array), `loopVariable` (string), `indexVariable` (string) to `CommandNode`                             |
| `packages/framework/src/ir/types.ts`              | Add `loopVariant?`, `loopBody?`, `loopVariable?`, `indexVariable?` to `ProtocolNodeJSON`                                                     |
| `packages/framework/src/ir/protocol-json.ts`      | **`toProtocolJSON()`**: `loop` case → encode all 5 variants. **`fromProtocolJSON()`**: detect `loopVariant` → reconstruct `LoopSemanticNode` |
| `packages/framework/src/ir/protocol-json.test.ts` | Replace "loop lossy downgrade" tests with lossless round-trip tests for all 5 variants                                                       |
| All 4 reference implementations                   | Same 3 files per implementation as Phase 2 (types, json_convert, renderer) — addendum changes for loop fields                                |
| `protocol/test-fixtures/loops.json`               | **New file** — 5 fixtures, one per loop variant                                                                                              |

---

## Phase 4: Minor Improvements (Independent)

**Size: Small**
**Dependencies: None**

### 4A: `selectorKind` as Optional Field in JSON Schema

**Problem:** The TS `SelectorValue` has `selectorKind: 'id' | 'class' | 'attribute' | 'element' | 'complex'` which carries useful precomputed information. `toProtocolJSON()` strips it because the JSON Schema enforces `additionalProperties: false` on value types.

**Fix:** Add `selectorKind` as an optional property to `SelectorValue` in the schema. Keep `additionalProperties: false` — only the whitelisted fields are allowed.

| File                                              | Change                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `protocol/spec/lse-wire-format.schema.json`       | Add optional `selectorKind` enum property to `SelectorValue`                                        |
| `protocol/spec/wire-format.md`                    | Note `selectorKind` as optional in `SelectorValue` row                                              |
| `packages/framework/src/ir/protocol-json.ts`      | Conditionally include `selectorKind` in selector value serialization; restore it in deserialization |
| `packages/framework/src/ir/types.ts`              | Add `selectorKind?: string` to `ProtocolValueJSON`                                                  |
| `packages/framework/src/ir/protocol-json.test.ts` | Add round-trip test verifying `selectorKind` is preserved                                           |

### 4B: Fix `FlagValue.enabled` Optionality in Go/Rust

**Problem:** The spec requires `enabled` as a mandatory field. Go uses `*bool` (pointer, nullable) with `omitempty`; Rust uses `Option<bool>`. Both can silently omit `enabled` from JSON output, violating the JSON Schema `required: ["type", "name", "enabled"]`.

**Fix:** Make `enabled` non-optional in both implementations.

| File                                 | Change                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `protocol/spec/wire-format.md`       | Add explicit note: "`enabled` is REQUIRED and MUST be present in all conformant implementations" |
| `protocol/go/types.go`               | Change `Enabled *bool \`json:"enabled,omitempty"\``to`Enabled bool \`json:"enabled"\``           |
| `protocol/go/json_convert.go`        | Update flag handling to use non-pointer bool                                                     |
| `protocol/go/renderer.go`            | Remove `value.Enabled != nil` guards                                                             |
| `protocol/rust/src/types.rs`         | Change `pub enabled: Option<bool>` to `pub enabled: bool`; update `Serialize` impl               |
| `protocol/rust/src/json_convert.rs`  | Update deserialization to treat `enabled` as required                                            |
| `protocol/test-fixtures/errors.json` | Add error fixture for flag missing `enabled` field                                               |

---

## Phase 5: TypeScript Type Documentation Update

**Size: Extra-Small**
**Dependencies: Phases 2 and 3**

### Decision: Keep TS `conditional` and `loop` Node Kinds

After Phases 2-3, `toProtocolJSON()` encodes these losslessly and `fromProtocolJSON()` reconstructs them. The wire format and the TS layer now legitimately differ in representation — that is correct architecture.

Collapsing the TS kinds would:

- Replace exhaustive `switch` statements with `if (node.thenBranch)` guards (losing TypeScript's compile-time exhaustiveness checking)
- Eliminate the `createConditionalNode()` / `createLoopNode()` ergonomic factories
- Require updating 8+ consumer files for no user-visible benefit

### Files to Change

| File                                         | Change                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol/spec/wire-format.md`               | Update "TypeScript Extensions" table: `conditional` and `loop` rows change from "lossy downgrade" to "lossless encoding / reconstruction via top-level array fields" |
| `packages/framework/src/ir/protocol-json.ts` | Remove "DROPPED" comments; update to describe lossless encoding                                                                                                      |

---

## New Conformance Fixture Files

| File                                           | Fixtures                           |
| ---------------------------------------------- | ---------------------------------- |
| `protocol/test-fixtures/structural-roles.json` | 2 (Phase 1)                        |
| `protocol/test-fixtures/conditionals.json`     | 3 (Phase 2)                        |
| `protocol/test-fixtures/loops.json`            | 5 — one per loop variant (Phase 3) |
| `protocol/test-fixtures/errors.json`           | +1 addendum (Phase 4B)             |

Total new fixtures: 11 (bringing conformance suite from 58 to ~69)

---

## Versioning

- Phases 1-3: Wire format v1.1.0 (minor — backward-compatible additions to the `command` node shape)
- Phase 4: Wire format v1.1.0 (included in same minor bump — `selectorKind` is additive; `enabled` fix is a conformance clarification)
- The ABNF version bumps from 1.0.0 to 1.1.0 with Phase 1

All existing conformance fixtures continue to pass unchanged. The new fixtures are additive.

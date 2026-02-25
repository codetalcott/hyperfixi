# LSE Syntax: New Directions

**Status**: Exploration
**Date**: 2026-02-25
**Author**: Claude (exploration session)

## Context

LSE v1.1 is a well-specified, multi-language protocol (Go, Python, Rust, TypeScript) with 73+ conformance tests, a formal ABNF grammar, JSON Schema, and wire format. It serves as the universal IR between 24 natural language parsers, 9+ domain DSLs, LLM integration, and AOT compilation.

This document explores directions **beyond v1.1** — structural and conceptual extensions that could increase LSE's expressiveness, composability, and utility across new use cases.

---

## Direction 1: Pipe Syntax for Data Flow

### Problem

The current `then` chaining is sequential but has no data-flow semantics. Each command in a chain runs after the previous, but there's no explicit way to say "the output of command A becomes the input of command B" — that's handled implicitly via `it`/`result` references.

### Proposal: `|>` Pipe Operator

```
[fetch source:/api/users] |> [filter condition:"role == 'admin'"] |> [put destination:#user-list]
```

The pipe operator `|>` is a new chain operator (alongside `then`, `and`, `async`, `sequential`) that explicitly threads the output of the left command into the `patient` role of the right command.

**ABNF extension:**

```abnf
chain-op = "then" / "and" / "async" / "sequential" / "|>"
```

**Semantics:**

- `|>` desugars to `then` with an implicit `patient:result` on the right command
- If the right command already has a `patient` role, `|>` feeds into `source` instead
- If both `patient` and `source` are present, `|>` is a parse error (ambiguous)

**Wire format:** `chainType: "pipe"` in compound nodes.

### Why This Matters

- Makes data flow explicit and visible in the IR
- Enables functional-style composition without leaving LSE
- Natural fit for the FlowScript domain (`packages/domain-flow`)
- LLMs can generate pipe chains more reliably than implicit `it` references

### Alternatives Considered

- **Named wiring** (`[fetch source:/api] as users |> [filter ...]`): Too complex; introduces bindings into what is otherwise a linear stream
- **Leaving it implicit**: Works for 2-3 commands but becomes unreadable for longer chains

---

## Direction 2: Destructuring / Multi-Role Output

### Problem

Commands currently produce a single implicit result (`it`/`result`). Real-world commands — especially `fetch` — produce multiple named outputs (status code, headers, body, error). The current workaround is property-path access (`result's status`, `result's body`), which is verbose and requires the consumer to know the producer's internal structure.

### Proposal: `yields` Declaration

Add an optional `yields` annotation to command definitions that declares the named outputs:

**In schemas:**

```typescript
const fetchSchema: CommandSchema = {
  action: 'fetch',
  roles: [
    /*...*/
  ],
  yields: ['body', 'status', 'headers', 'ok'],
};
```

**In bracket syntax — extraction shorthand:**

```
[fetch source:/api/users] => {body, status}
[if condition:"status == 200"
  then:[put patient:body destination:#users]
  else:[log patient:status]]
```

The `=> {...}` syntax is a **destructuring bind** that extracts named outputs into local references. These references are scoped to the compound chain.

### Concern: Scoping with Pipes and Nested Chains

Destructuring introduces scoped bindings, which interacts non-trivially with pipes (Direction 1) and nested compound chains. Consider whether `yields` at the schema level alone (for documentation, autocomplete, and validation) is sufficient without the destructuring _syntax_ — tools could still use `result.body` with schema-validated autocomplete from `yields` metadata.

**ABNF extension:**

```abnf
compound-stmt  = bracket-cmd *( 1*WSP chain-op 1*WSP bracket-cmd )
               / bracket-cmd 1*WSP "=>" 1*WSP destructure *( 1*WSP chain-op 1*WSP bracket-cmd )

destructure    = "{" *WSP ident *( *WSP "," *WSP ident ) *WSP "}"
ident          = 1*( ALPHA / DIGIT / "-" / "_" )
```

**Wire format:** Add an optional `bindings: string[]` field to compound node statements that carry destructuring.

### Why This Matters

- Eliminates brittle `result's X` property paths
- Makes multi-output commands first-class
- Enables safer, schema-validated data flow between commands
- Improves LLM generation accuracy (explicit inputs/outputs vs. implicit state)

---

## Direction 3: Scoped Blocks / `with` Environment

### Problem

Many real-world patterns require configuring shared state across multiple commands. Currently each command carries its own roles independently:

```
[fetch source:/api/users method:GET destination:#list]
[fetch source:/api/posts method:GET destination:#posts]
[fetch source:/api/comments method:GET destination:#comments]
```

The `method:GET` is repeated. More critically, patterns like "all these fetches should use the same auth header" or "all these commands target the same element" have no compact representation.

### Proposal: `with` Block Scope

```
with {method:GET, agent:server} [
  [fetch source:/api/users destination:#list]
  [fetch source:/api/posts destination:#posts]
  [fetch source:/api/comments destination:#comments]
]
```

The `with` block provides **ambient roles** that are inherited by all commands within its scope. Commands can override inherited roles explicitly.

**ABNF extension:**

```abnf
statement-line = *WSP ( compound-stmt / with-block ) *WSP

with-block     = "with" 1*WSP ambient-roles 1*WSP "[" LF
                 1*( *WSP statement-line LF )
                 *WSP "]"

ambient-roles  = "{" *WSP role-pair *( *WSP "," *WSP role-pair ) *WSP "}"
```

**Wire format:** A new `"scoped"` node kind:

```json
{
  "kind": "scoped",
  "ambient": {
    "method": { "type": "literal", "value": "GET", "dataType": "string" }
  },
  "body": [
    { "kind": "command", "action": "fetch", "roles": { "source": ... } },
    { "kind": "command", "action": "fetch", "roles": { "source": ... } }
  ]
}
```

### Why This Matters

- Reduces repetition in real-world LSE documents
- Natural for configuration scoping (auth, base URLs, target elements)
- Maps cleanly to execution contexts (middleware, interceptors)
- Already a proven pattern in CSS (`@scope`), Terraform (`locals`), Nix (`let ... in`)

### Concern: Protocol Node Kind Count

Adding a 4th node kind (`scoped`) to the protocol is significant. An alternative is to keep `scoped` as a TS-layer-only kind (like `conditional` and `loop`) that gets flattened to repeated `command` nodes in the wire format, with ambient roles merged into each child.

**Recommendation:** Start TS-layer-only. If `scoped` flattens at the wire level, downstream tools never see the grouping intent — but that's acceptable until multiple consumers (LSP, compilation service) demonstrate a need for the structural information. Promote to wire format only under real demand.

---

## Direction 4: Pattern Matching / `match` Expression

### Problem

The `if`/`else` conditional (v1.1) handles binary branching. But real-world logic frequently involves multi-way dispatch: "if the response is 200, do X; if 404, do Y; if 500, do Z; otherwise, do W." Encoding this as nested `if`/`else` chains is both ugly and lossy in the bracket syntax.

### Proposal: `match` Command with Arms

```
[match patient:status
  arm:"200" => [put patient:body destination:#result]
  arm:"404" => [show patient:#not-found]
  arm:"500" => [log patient:"server error"]
  default   => [log patient:status]]
```

**Wire format:**

```json
{
  "kind": "command",
  "action": "match",
  "roles": {
    "patient": { "type": "reference", "value": "status" }
  },
  "arms": [
    {
      "pattern": { "type": "literal", "value": "200", "dataType": "string" },
      "body": [{ "kind": "command", "action": "put", "roles": { ... } }]
    },
    {
      "pattern": { "type": "literal", "value": "404", "dataType": "string" },
      "body": [{ "kind": "command", "action": "show", "roles": { ... } }]
    }
  ],
  "defaultArm": [
    { "kind": "command", "action": "log", "roles": { ... } }
  ]
}
```

### Design Considerations

- **Pattern types**: v1.3 should support literal values only. Advanced patterns — selector presence checks (`has:.active`), type guards (`is:number`), and range patterns (`range:1..10`) — require expression nodes as arm patterns rather than just literals. Defer these to a later version to avoid designing the pattern node types prematurely.
- **Fallthrough**: No implicit fallthrough (unlike C `switch`). Each arm is independent.
- **Exhaustiveness**: Optional. The `default` arm is a catch-all. Without it, a non-matching value is a no-op.
- Like conditionals and loops, `match` is a `command` node with extra top-level fields (`arms`, `defaultArm`) — not a new node kind

### Why This Matters

- Multi-way branching is everywhere in real applications
- Eliminates nested `if`/`else` chains that are painful in bracket syntax
- Pattern matching is a well-understood PL concept that maps naturally to role-based dispatch
- Enables cleaner state machine representations for the compilation service

---

## Direction 5: Annotations / Metadata Layer

### Problem

LSE nodes carry semantic content (action + roles) but no metadata. Real-world tools need to attach non-semantic information: source location, compilation hints, performance budgets, access control, documentation.

Currently this information lives outside LSE entirely (in tool-specific wrappers), which means it's lost across tool boundaries.

### Proposal: `@annotation` Prefix Syntax

```
@timeout(5s) @retry(3)
[fetch source:/api/users destination:#list]

@doc("Toggle the active state of the target element")
@deprecated("Use [switch] instead")
[toggle patient:.active destination:#button]

@permission(admin)
[remove patient:#user destination:users]
```

Annotations are **prefix decorators** that attach to the next statement. They're key-value pairs with an optional parenthesized argument.

**ABNF extension:**

```abnf
statement-line = *annotation *WSP compound-stmt *WSP

annotation     = "@" annotation-name [ "(" annotation-value ")" ] 1*WSP
annotation-name  = 1*( ALPHA / DIGIT / "-" / "_" )
annotation-value = string-literal / duration-literal / number-literal / 1*ident-char
```

**Wire format:** Add an optional `annotations` array to all node types. Use an array (not an object) because annotation order can be semantically meaningful for middleware-like composition (e.g., `@retry` before `@timeout`):

```json
{
  "kind": "command",
  "action": "fetch",
  "roles": { ... },
  "annotations": [
    { "name": "timeout", "value": "5s" },
    { "name": "retry", "value": "3" }
  ]
}
```

### What Annotations Are NOT

- Not semantic roles — they don't affect the command's meaning
- Not execution instructions — they're hints that tools may or may not honor
- Not required — parsers MUST accept annotated nodes and MAY ignore annotations they don't understand

### Why This Matters

- Enables progressive complexity: simple commands stay simple; tools that need metadata can use annotations
- Standard place for cross-cutting concerns (auth, retry, timeout, caching)
- LSP integration: `@deprecated`, `@doc` enable tooling support
- Training data: `@difficulty`, `@category` annotations for LLM fine-tuning datasets
- Tracing: `@trace-id` for distributed system observability

---

## Direction 6: Template / Macro System

### Problem

LSE is purely imperative — there's no abstraction mechanism within the syntax itself. Complex patterns must be duplicated. The `behavior` concept exists in hyperscript but has no LSE representation.

### Proposal: `def` / `use` for Reusable Templates

**Definition:**

```
def button-loader(url, target) [
  [add patient:.loading destination:target]
  [fetch source:url destination:target]
  [remove patient:.loading destination:target]
]
```

**Invocation:**

```
[use template:button-loader url:/api/users target:#user-list]
```

**Wire format:** Templates are purely a source-level convenience. The `use` command expands to its definition at parse time. In the wire format, only the expanded commands appear — no `def` or `use` nodes exist.

This is explicitly a **macro system**, not a function system. There's no call stack, no scoping, no recursion. It's textual substitution with named parameters.

### Why This Matters

- Reduces duplication in LSE documents
- Enables reusable component patterns (loading states, error handling, animations)
- Clean mapping to hyperscript behaviors
- Keeps the wire format simple (no new node kinds — expansion happens at parse time)

### Concern: Scope Creep

A macro system is the beginning of a programming language. The explicit restriction to "textual substitution, no recursion, no conditional expansion" keeps it manageable. If more power is needed, users should use the host language (JavaScript) or a domain DSL.

Additionally, parameter substitution into LSE bracket syntax requires the expander to understand role-name/role-value boundaries. Edge cases like `[use template:x patient:"text with :colons"]` need the parser to distinguish template parameter names from role syntax — this is solvable but adds non-trivial parsing complexity.

---

## Direction 7: Type Constraints on Roles

### Problem

Role values are classified by syntactic form (selector, literal, reference, etc.) but not by semantic type. The `patient` role for `toggle` expects a CSS class, while `patient` for `put` expects arbitrary content. Schema validation catches unknown role names but not mistyped values.

### Proposal: Schema-Level Type Constraints

Extend command schemas with value type constraints:

```typescript
const toggleSchema: CommandSchema = {
  action: 'toggle',
  roles: [
    {
      role: 'patient',
      required: true,
      accepts: ['selector'], // Only CSS selectors
      selectorKinds: ['class', 'attribute'], // Only class/attribute selectors
    },
    {
      role: 'destination',
      required: false,
      accepts: ['selector', 'reference'], // Selector or reference (me, you)
    },
  ],
};
```

**Bracket syntax — no change.** Type constraints are schema-level validation, not syntax-level. The parser validates after classification:

```
[toggle patient:.active]          ✅ selector (class) — accepted
[toggle patient:"hello"]          ❌ literal (string) — rejected by schema
[toggle patient:#button]          ❌ selector (id) — rejected by selectorKinds constraint
```

### Wire format — diagnostic extension:

```json
{
  "kind": "command",
  "action": "toggle",
  "roles": { ... },
  "diagnostics": [
    {
      "level": "error",
      "role": "patient",
      "message": "toggle.patient expects a class or attribute selector, got id selector '#button'",
      "code": "LSE-TYPE-001"
    }
  ]
}
```

### Why This Matters

- Catches errors at parse time rather than runtime
- Improves LLM generation accuracy (the schema tells the model exactly what's valid)
- Enables richer LSP diagnostics (red squiggles on invalid role values)
- Foundation for gradual typing across the LSE ecosystem

---

## Direction 8: Quantified / Collection Operations

### Problem

The `repeat` loop (v1.1) handles iteration, but there's no compact way to express collection operations: filter, map, reduce, sort, group. These are fundamental to data manipulation and currently require verbose loop-body constructions.

### Proposal: Collection Operators as Commands

```
[filter source:#items condition:"price > 100"]
[map source:#items patient:"item.name"]
[sort source:#items manner:ascending patient:price]
[group source:#users patient:role]
[reduce source:#items patient:total manner:sum]
```

These are standard commands (not new syntax) with well-defined role mappings:

| Command  | `source`   | `patient`      | `condition` | `manner`              |
| -------- | ---------- | -------------- | ----------- | --------------------- |
| `filter` | Collection | —              | Predicate   | —                     |
| `map`    | Collection | Transform expr | —           | —                     |
| `sort`   | Collection | Sort key       | —           | asc/desc              |
| `group`  | Collection | Group key      | —           | —                     |
| `reduce` | Collection | Accumulator    | —           | Operation (sum, etc.) |

These commands compose naturally with pipes:

```
[fetch source:/api/products]
  |> [filter condition:"category == 'electronics'"]
  |> [sort patient:price manner:ascending]
  |> [map patient:"item.name + ': $' + item.price"]
  |> [put destination:#product-list]
```

### Resolution: Expression Roles Use Existing Wire Types

The `condition` and `patient` roles in collection operators appear as quoted strings in bracket syntax (`condition:"price > 100"`), but LSE v1.1 already has structured `expression` value types in the wire format (binary operations, member access, possessives). The resolution:

1. **Wire format**: No change — `"price > 100"` becomes `{ type: "expression", operator: ">", left: { type: "reference", value: "price" }, right: { type: "literal", value: "100", dataType: "number" } }`
2. **Bracket syntax**: Quoted strings in expression-typed roles are parsed into structured expression nodes, not stored as opaque string literals
3. **Prerequisite**: Type constraints (Direction 7) must land first — the schema's `accepts: ['expression']` tells the bracket parser to structurally parse the quoted content rather than treating it as a string literal

This avoids introducing a sub-language. The bracket syntax quotes are a serialization convenience; the wire format stays fully structured.

### Why This Matters

- Collection operations are the most common data manipulation pattern
- Clean composition with pipe syntax (Direction 1)
- Natural fit for SQL domain, FlowScript domain, and LLM data processing
- Enables declarative data pipelines within LSE

---

## Direction 9: Error Handling / `try`-`catch`-`finally`

### Problem

LSE has no error handling construct. If a command fails, the behavior is runtime-dependent. The `fallback` role proposed in the schema evolution document handles simple cases, but complex error recovery (retry, fallback chains, cleanup) needs structural support.

### Proposal: `try` Command with Structural Roles

```
[try
  body:[fetch source:/api/users destination:#list]
  catch:[show patient:#error-message]
  finally:[remove patient:.loading]]
```

**Wire format:** `try` is a `command` node with `body`, `catchBranch`, and `finallyBranch` top-level arrays (same pattern as `if`/`else` and `repeat`/`loopBody`):

```json
{
  "kind": "command",
  "action": "try",
  "roles": {},
  "body": [{ "kind": "command", "action": "fetch", ... }],
  "catchBranch": [{ "kind": "command", "action": "show", ... }],
  "finallyBranch": [{ "kind": "command", "action": "remove", ... }]
}
```

**Structural roles to add:** `catch`, `finally` join the whitelist alongside `body`, `then`, `else`, `condition`, `loop-body`, `variable`.

### Why This Matters

- Error handling is essential for any non-trivial command sequence
- Follows the v1.1 pattern (structural fields on `command` nodes, no new node kinds)
- Enables robust fetch-and-display patterns
- Critical for server-side and multi-agent scenarios where failures are expected

---

## Direction 10: Versioned Protocol Negotiation

### Problem

As LSE evolves (v1.0 → v1.1 → v1.2+), different tools may support different versions. There's currently no way for a producer to declare which version it requires or for a consumer to declare which version it supports.

### Proposal: Version Header in Streaming Format

```
#!lse 1.2
[fetch source:/api/users] |> [filter condition:"active"]
[try body:[put patient:body destination:#list] catch:[log patient:"failed"]]
```

The `#!lse <version>` shebang line is a version declaration. It's a comment (starts with `#`) so v1.0 parsers ignore it gracefully.

**Negotiation in JSON wire format:**

```json
{
  "lseVersion": "1.2",
  "features": ["pipe", "try-catch", "annotations"],
  "nodes": [...]
}
```

### Why This Matters

- Enables graceful degradation across tool versions
- Critical for MCP server interop (different servers at different versions)
- Foundation for feature detection (does this tool support pipes? annotations?)
- Follows established patterns (HTTP content negotiation, JSON Schema `$schema`)

---

## Direction 11: Async Coordination / `all` and `race`

### Problem

The `async` chain operator fires commands concurrently, but there's no way to wait for all of them to complete or to take the first result. Real-world patterns like "fetch user data AND fetch preferences, then merge" or "try the cache first, fall back to network" require fan-out/fan-in semantics.

### Proposal: `all` and `race` Compound Operators

**Wait for all:**

```
[all
  body:[fetch source:/api/user destination:user]
  body:[fetch source:/api/prefs destination:prefs]]
then [merge source:user source:prefs destination:#profile]
```

**First to complete wins:**

```
[race
  body:[fetch source:/cache/data]
  body:[fetch source:/api/data]]
then [put destination:#result]
```

**Wire format:** `all` and `race` are `command` nodes with a `body` array (same pattern as `repeat`/`loopBody`). Each entry in the body runs concurrently.

```json
{
  "kind": "command",
  "action": "all",
  "roles": {},
  "body": [
    { "kind": "command", "action": "fetch", "roles": { "source": ... } },
    { "kind": "command", "action": "fetch", "roles": { "source": ... } }
  ]
}
```

**Semantics:**

- `all`: Runs all body commands concurrently. Resolves when all complete. Result is an array of individual results. If any command fails, the entire `all` fails (use `try`/`catch` from Direction 9 to handle partial failures).
- `race`: Runs all body commands concurrently. Resolves with the first to complete. Remaining commands are cancelled.

### Why This Matters

- Parallel data fetching is the most common async pattern in web applications
- Composes naturally with pipes (Direction 1) and error handling (Direction 9)
- The `async` chain operator only handles fire-and-forget; `all`/`race` handle coordination
- Critical for multi-agent and server-side scenarios

---

## Evaluation Matrix

| Direction                  | Complexity | v1.1 Compat | New Node Kinds | ABNF Change | Wire Change | Priority |
| -------------------------- | ---------- | ----------- | -------------- | ----------- | ----------- | -------- |
| 1. Pipe `\|>`              | Low        | Yes         | No             | Minimal     | Minimal     | **High** |
| 2. Destructuring `=> {}`   | Medium     | Yes         | No             | Small       | Small       | Medium   |
| 3. `with` blocks           | Medium     | Debatable   | Maybe          | Medium      | Medium      | Medium   |
| 4. `match` arms            | Medium     | Yes         | No             | Medium      | Medium      | **High** |
| 5. Annotations `@`         | Low        | Yes         | No             | Small       | Small       | **High** |
| 6. Templates `def`/`use`   | Medium     | Yes         | No (macro)     | Medium      | None        | Low      |
| 7. Type constraints        | Low        | Yes         | No             | None        | Optional    | **High** |
| 8. Collection operators    | Low        | Yes         | No             | None        | None        | Medium   |
| 9. `try`/`catch`/`finally` | Low        | Yes         | No             | Small       | Small       | **High** |
| 10. Version negotiation    | Low        | Yes         | No             | Minimal     | Minimal     | Medium   |
| 11. `all`/`race`           | Low        | Yes         | No             | Small       | Small       | **High** |

---

## Recommended Phasing

### v1.2: Incremental Extensions (Low Risk)

**Ship these first — they follow established v1.1 patterns:**

1. **Pipe operator** (`|>`) — new chain operator, minimal spec change
2. **Annotations** (`@timeout`, `@doc`) — orthogonal to commands, no structural change
3. **`try`/`catch`/`finally`** — follows `if`/`else` and `repeat`/`loopBody` pattern exactly
4. **Type constraints** — schema-level only, no syntax change
5. **Version header** — backward-compatible comment line
6. **`all`/`race`** — follows `repeat`/`loopBody` body-array pattern, complements pipes

### v1.3: Compositional Extensions (Medium Risk)

**Ship these after v1.2 proves stable:**

1. **`match` with arms** — new top-level field pattern, well-bounded (literal patterns only; defer guards and complex patterns)
2. **Collection operators** — new commands, no syntax change (requires resolving the embedded-expression question first)
3. **Destructuring** — new compound syntax, needs careful design (consider whether schema-level `yields` alone suffices)

### v2.0: Structural Extensions (Higher Risk)

**Ship these only if v1.x proves they're needed:**

1. **`with` blocks** — potentially a new node kind; consider TS-layer-only first
2. **Templates** — macro system; consider whether domain-level abstraction suffices

---

## Open Questions

1. **Should pipe `|>` auto-bind to `patient` or `source`?** The patient role is "what to act on" — semantically closer to piped data. But source is "where data comes from" — also valid. Proposal: bind to `patient` if absent, then `source` if absent, else error.

2. **~~Should annotations be ordered or unordered?~~** Resolved: use an array wire format (see Direction 5). Annotation order is preserved for middleware-like composition.

3. **Should `match` support guard clauses?** E.g., `arm:">100" guard:"currency == 'USD'"`. This adds power but significant complexity.

4. **Should destructuring support renaming?** E.g., `=> {body as data, status as code}`. Useful but adds parsing complexity.

5. **Should `with` blocks nest?** Nested `with` blocks create an inheritance chain. This is powerful but can be confusing. Proposal: single-level only (no nesting).

6. **Should error types be first-class in `catch`?** E.g., `catch-network:[retry]` vs `catch-validation:[show patient:#errors]`. This is useful but moves toward a full exception hierarchy.

7. **How do these interact with the LLM-simplified format?** Some features (pipes, annotations) need LLM-simplified equivalents. Others (destructuring, templates) might be too complex for LLM generation and should only appear in the full-fidelity format.

---

## Relationship to Existing Proposals

- **semantic-schema-evolution.md**: Directions 1, 2, 8, 11 complement the `agent` role and multi-target generation — pipes, collection operators, and `all`/`race` make data flow between agents explicit.
- **complex-patterns-strategy.md**: Directions 3, 4, 6, 9 address the "Level 4-6" complexity gaps — `match`, `try`/`catch`, and templates handle multi-line bodies, error recovery, and reusable patterns.
- **LSE-v1.1-Plan.md**: All directions follow the v1.1 design philosophy — prefer top-level fields on `command` nodes over new node kinds; keep the ABNF minimal; maintain backward compatibility.

# Protocol ↔ Hyperfixi Boundary

This document describes the boundary between the **LSE protocol layer** (this directory, `protocol/`) and the **hyperfixi application layer** (the rest of the monorepo, `packages/`). Understanding this boundary matters for contributors, for future authors extending LSE, and for reasoning about what changes require coordinated updates vs. what changes are local.

## The two layers

### Protocol layer (`protocol/`)

**Contents:**

- `spec/` — formal grammar (ABNF), wire format, JSON Schema, streaming convention, tokenization algorithm
- `test-fixtures/` — 121 language-independent conformance fixtures, packaged as `@lokascript/lse-conformance`
- `typescript/` — reference parser in TypeScript, packaged as `@lokascript/explicit-syntax`
- `python/` — reference parser in Python, packaged as `lokascript-explicit`
- `go/` — reference parser in Go
- `rust/` — reference parser in Rust, packaged as `lokascript-explicit`
- `docs/` — protocol documentation (this file, `vocabularies.md`, `defining-vocabularies.md`, `llm-guide.md`)

**Depends on:** nothing. The protocol layer has no dependencies on the hyperfixi application layer. Each reference parser has only its language's standard library plus minimal JSON serialization dependencies.

**Provides:** Layer A of LSE — grammar, wire format, tree structure, value types, conformance tests.

**Intended publishing:** eventually publishable as four standalone packages (npm, PyPI, crates.io, Go modules). Currently in-repo only. See the "Status" callout in [protocol/README.md](../README.md#contents).

### Hyperfixi layer (`packages/`)

**Relevant packages (there are many more):**

- `@lokascript/intent` — TypeScript implementation of Layer A types, parser, wire format. Zero runtime dependencies. Used as the in-monorepo source of truth for LSE types.
- `@hyperfixi/intent-element` — `<lse-intent>` custom element that accepts protocol JSON and executes it via the hyperfixi runtime.
- `@lokascript/framework` — multilingual DSL framework built on LSE. Provides `createMultilingualDSL()` for authoring new DSLs.
- `@hyperfixi/core` — hyperscript runtime and the 43 command implementations. Defines the UI-behavior vocabulary.
- `@lokascript/domain-*` — nine in-repo DSLs (SQL, BDD, JSX, flow, voice, etc.) built on the framework. Each defines its own vocabulary.
- `@lokascript/compilation-service` — generates React/Vue/Svelte components from LSE.
- `@lokascript/mcp-server` — MCP tools (`execute_lse`, `validate_lse`, `translate_lse`, ...) for LLM integration.

**Depends on:** the protocol layer (logically — in practice, `@lokascript/intent` is an in-monorepo re-implementation of the protocol TypeScript reference parser, not a dependency on `@lokascript/explicit-syntax`).

**Provides:**

- Layer B vocabularies (UI-behavior from `@hyperfixi/core`, plus 8 domain vocabularies from `domain-*`)
- DOM execution (`evalLSENode`, runtime, command implementations)
- Multilingual authoring (`createMultilingualDSL`, 24-language tokenizers)
- Application integration (custom element, MCP server, compilation service, language server)

## The rules

### Rule 1: The protocol layer has no application logic

**Lives in `protocol/`:** grammar, tokenization, serialization, deserialization, validation, conformance testing.

**Does NOT live in `protocol/`:** command execution, DOM manipulation, runtime behavior, framework integration, language detection, natural-language parsing, multilingual support.

Specifically:

- `evalLSENode()` lives in `@hyperfixi/core`, not in the protocol layer
- The `<lse-intent>` custom element lives in `@hyperfixi/intent-element`, not in the protocol layer
- Multilingual DSL authoring (`createMultilingualDSL()`) lives in `@lokascript/framework`, not in the protocol layer
- The 24-language tokenizers live in `@lokascript/semantic`, not in the protocol layer

If you find yourself tempted to put execution logic or framework glue into a reference parser, stop — that logic belongs in the hyperfixi layer.

### Rule 2: The protocol layer does not contain domain vocabularies

**Layer A (universal infrastructure) is in the protocol layer.** It is vocabulary-agnostic — the grammar and wire format accept any role name.

**Layer B (domain vocabularies) is in the hyperfixi layer.** The UI-behavior vocabulary is defined by `@hyperfixi/core`'s command implementations. SQL, BDD, JSX, etc. vocabularies are defined by `@lokascript/domain-*` packages. The protocol layer only _documents_ vocabularies (in `vocabularies.md`) for reference — it does not implement or enforce them.

This means:

- **Adding a new vocabulary is a hyperfixi-layer change.** You add a new `domain-*` package, define its schemas, register it with the framework. No protocol-layer changes needed.
- **Conformance fixtures test structure, not vocabulary.** The 121 fixtures in `test-fixtures/` verify Layer A (node kinds, value shapes, tree structure). They do not verify that a command uses a "correct" role name, because there is no correct set — vocabularies are per-domain.

### Rule 3: Protocol changes must be validated by all four reference parsers

Any change to the LSE grammar, wire format, JSON Schema, or conformance fixtures is a **protocol-layer change**. It must:

1. Be reflected in the ABNF grammar ([spec/lokascript-explicit-syntax.abnf](../spec/lokascript-explicit-syntax.abnf))
2. Be reflected in the wire format spec ([spec/wire-format.md](../spec/wire-format.md)) and JSON Schema ([spec/lse-wire-format.schema.json](../spec/lse-wire-format.schema.json))
3. Be implemented in all four reference parsers (`typescript/`, `python/`, `go/`, `rust/`)
4. Be tested by updated conformance fixtures in `test-fixtures/`
5. Be reflected in a version bump of the spec (`protocol/spec/README.md` lists the current version)

A change that only updates the hyperfixi TypeScript implementation (`@lokascript/intent`) without updating the other three reference parsers is a **drift risk** and should be avoided. Either update all four, or keep the change in hyperfixi and file a protocol-change proposal for later coordination.

### Rule 4: Shared grammar and semantic types must stay consistent; hyperfixi-layer extensions are allowed

`@lokascript/intent` in the hyperfixi layer is **not** a duplicate of `@lokascript/explicit-syntax` in `protocol/typescript/`. It is intentionally a **superset** that shares the grammar and semantic type definitions with the protocol reference parser and adds hyperfixi-layer features on top:

- **Shared with the protocol layer** (must stay consistent):
  - Bracket syntax parsing rules and tokenization algorithm
  - Semantic node kinds (command, event-handler, conditional, compound, loop)
  - Value types (selector, literal, reference, property-path, expression, flag)
  - Wire format node shapes

- **Extensions unique to the hyperfixi layer** (not in the protocol reference parser, and legitimately so):
  - Schema definition and validation (`defineCommand`, `defineRole`, `getRoleSpec`)
  - Diagnostic collection infrastructure (`DiagnosticCollector`, `filterBySeverity`, collect-don't-throw parsing mode)
  - Protocol JSON wire-format serialization (`toProtocolJSON`, `fromProtocolJSON`, envelope helpers)
  - v1.2 features (try/catch, match arms, annotations) — these live in `@lokascript/intent` because they are used by the framework and domains; they are candidates for eventual promotion to the protocol layer, but do not need to be there today

These extensions exist because hyperfixi-layer consumers (framework, intent-element, compilation-service, MCP tools) need more than the minimal reference parser provides. External protocol consumers who don't need schema validation or diagnostics should use `@lokascript/explicit-syntax` directly.

**The rule is about the shared layer, not the extensions:**

- Changes to bracket syntax, tokenization, node kinds, or value types — the shared layer — must land in **both** `@lokascript/intent` and `@lokascript/explicit-syntax` (plus the other three reference parsers, plus spec and conformance fixtures). See Rule 3.
- Changes to schema APIs, diagnostics, wire-format serialization helpers, or other hyperfixi-layer extensions stay in `@lokascript/intent` and do not need to be replicated in the protocol reference parsers.

**The anti-pattern** is changing bracket syntax, tokenization, or semantic type shapes in `@lokascript/intent` without also updating the protocol reference parsers. That creates a fork in the shared layer: consumers of the protocol layer see one grammar; consumers of the hyperfixi layer see another. Both then become load-bearing and incompatible. Adding new schema helpers, diagnostic codes, or wire-format serialization utilities to `@lokascript/intent` is **not** the anti-pattern — those are exactly the hyperfixi-layer extensions this rule permits.

### Rule 5: The bracket syntax is for LLMs, conformance, and CLI debugging — not for humans inside hyperfixi

The bracket syntax `[toggle patient:.active destination:#button]` is a first-class feature of the protocol layer. It is useful for LLM emission (compact, structured), conformance testing (text-in, JSON-out fixtures), and command-line debugging.

Inside hyperfixi, the bracket syntax is NOT a recommended authoring format for humans. Humans should write in their native DSL (hyperscript, SQL, etc.) and let the DSL produce LSE structures behind the scenes. Hyperfixi-layer docs and examples should not position bracket syntax as something users write by hand.

This is covered in `lse-directions.md` under "Sunset Candidates → Bracket syntax — scope correction."

### Rule 6: The protocol layer is domain-agnostic; the hyperfixi layer is hyperscript-centric

The protocol layer must work for any imperative command DSL, not just hyperscript. When making protocol-layer changes, verify:

- Does this change work for SQL? For JSX? For BDD?
- Does this change assume a DOM is present? (It should not.)
- Does this change assume a specific vocabulary (e.g., Fillmore's case roles)? (It should not.)

The hyperfixi layer is allowed to be hyperscript-centric — that's what it's for. But the protocol layer must remain general enough that a completely independent DSL (with no hyperscript knowledge) can adopt it without friction.

## Worked examples

### Example 1: Adding a new value type (protocol change)

**Task:** add a new value type `dateTime` alongside the existing `literal`, `selector`, `reference`, etc.

**Where does the work go?**

1. **Protocol layer:**
   - Update `spec/lokascript-explicit-syntax.abnf` to describe the dateTime syntax
   - Update `spec/wire-format.md` and `spec/lse-wire-format.schema.json` to include the new JSON shape
   - Implement parsing/serialization in all four reference parsers
   - Add conformance fixtures in `test-fixtures/datetime.json`
   - Bump the spec version (1.2.0 → 1.3.0)

2. **Hyperfixi layer (after protocol change lands):**
   - Update `@lokascript/intent` to match the new reference parser behavior
   - Update `@lokascript/framework` tokenizers if needed to produce dateTime values
   - Update domain schemas (e.g., `domain-flow`) to use the new type if relevant

**Rule applied:** Rule 3 (all four parsers) and Rule 4 (protocol first, hyperfixi second).

### Example 2: Adding a new DSL for CSS animations (hyperfixi change only)

**Task:** build a `domain-anim` package for CSS animation DSL with actions like `fade`, `slide`, `bounce`.

**Where does the work go?**

1. **Hyperfixi layer:**
   - Create `packages/domain-anim/` with schemas, profiles, tokenizers, code generator
   - Choose a vocabulary (mostly reuse Layer A roles since animations are imperative UI, or invent domain-specific ones where needed)
   - Document the vocabulary in `protocol/docs/vocabularies.md` (this is documentation of a new vocabulary, not a protocol change)
   - Test that the DSL produces wire-format-conformant JSON using existing `@lokascript/intent`

2. **Protocol layer:**
   - **No changes needed.** The protocol grammar and wire format already accept any role names; a new vocabulary is purely a hyperfixi-layer addition.

**Rule applied:** Rule 2 (vocabularies are hyperfixi-layer) and Rule 6 (protocol stays general).

### Example 3: Adding a safety gate for LLM-generated commands (hyperfixi change only)

**Task:** sandbox LSE execution so LLMs can't issue commands that navigate off-domain or exfiltrate data.

**Where does the work go?**

1. **Hyperfixi layer:**
   - Add an allowlist/denylist mechanism to `@hyperfixi/core`'s `evalLSENode()`
   - Update `@hyperfixi/intent-element` to enforce the allowlist before execution
   - Add schema-level constraints in the relevant domain packages

2. **Protocol layer:**
   - **No changes needed.** Execution sandboxing is an application-layer concern. The protocol defines _what a command means structurally_, not _whether a runtime should execute it_.

**Rule applied:** Rule 1 (no application logic in the protocol layer).

### Example 4: Dropping the "LLM-simplified JSON" format (protocol change)

**Task:** if we decided to remove LLM-simplified JSON (we are not — this is a hypothetical).

**Where does the work go?**

1. **Protocol layer:**
   - Remove the format from `spec/wire-format.md`
   - Remove the acceptance path from all four reference parsers' `fromJSON()` implementations
   - Remove the `test-fixtures/llm-simplified.json` fixtures
   - Bump the spec version (this is a breaking change)

2. **Hyperfixi layer:**
   - Update `@lokascript/intent`'s `fromProtocolJSON()` to drop the simplified-format path
   - Audit any consumer in the monorepo that emits LLM-simplified JSON and migrate them

**Rule applied:** Rule 3 (all four parsers) and Rule 4 (protocol first, hyperfixi second).

## Summary table

| Change type                    | Protocol? | Hyperfixi? | Rules invoked |
| ------------------------------ | --------- | ---------- | ------------- |
| Grammar change (new syntax)    | ✓         | ✓ (after)  | 3, 4          |
| New value type                 | ✓         | ✓ (after)  | 3, 4          |
| New wire-format field          | ✓         | ✓ (after)  | 3, 4          |
| New domain vocabulary          | ✗         | ✓          | 2, 6          |
| New DSL (e.g., `domain-anim`)  | ✗         | ✓          | 2, 6          |
| New runtime command            | ✗         | ✓          | 1             |
| Execution sandboxing           | ✗         | ✓          | 1             |
| New MCP tool                   | ✗         | ✓          | 1             |
| Documentation for a vocabulary | protocol  | ✗          | 2             |
| Breaking the wire format       | ✓         | ✓ (after)  | 3, 4          |

## If you're unsure

Ask this question: **"Would a completely independent DSL author — someone who doesn't know hyperscript exists — need this change to use LSE in their project?"**

- **Yes:** it's a protocol-layer change. All four parsers, conformance fixtures, spec version bump.
- **No:** it's a hyperfixi-layer change. Just update the relevant packages.

The protocol layer is the part that stays stable across all LSE consumers. The hyperfixi layer is where hyperscript-specific and application-specific concerns live. Keep them separated and the protocol stays clean.

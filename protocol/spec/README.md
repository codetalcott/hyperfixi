# LokaScript Explicit Syntax (LSE) Specification

**Version**: 2.0.0

## Overview

LSE (LokaScript Explicit Syntax) is a two-layer protocol for representing imperative commands:

**Layer A — Universal infrastructure.** Grammar, tokenization, wire format, and tree structure. Every LSE implementation must support Layer A, and every LSE-conformant document uses it.

**Layer B — Pluggable domain vocabularies.** Action and role names that describe a specific domain. Different DSLs use different vocabularies. The UI-behavior vocabulary (Fillmore-inspired) is the reference vocabulary used by hyperscript, but it is not the only vocabulary and LSE does not require it. See [vocabularies.md](../docs/vocabularies.md) for the catalog of vocabularies currently in use.

The canonical bracket form illustrates Layer A structure; the role names chosen illustrate a Layer B vocabulary:

```text
[toggle patient:.active destination:#button]          # UI-behavior vocabulary
[select columns:name source:users condition:age>25]  # SQL vocabulary
[column name:id type:uuid +primary-key +not-null]    # SQL vocabulary (DDL)
```

All of these are valid LSE. All parse via the same grammar and serialize to the same wire format. They differ only in which role names they use.

## Design Principles

1. **Universal infrastructure, pluggable vocabularies.** Layer A works for any imperative command domain. Layer B is defined per-domain.
2. **Language-agnostic grammar.** Layer A has no word order, particles, or prepositions. Surface-language differences (SVO, SOV, VSO, agglutination) are a concern for _authoring_ DSLs that target LSE, not for LSE itself.
3. **Self-documenting.** Every value is labeled with its role name. Role names are chosen by the vocabulary.
4. **Machine-readable.** Trivial to parse: `[action role:value +flag ...]`.
5. **LLM-friendly.** Bracket syntax is compact and structured enough for reliable LLM generation. For LLMs constrained to JSON output (function-calling APIs), an LLM-simplified JSON format is also supported.
6. **Roundtrip-safe.** `parse → render → parse` is identity within Layer A. Vocabularies that use non-standard role names round-trip just as reliably as the reference UI-behavior vocabulary.
7. **Domain-extensible.** A new domain adds a vocabulary (Layer B). It does not need to modify the grammar, the wire format, or any reference parser.

## Scope and Non-goals

LSE is designed for imperative command DSLs. A few things LSE is deliberately NOT:

- **Not a universal semantic interlingua.** The protocol does not impose a single meaning on role names across domains. A `patient` role in a UI-behavior context means "the element being acted on"; the same role name in another vocabulary may mean something different. LSE provides the _structure_ vocabularies share, not a harmonization of their _meaning_.
- **Not a natural-language understanding (NLU) system.** LSE does not parse "click the red button" into structured commands. That is the job of the DSLs built on top of LSE.
- **Not a data description or configuration language.** LSE describes imperative actions ("do X"). Declarative structures (schemas, configuration trees, data serialization) should use other formats (JSON Schema, YAML, Protocol Buffers).

## Syntax Summary

```
[command role1:value1 role2:value2 +flag1 ~flag2]
```

| Element          | Syntax                                      | Example                         |
| ---------------- | ------------------------------------------- | ------------------------------- |
| Command          | first token                                 | `toggle`, `select`, `add`       |
| Role pair        | `name:value`                                | `patient:.active`               |
| Enabled flag     | `+name`                                     | `+primary-key`                  |
| Disabled flag    | `~name`                                     | `~nullable`                     |
| String literal   | `"..."` or `'...'`                          | `patient:"hello world"`         |
| Selector         | `#id`, `.class`, `[attr]`, `@aria`, `*wild` | `destination:#button`           |
| Selector literal | `<...selector.../>`                         | `patient:<ul > li/>`            |
| Boolean          | `true` / `false`                            | `goal:true`                     |
| Number           | digits with optional decimal                | `quantity:5`, `ratio:3.14`      |
| Duration         | number + suffix                             | `delay:500ms`, `timeout:2s`     |
| Reference        | built-in name                               | `destination:me`, `source:it`   |
| Nested body      | bracket command in value                    | `body:[toggle patient:.active]` |
| Compound         | chain operator between commands             | `[add ...] then [fetch ...]`    |

## Formal Grammar

See [lokascript-explicit-syntax.abnf](lokascript-explicit-syntax.abnf) for the RFC 5234 ABNF grammar.

## Tokenization Algorithm

ABNF is context-free, but LSE tokenization is context-sensitive. The tokenizer is a single-pass state machine that splits on spaces only at bracket-depth 0, outside quoted strings, and outside selector literals.

### State Variables

| Variable        | Type      | Initial |
| --------------- | --------- | ------- |
| `bracket_depth` | integer   | 0       |
| `in_string`     | boolean   | false   |
| `string_char`   | character | (none)  |
| `in_selector`   | boolean   | false   |
| `current_token` | string    | ""      |

### Algorithm

The branch order is normative. The string check precedes the selector check, so a
`/>` inside a quoted string does not terminate a selector literal. A `<` opens a
selector literal only at the start of a value — when `current_token` is empty or
ends with `:` — so a stray `<` in a plain value cannot swallow the next token.

```
for each character c in input:
  if in_string:
    append c to current_token
    if c == string_char AND preceding_backslash_count is even:
      in_string = false
    continue

  if c == '"' or c == "'":
    in_string = true
    string_char = c
    append c to current_token
    continue

  if in_selector:
    append c to current_token
    if c == '>' AND current_token ends with "/>":
      in_selector = false
    continue

  if c == '<' AND (current_token is empty OR current_token ends with ':'):
    in_selector = true
    append c to current_token
    continue

  if c == '[':
    bracket_depth += 1
    append c to current_token
    continue

  if c == ']':
    bracket_depth -= 1
    append c to current_token
    continue

  if c == ' ' AND bracket_depth == 0:
    if current_token is not empty:
      emit current_token
      current_token = ""
    continue

  append c to current_token

if current_token is not empty:
  emit current_token
```

Note that `[` and `]` inside a selector literal are consumed by the `in_selector`
branch and therefore never change `bracket_depth` — correct, because the closing
`/>` already delimits them.

### Value Classification Priority

After tokenization, role values are classified in this order (first match wins):

1. **Selector literal** — starts with `<` and ends with `/>`; delimiters stripped
2. **Selector** — starts with `#`, `.`, `[`, `@`, or `*`
3. **String literal** — starts with `"` or `'`
4. **Boolean** — exact match `true` or `false` (case-sensitive)
5. **Reference** — matches a known reference name (case-insensitive lookup)
6. **Duration** — number followed by `ms`, `s`, `m`, or `h`
7. **Number** — integer or decimal (no suffix)
8. **Plain value** — fallback (stored as string literal)

This ordering matters: `#true` is a selector (not boolean), `event` is a reference (not a plain string), `500ms` is a duration (not a number), and `<div/>` is a selector (not a plain value).

A value that starts with `<` but does not end with `/>` is a parse error ("unterminated selector literal"), not a plain value.

### Selector Kinds

Every selector carries an optional `selectorKind`, inferred from its value.
Combinators are checked **first**, so `.a > .b` is `complex` rather than `class`.
A combinator character inside a quoted span does not count, so
`[aria-label="Close menu"]` is `attribute` rather than `complex`:

| Test (in order)                                   | Kind        |
| ------------------------------------------------- | ----------- |
| contains an unquoted space, `>`, `+`, `~`, or `,` | `complex`   |
| starts with `#`                                   | `id`        |
| starts with `.`                                   | `class`     |
| starts with `[`                                   | `attribute` |
| starts with `*`                                   | `element`   |
| otherwise                                         | (unset)     |

String literals are unescaped on parse and re-escaped on render, so a value
containing `"` or `\` round-trips unchanged.

### Normalization Rules

- Command names are lowercased: `Toggle` -> `toggle`
- Role names preserve their original case
- Reference lookup is case-insensitive: `Me` matches `me`
- Boolean matching is case-sensitive: only `true` and `false` (not `True` or `FALSE`)

## Default References

The default reference set contains 7 built-in symbolic names:

| Reference | Meaning                     |
| --------- | --------------------------- |
| `me`      | The current element         |
| `you`     | The target element          |
| `it`      | The last result             |
| `result`  | The last computation result |
| `event`   | The triggering event        |
| `target`  | The event target            |
| `body`    | The document body           |

Implementations MAY extend this set for domain-specific references via configuration. Extended references MUST NOT conflict with other value types (e.g., don't add `true` as a reference).

## Event Handlers

Event handlers use the special `on` command with an `event` role and optional `body` role:

```
[on event:click body:[toggle patient:.active]]
```

The `body` role value is a nested bracket command, recursively parsed. Event handlers produce a different node kind (`event-handler` vs `command`).

## Structural Roles

These role names carry a nested bracket command rather than a plain value:

`body`, `then`, `else`, `condition`, `loop-body`, `variable`, `catch`, `finally`

**Resolution rule (v2.0):** in a structural role, a value starting with `[` is **always** a nested bracket command. To write an attribute selector in a structural role, use a selector literal:

```text
[on event:click body:[toggle patient:.active]]   # nested command
[on event:click body:[halt]]                     # nested command (zero-arg)
[if condition:<[data-active]/>]                  # attribute selector
[toggle patient:[data-active]]                   # selector (non-structural role)
```

Non-structural roles are unaffected — a nested command can only appear in a structural role, so a bare `[attr]` there is unambiguous.

> **Changed in v2.0 (breaking).** v1.x decided by inspecting the inner content: a nested command if it contained a space or `:` at bracket-depth 0, an attribute selector otherwise. That heuristic is unsound. `[halt]` is simultaneously a well-formed zero-argument command and a well-formed attribute selector, so v1.x parsed `body:[halt]` as a selector and **silently dropped the command** — as it did for every zero-argument command (`halt`, `exit`, `break`, `continue`, `beep`). Conversely `condition:[aria-label="Close menu"]` contains a space and was misparsed as a nested command. No content inspection can separate the two cases; only a delimiter can.

### The `body` Dual Role

The name `body` serves two purposes in LSE:

1. **Reference** — In the default reference set, `body` refers to the document body (e.g., `destination:body` targets `document.body`).
2. **Structural role** — In event handlers, `body` is a role name whose value contains a nested bracket command.

**Resolution rule:** When parsing a role named `body`, if the value starts with `[`, it is treated as a nested bracket command (structural). Otherwise, `body` appearing as a value (e.g., `destination:body`) is classified as a reference through the normal value classification priority.

This means `body:[toggle patient:.active]` is structural (parsed as nested command), while `destination:body` is a reference (the document body).

## Compound Statements

Multiple commands can be chained with operators:

```
[add patient:.loading] then [fetch source:/api/data]
```

Chain operators: `then`, `and`, `async`, `sequential`.

Compound statements are rendered by joining each bracket command with the chain operator surrounded by spaces.

> **Note:** In v1.0.0, compound statement _parsing_ from bracket syntax is not yet implemented in the reference parsers. Compound nodes can be constructed from JSON (via `from_json`) and rendered to bracket syntax (via `render_explicit`). Parsing compound bracket syntax is planned for a future minor version.

## MIME Types

| MIME Type                                    | Use                      |
| -------------------------------------------- | ------------------------ |
| `application/vnd.lokascript.explicit`        | Single LSE statement     |
| `application/vnd.lokascript.explicit-stream` | Streaming (one per line) |

File extension: `.lse`

See [streaming.md](streaming.md) for the streaming convention.

## Wire Format

LSE has two JSON representations for interchange:

1. **Full-fidelity** — lossless round-trip, used between tools
2. **LLM-simplified** — compact format for LLM generation

See [wire-format.md](wire-format.md) for both formats.

## Versioning

This spec follows semantic versioning. The grammar version is declared at the top of the ABNF file.

- **Patch** (1.0.x) — Clarifications, typo fixes, no behavior change
- **Minor** (1.x.0) — New value types, new chain operators, backward-compatible
- **Major** (x.0.0) — Breaking changes to existing syntax

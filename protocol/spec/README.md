# LokaScript Explicit Syntax (LSE) Specification

**Version**: 1.0.0

## Overview

The LokaScript Explicit Syntax (LSE) is a language-agnostic, role-labeled format for imperative commands. It serves as a universal interchange format between tools, languages, and runtimes.

```
[toggle patient:.active destination:#button]
[select patient:name source:users condition:age>25]
[column name:id type:uuid +primary-key +not-null]
```

The format is inspired by Fillmore's case grammar (1968) — semantic roles (patient, destination, source) are universal across natural languages. LSE makes these roles explicit, eliminating word order and morphology from the representation.

## Design Principles

1. **Language-agnostic** — No word order, particles, or prepositions
2. **Self-documenting** — Every value is labeled with its semantic role
3. **Machine-readable** — Trivial to parse: `[action role:value +flag ...]`
4. **LLM-friendly** — Structured enough for reliable generation
5. **Roundtrip-safe** — `parse -> render -> parse` is identity
6. **Domain-portable** — Same format for any imperative domain

## Syntax Summary

```
[command role1:value1 role2:value2 +flag1 ~flag2]
```

| Element        | Syntax                                      | Example                         |
| -------------- | ------------------------------------------- | ------------------------------- |
| Command        | first token                                 | `toggle`, `select`, `add`       |
| Role pair      | `name:value`                                | `patient:.active`               |
| Enabled flag   | `+name`                                     | `+primary-key`                  |
| Disabled flag  | `~name`                                     | `~nullable`                     |
| String literal | `"..."` or `'...'`                          | `patient:"hello world"`         |
| Selector       | `#id`, `.class`, `[attr]`, `@aria`, `*wild` | `destination:#button`           |
| Boolean        | `true` / `false`                            | `goal:true`                     |
| Number         | digits with optional decimal                | `quantity:5`, `ratio:3.14`      |
| Duration       | number + suffix                             | `delay:500ms`, `timeout:2s`     |
| Reference      | built-in name                               | `destination:me`, `source:it`   |
| Nested body    | bracket command in value                    | `body:[toggle patient:.active]` |
| Compound       | chain operator between commands             | `[add ...] then [fetch ...]`    |

## Formal Grammar

See [lokascript-explicit-syntax.abnf](lokascript-explicit-syntax.abnf) for the RFC 5234 ABNF grammar.

## Tokenization Algorithm

ABNF is context-free, but LSE tokenization is context-sensitive. The tokenizer is a single-pass state machine that splits on spaces only at bracket-depth 0 and outside quoted strings.

### State Variables

| Variable        | Type      | Initial |
| --------------- | --------- | ------- |
| `bracket_depth` | integer   | 0       |
| `in_string`     | boolean   | false   |
| `string_char`   | character | (none)  |
| `current_token` | string    | ""      |

### Algorithm

```
for each character c in input:
  if in_string:
    append c to current_token
    if c == string_char AND previous character != '\':
      in_string = false
    continue

  if c == '"' or c == "'":
    in_string = true
    string_char = c
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

### Value Classification Priority

After tokenization, role values are classified in this order (first match wins):

1. **Selector** — starts with `#`, `.`, `[`, `@`, or `*`
2. **String literal** — starts with `"` or `'`
3. **Boolean** — exact match `true` or `false` (case-sensitive)
4. **Reference** — matches a known reference name (case-insensitive lookup)
5. **Duration** — number followed by `ms`, `s`, `m`, or `h`
6. **Number** — integer or decimal (no suffix)
7. **Plain value** — fallback (stored as string literal)

This ordering matters: `#true` is a selector (not boolean), `event` is a reference (not a plain string), `500ms` is a duration (not a number).

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

## Compound Statements

Multiple commands can be chained with operators:

```
[add patient:.loading] then [fetch source:/api/data]
```

Chain operators: `then`, `and`, `async`, `sequential`.

Compound statements are rendered by joining each bracket command with the chain operator surrounded by spaces.

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

---
name: hyperfixi-codegen
description: 'Validates HyperFixi/LokaScript (a semantic dry-run) and compares two behaviors. Use when the user wants a validation dry-run or a behavioral comparison. Component and test generation are deprecated (removed in 6.0).'
---

# HyperFixi Code Generation

Validate HyperFixi/LokaScript code and compare behaviors. (Compiling to JavaScript, `compile_hyperscript`, retired with the AOT compiler in 4.0: hyperscript runs as written, in an `_="..."` attribute, on `@hyperfixi/engine`.)

**`generate_component` and `generate_tests` are deprecated and removed in 6.0.** Measured on 169 real inputs, 15 gave a Playwright test that checks the behavior, and a component for any command aimed at another element did not compile. Don't offer them: write the component or the test directly.

## When to Use

- Validate semantics (dry-run)
- Compare two inputs for behavioral equivalence

## Workflow

### 1. Choose the Operation

| Goal                       | Tool                   |
| -------------------------- | ---------------------- |
| Dry-run (semantic IR only) | `validate_and_compile` |
| Compare behaviors          | `diff_behaviors`       |

### 2. Validate

Every tool accepts 3 input formats:

```
validate_and_compile({ code: "on click toggle .active", language: "en" })
validate_and_compile({ explicit: "[toggle patient:.active destination:#btn]" })
validate_and_compile({ semantic: { action: "toggle", roles: { patient: { type: "selector", value: ".active" } } } })
```

`validate_and_compile` returns semantic IR and diagnostics; for natural-language input it also reports the engine's own parse error, if any.

## Behavior Comparison

Compare two inputs at the semantic level:

```
diff_behaviors({
  a: { code: "on click toggle .active", language: "en" },
  b: { code: "クリック で .active を トグル", language: "ja" }
})
```

Returns whether they are semantically identical, plus trigger and operation diffs.

## Explicit Bracket Syntax

The language-agnostic IR format `[command role:value ...]`:

```
[toggle patient:.active destination:#button]
[set patient::count goal:0]
[fetch source:/api/data manner:json]
```

## Common Mistakes

1. **Wrong input format** -- every tool accepts `code`, `explicit`, or `semantic`; don't mix them in one call
2. **Missing `language` for non-English** -- pass `language: "ja"` etc. when input is not English
3. **Expecting runtime behavior from dry-run** -- `validate_and_compile` returns IR, not executable code

## MCP Tools

### Validation & Comparison

| Tool                   | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `validate_and_compile` | Parse to semantic IR with diagnostics            |
| `generate_component`   | Deprecated, removed in 6.0                       |
| `generate_tests`       | Deprecated, removed in 6.0                       |
| `diff_behaviors`       | Compare two inputs for semantic equivalence      |
| `translate_code`       | Translate code between languages (high fidelity) |

### IR Format Conversion

| Tool                | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `convert_format`    | Convert between bracket syntax, protocol JSON, and AST    |
| `validate_explicit` | Validate bracket syntax (fast, no compilation)            |
| `validate_protocol` | Validate protocol JSON node (v1.1/v1.2 structural checks) |
| `to_envelope`       | Wrap protocol JSON nodes into LSE v1.2 envelope           |
| `from_envelope`     | Unwrap LSE v1.2 envelope into constituent nodes           |

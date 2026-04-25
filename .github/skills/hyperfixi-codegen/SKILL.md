---
name: hyperfixi-codegen
description: 'Compiles HyperFixi/LokaScript to JavaScript, generates React/Vue/Svelte components, and produces Playwright tests. Use when user wants compiled output, framework components, test generation, or behavioral comparison.'
---

# HyperFixi Code Generation

Compile HyperFixi/LokaScript code to JavaScript, generate framework components, and produce Playwright tests.

## When to Use

- Compile HyperFixi code to optimized JavaScript
- Generate React, Vue, or Svelte components from HyperFixi behavior
- Generate Playwright tests from HyperFixi code
- Validate semantics without compiling (dry-run)
- Compare two inputs for behavioral equivalence

## Workflow

### 1. Choose the Operation

| Goal                       | Tool                   |
| -------------------------- | ---------------------- |
| Compile to JS              | `compile_hyperscript`  |
| Dry-run (semantic IR only) | `validate_and_compile` |
| Generate component         | `generate_component`   |
| Generate tests             | `generate_tests`       |
| Compare behaviors          | `diff_behaviors`       |

### 2. Compile or Generate

**Compile to JavaScript** -- accepts 3 input formats:

```
compile_hyperscript({ code: "on click toggle .active", language: "en" })
compile_hyperscript({ explicit: "[toggle patient:.active destination:#btn]" })
compile_hyperscript({ semantic: { action: "toggle", roles: { patient: { type: "selector", value: ".active" } } } })
```

**Generate a component:**

```
generate_component({ code: "on click toggle .active", framework: "react" })
```

- **React:** Hooks + JSX (TypeScript by default)
- **Vue:** SFC with `<script setup>` + `<template>`
- **Svelte:** Runes (`$state`, `bind:this`)

**Generate tests:**

```
generate_tests({ code: "on click toggle .active", testName: "toggle active class" })
```

### 3. Validate the Output

Use `validate_and_compile` for a dry-run that returns semantic IR without generating JavaScript:

```
validate_and_compile({ code: "on click toggle .active" })
```

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

1. **Wrong input format** -- `compile_hyperscript` accepts `code`, `explicit`, or `semantic`; don't mix them in one call
2. **Missing `language` for non-English** -- pass `language: "ja"` etc. when input is not English
3. **Expecting runtime behavior from dry-run** -- `validate_and_compile` returns IR, not executable code
4. **Ignoring framework differences** -- React uses hooks, Vue uses SFC, Svelte uses runes; generated code is idiomatic per framework

## MCP Tools

### Compilation & Generation

| Tool                   | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `compile_hyperscript`  | Compile to optimized JavaScript                  |
| `validate_and_compile` | Parse to semantic IR without generating JS       |
| `generate_component`   | Generate React/Vue/Svelte component              |
| `generate_tests`       | Generate Playwright behavior tests               |
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

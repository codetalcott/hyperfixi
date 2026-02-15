# domain-jsx Improvement Plan

**Date:** 2026-02-15
**Current state:** 66 tests passing, 4 languages (EN, ES, JA, AR), 6 commands

---

## Review Summary

### Issues Fixed

1. **`parseProps()` space-in-quotes bug** — The function split on `\s+`, breaking for quoted values containing spaces (e.g., `className "my app"` → broken JSX). Added `tokenizeProps()` that respects quote boundaries.

2. **Docstring example wrong token order** — `index.ts` docstring had `'count 初期値 0 状態'` (doesn't parse) instead of `'count 0 初期値 状態'` (correct SOV order).

3. **Dead multi-word keyword entries** — `'with props'`, `'con props'`, `'مع خصائص'` in keyword sets were dead code — tokenizers classify individual tokens, never multi-word strings.

4. **Unused singleton tokenizer exports** — Module-level `englishTokenizer`, `spanishTokenizer`, etc. singletons exported but never imported anywhere. Removed.

5. **Tokenizer boilerplate** — 4 hand-written tokenizer classes (~230 lines) replaced with 4 `createSimpleTokenizer()` calls (~120 lines). Same behavior, less code.

6. **`build:types` producing no output** — `tsc --emitDeclarationOnly` was silently failing due to `noEmit: true` in tsconfig. Added `--noEmit false` flag (matching domain-bdd pattern).

7. **No MCP tools** — Added 4 MCP tools (`parse_jsx`, `compile_jsx`, `validate_jsx`, `translate_jsx`) following the established SQL/BDD domain pattern.

8. **Missing test coverage** — Added 10 new tests: cross-language compilation equivalence, code generation edge cases, multi-language validation error handling.

### Known Limitations Discovered

- **Single-token role capture** — Pattern matcher captures one token per role. `component Button with props text onClick` captures `Button` as name but `text onClick` is not captured as props. Affects component and fragment commands with multi-token values.

- **Multi-word markers** — `'with props'` as a marker doesn't work because the tokenizer produces two separate tokens `'with'` and `'props'`. The framework would need greedy multi-word marker support.

---

## Phase 1: Framework-Level Fixes (Prerequisite)

These improvements require changes in `@lokascript/framework`:

### 1a. Multi-token role value capture

**Priority:** High | **Effort:** Medium

Currently each role captures exactly one token. JSX needs multi-token capture for:

- Props: `className "app" disabled onClick`
- Children: `header sidebar footer`

**Approach:** Add `greedy: true` option to `defineRole()` that captures remaining tokens until the next marker or end of input. Last role in sequence should default to greedy.

### 1b. Multi-word marker support

**Priority:** Medium | **Effort:** Low

`markerOverride: { en: 'with props' }` doesn't work because the tokenizer produces two tokens.

**Approach:** Either allow the pattern matcher to consume multiple consecutive marker tokens, or change the component schema to use a single-word marker (e.g., `props` instead of `with props`).

---

## Phase 2: Expanded Language Support

### 2a. Add Korean (SOV)

**Priority:** Medium | **Effort:** Low

```
element: 요소, component: 컴포넌트, render: 렌더링, state: 상태, effect: 효과, fragment: 프래그먼트
```

### 2b. Add Chinese (SVO)

**Priority:** Medium | **Effort:** Low

```
element: 元素, component: 组件, render: 渲染, state: 状态, effect: 效果, fragment: 片段
```

### 2c. Add Turkish (SOV)

**Priority:** Low | **Effort:** Low

### 2d. Add French (SVO)

**Priority:** Low | **Effort:** Low

Pattern: copy an existing SVO profile, translate keywords, add tokenizer config.

---

## Phase 3: Renderer (Roundtrip)

### 3a. Natural language renderer

**Priority:** Medium | **Effort:** Medium

Add a `renderJSX(node, language)` function that converts a semantic node back to the natural language form. This enables `translate_jsx` to produce actual translations rather than just compiled JSX output.

**Pattern:** Follow domain-bdd's `bdd-renderer.ts` approach, using `isSOV(lang)` / `isVSO(lang)` helpers to determine word order.

### 3b. Export from package

**Priority:** Low | **Effort:** Low

```typescript
export { renderJSX } from './generators/jsx-renderer';
```

---

## Phase 4: Enhanced Code Generation

### 4a. TypeScript output mode

**Priority:** Low | **Effort:** Medium

Generate TypeScript instead of plain JavaScript:

```typescript
// state count initial 0
const [count, setCount] = useState<number>(0);

// component Button with props text onClick
function Button({ text, onClick }: { text: string; onClick: () => void }) {
  return null;
}
```

### 4b. Component body generation

**Priority:** Low | **Effort:** Medium

Allow specifying return JSX in component definitions:

```
component Header returning element h1 containing "Hello"
→ function Header() { return <h1>Hello</h1>; }
```

Requires Phase 1a (multi-token capture) for the body content.

---

## Phase 5: Infrastructure

### 5a. Add to CI

**Priority:** High | **Effort:** Low

Add `domain-jsx` to `.github/workflows/ci.yml` alongside domain-sql and domain-bdd.

### 5b. README.md

**Priority:** Medium | **Effort:** Low

Standard package README with examples for each language.

---

## Implementation Priority

| Phase | Item                      | Priority | Effort | Dependencies     |
| ----- | ------------------------- | -------- | ------ | ---------------- |
| 5a    | CI integration            | High     | Low    | None             |
| 1a    | Multi-token role capture  | High     | Medium | Framework change |
| 1b    | Multi-word marker support | Medium   | Low    | Framework change |
| 2a    | Korean support            | Medium   | Low    | None             |
| 2b    | Chinese support           | Medium   | Low    | None             |
| 3a    | Natural language renderer | Medium   | Medium | None             |
| 5b    | README.md                 | Medium   | Low    | None             |
| 4a    | TypeScript output         | Low      | Medium | None             |
| 2c    | Turkish support           | Low      | Low    | None             |
| 2d    | French support            | Low      | Low    | None             |
| 4b    | Component body gen        | Low      | Medium | 1a               |

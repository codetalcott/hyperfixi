# Parser Feature Additions Plan

**Date**: 2025-12-02
**Status**: Planning
**Context**: Test Failure Resolution - Phase 5

---

## Overview

This document outlines 6 parser features needed to fix ~10 test failures in `core-system.test.ts` and `advanced-patterns.test.ts`.

---

## Features to Implement

### 1. Array Literal Parsing (`[1, 2, 3]`)

**Test Case**:
```javascript
evalHyperScript("[1, 2, 3]'s length") // Expected: 3
```

**Current Behavior**: `Unexpected token: 's length at position 7`

**Implementation Location**: `expression-parser.ts` → `parsePrimaryExpression()`

**Approach**:
- Detect `[` token at start of primary expression
- Parse comma-separated values until `]`
- Return array AST node
- Handle nested arrays and mixed types

**Complexity**: Medium

---

### 2. Global Variable Prefix (`$global`)

**Test Case**:
```javascript
evalHyperScript('$global', context) // Expected: value from context.globals
```

**Current Behavior**: `Unexpected token: $ (type: operator) at position 0`

**Implementation Location**: `tokenizer.ts` → identifier tokenization

**Approach**:
- Recognize `$` as valid identifier start character
- Tokenize `$identifier` as single identifier token
- In expression evaluation, look up in globals context

**Complexity**: Low

---

### 3. Unary Negation Operator (`!value`, `!!value`)

**Test Case**:
```javascript
evalHyperScript('!!""')     // Expected: false
evalHyperScript('!!"text"') // Expected: true
```

**Current Behavior**: `Unexpected token: ! (type: operator) at position 0`

**Implementation Location**: `expression-parser.ts` → `parseUnaryExpression()`

**Approach**:
- Add `!` to unary operator list (alongside `not`, `no`, `-`, `+`)
- Handle chained negation (`!!`)
- Return boolean result

**Complexity**: Low

---

### 4. Optional Chaining (`obj?.prop`)

**Test Case**:
```javascript
evalHyperScript('nonexistent?.property') // Expected: undefined (not error)
```

**Current Behavior**: `Unexpected token: ? at position 1`

**Implementation Location**:
- `tokenizer.ts` → recognize `?.` as single token
- `expression-parser.ts` → property access handling

**Approach**:
- Tokenize `?.` as distinct operator (not `?` + `.`)
- In property access, check for `?.` operator
- If base is null/undefined, return undefined instead of throwing

**Complexity**: Medium

---

### 5. Scientific Notation (`1e10`)

**Test Case**:
```javascript
evalHyperScript('1e10 + 1e10') // Expected: 20000000000
```

**Current Behavior**: `Unexpected token: e10 at position 1`

**Implementation Location**: `tokenizer.ts` → number tokenization

**Approach**:
- Extend number regex to include exponent notation
- Pattern: `/^-?\d+\.?\d*([eE][+-]?\d+)?/`
- Parse entire scientific notation as single number token

**Complexity**: Low

---

### 6. Negative Array Indexing (`arr[-1]`)

**Test Case**:
```javascript
evalHyperScript("arr[-1]", { locals: { arr: [1,2,3,4,5] }}) // Expected: 5
```

**Current Behavior**: Returns `undefined`

**Implementation Location**: Array accessor evaluation (not parser)

**Approach**:
- In array bracket access evaluation
- If index is negative, convert to `array.length + index`
- `arr[-1]` → `arr[arr.length - 1]`

**Complexity**: Low

---

## Implementation Priority

| Feature | Complexity | Tests Fixed | Priority |
|---------|-----------|-------------|----------|
| Scientific notation | Low | 1 | 1 |
| Unary negation `!` | Low | 1 | 2 |
| Global variable `$` | Low | 1 | 3 |
| Negative indexing | Low | 1 | 4 |
| Array literals | Medium | 2 | 5 |
| Optional chaining | Medium | 2 | 6 |

**Recommended order**: Low complexity first (1-4), then medium (5-6)

---

## Files to Modify

### Primary Files
- `packages/core/src/parser/tokenizer.ts`
  - Scientific notation
  - `$` identifier prefix
  - `?.` operator token

- `packages/core/src/parser/expression-parser.ts`
  - Array literal parsing
  - `!` unary operator
  - Optional chaining property access

### Evaluation Files
- Array accessor evaluation (for negative indexing)
- Location TBD - likely in expression evaluator

---

## Testing Strategy

1. **Unit tests**: Add tests to `expression-parser.test.ts` for each feature
2. **Integration**: Verify `core-system.test.ts` failures resolve
3. **Regression**: Run full test suite after each feature

---

## Risk Assessment

| Feature | Risk Level | Mitigation |
|---------|-----------|------------|
| Scientific notation | Low | Regex change only |
| Unary negation | Low | Additive change |
| Global variable | Low | New token type |
| Negative indexing | Low | Evaluation only |
| Array literals | Medium | May conflict with attribute syntax |
| Optional chaining | Medium | New operator precedence |

**Array literal note**: `[attr]` is attribute selector syntax. Need to distinguish:
- `[1, 2, 3]` - array literal (contains values)
- `[data-id]` - attribute selector (no commas, identifier pattern)

---

## Success Criteria

- All 10 Phase 5 test failures resolved
- No regressions in existing tests
- Clean TypeScript compilation

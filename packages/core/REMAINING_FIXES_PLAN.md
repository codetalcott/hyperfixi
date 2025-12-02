# Remaining Core System Test Fixes Plan

**Date**: 2025-12-02
**Status**: ✅ COMPLETE
**Remaining Failures**: 0 in `core-system.test.ts` (all 38 tests passing)

---

## Summary

After completing Phases 1-7 of test failure resolution, 3 failures remain in `core-system.test.ts`:

| Test | Expression | Current Error | Root Cause |
|------|------------|---------------|------------|
| null and undefined correctly | `nonexistent?.property` | `Unexpected token: ?` | Missing `?.` operator |
| DOM element queries | `.test-item` | `result.textContent` is undefined | CSS selector returns wrong type |
| element attribute access | `[data-test]'s @data-test` | Returns `null` | Possessive `@attr` evaluation |

---

## Fix 1: Optional Chaining `?.` Operator

**Test Case**:
```javascript
evalHyperScript('nonexistent?.property') // Expected: undefined (not error)
```

**Current Behavior**: `Unexpected token: ? at position 1`

### Implementation Steps

#### Step 1: Tokenizer - Recognize `?.` as single token
**File**: `packages/core/src/parser/tokenizer.ts`

```typescript
// In the main tokenization loop, before general operator handling:
if (char === '?') {
  const nextChar = peek(tokenizer, 1);
  if (nextChar === '.') {
    // Optional chaining operator
    const start = tokenizer.position;
    advance(tokenizer); // consume '?'
    advance(tokenizer); // consume '.'
    addToken(tokenizer, TokenType.OPERATOR, '?.', start);
    continue;
  }
  // Otherwise handle as ternary operator (if supported)
}
```

#### Step 2: Parser - Handle `?.` in property access
**File**: `packages/core/src/parser/expression-parser.ts`

In `parsePropertyAccess()` or `parsePostfixExpression()`:
```typescript
// Check for optional chaining
if (token.type === TokenType.OPERATOR && token.value === '?.') {
  advance(state);
  const property = parseIdentifier(state);
  return {
    type: 'optionalChain',
    object: left,
    property,
    optional: true,
    start: left.start,
  };
}
```

#### Step 3: Evaluator - Handle `optionalChain` AST node
**File**: `packages/core/src/parser/expression-parser.ts`

```typescript
case 'optionalChain':
  return evaluateOptionalChain(node, context);

// Add function:
async function evaluateOptionalChain(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);

  // If object is null/undefined, return undefined (don't throw)
  if (object === null || object === undefined) {
    return undefined;
  }

  // Otherwise access the property normally
  const propertyName = node.property.name || node.property.value;
  return object[propertyName];
}
```

**Complexity**: Medium
**Files Modified**: 2 (tokenizer.ts, expression-parser.ts)

---

## Fix 2: DOM Element Queries

**Test Case**:
```javascript
testContainer.innerHTML = '<div class="test-item">content</div>';
const result = await evalHyperScript('.test-item');
expect(result.textContent).toBe('content');
```

**Current Behavior**: `result.textContent` is `undefined`

### Root Cause Analysis

The CSS selector `.test-item` is being parsed and evaluated, but:
1. The evaluator may not have access to the test's `document`
2. Or it's returning a different type than expected

### Implementation Steps

#### Step 1: Verify CSS selector evaluation
Check `evaluateCSSSelectorExpression()` in `expression-parser.ts`:
- Does it use `document.querySelector()`?
- Is `document` available in the test environment?

#### Step 2: Ensure document context is passed
The test setup appends elements to `document.body`, so the document should be available. The issue might be:
- Selector returning NodeList instead of single element
- Selector evaluation returning the selector string instead of querying

**Investigation needed**: Run a debug test to see what `.test-item` actually returns.

**Complexity**: Low-Medium (likely test environment or context issue)
**Files Modified**: Possibly 1 (expression-parser.ts or eval-hyperscript.ts)

---

## Fix 3: Possessive with `@attribute`

**Test Case**:
```javascript
testContainer.innerHTML = '<div data-test="attribute-value">content</div>';
const result = await evalHyperScript("[data-test]'s @data-test");
expect(result).toBe('attribute-value');
```

**Current Behavior**: Returns `null`

### Root Cause Analysis

Tokenization works correctly (verified):
- `[` → operator
- `data-test` → identifier
- `]` → operator
- `'s` → possessive operator
- `@data-test` → symbol (attribute reference)

The issue is in evaluation - the possessive with `@` attribute isn't resolving the attribute value.

### Implementation Steps

#### Step 1: Check possessive evaluation
**File**: `packages/core/src/parser/expression-parser.ts`

Look at `evaluatePossessive()` or property access evaluation:
```typescript
// Current likely handles:
// element's property → element.property
// element's className → element.className

// Needs to also handle:
// element's @attr → element.getAttribute('attr')
```

#### Step 2: Add attribute access in possessive evaluation
```typescript
async function evaluatePossessive(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);
  const property = node.property;

  // Check if property is an attribute reference (@attr)
  if (property.type === 'symbol' && property.value.startsWith('@')) {
    const attrName = property.value.slice(1); // Remove '@'
    if (object && typeof object.getAttribute === 'function') {
      return object.getAttribute(attrName);
    }
    return null;
  }

  // Regular property access
  return object[property.name || property.value];
}
```

**Complexity**: Low
**Files Modified**: 1 (expression-parser.ts)

---

## Implementation Priority

| Fix | Complexity | Dependencies | Priority |
|-----|-----------|--------------|----------|
| 3. Possessive @attr | Low | None | 1st |
| 1. Optional chaining | Medium | None | 2nd |
| 2. DOM queries | Low-Medium | May need debugging | 3rd |

**Recommended order**: Fix 3 → Fix 1 → Fix 2

---

## Verification

After each fix, run:
```bash
npm test --workspace=@hyperfixi/core -- --run src/validation/core-system.test.ts
```

Target: 0 failures (currently 3)

---

## Notes

- These 3 failures are the only remaining issues in `core-system.test.ts`
- The broader test suite has ~104 failures across many files (mostly unrelated)
- These fixes will complete the Phase 5 parser feature work

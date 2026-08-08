# Session 34: Investigation & Fix Plan

**Date**: 2025-01-15
**Status**: In Progress
**Issues**: MutationObserver not detecting changes, Put command parser limitations

---

## 🔍 Issue 1: MutationObserver Not Detecting Increment/Decrement Changes

### Current State

- ✅ Increment/decrement commands execute successfully
- ✅ Counter display updates visually (textContent is being set)
- ❌ MutationObserver doesn't fire (no "CONTENT CHANGE DETECTED" log)
- ❌ Reactive mirror doesn't update

### MutationObserver Configuration (runtime.ts:1743-1748)

```typescript
observer.observe(watchedElement, {
  childList: true, // Watch for child nodes being added/removed
  characterData: true, // Watch for text content changes
  subtree: true, // Watch all descendants
  characterDataOldValue: true, // Track old text values
});
```

**This configuration SHOULD detect:**

- `childList`: When textContent replaces children with new text node
- `characterData`: When existing text node content changes
- `subtree`: Changes in descendants

### Hypothesis

The increment command is setting `textContent` correctly, but:

1. **Timing Issue?** - Mutation might be happening before observer is set up
2. **Same-tick Issue?** - Mutations in same event loop tick might not trigger callback
3. **Wrong Element?** - Observing wrong element (e.g., observing #count but modifying different element)
4. **Value vs TextContent?** - DIV might have a 'value' property causing wrong code path

### Debug Steps (Added)

**Increment Command Logging** (increment.ts:272-301):

```typescript
debug.command(
  `INCREMENT setTargetValue: target type=${typeof target}, isElement=${target instanceof HTMLElement}, newValue=${newValue}`
);
debug.command(`  → Target is HTMLElement: ${target.tagName}#${target.id}`);
debug.command(`  → No property specified. hasValue=${hasValue}, tagName=${target.tagName}`);
debug.command(`  → Setting textContent to: ${newValue}`);
debug.command(`  → textContent changed from "${oldContent}" to "${target.textContent}"`);
```

**What to Look For:**

1. Does increment log show textContent being set?
2. What element ID is being modified?
3. Is the value check (`'value' in target`) causing wrong path?
4. Does textContent actually change in the DOM?

### Next Steps

#### Step 1: Test with Current Debug Logging

**URL**: http://localhost:3000/examples/basics/05-counter.html
**Action**: Click increment button with debug enabled
**Expected Logs**:

```
INCREMENT setTargetValue: target type=object, isElement=true, newValue=1
  → Target is HTMLElement: DIV#count
  → No property specified. hasValue=false, tagName=DIV
  → Setting textContent to: 1
  → textContent changed from "0" to "1"
```

#### Step 2: Add MutationObserver Debugging

If textContent IS being set but no mutation detected, add logging to MutationObserver:

**Location**: runtime.ts:1705-1740
**Add**:

```typescript
const observer = new MutationObserver(async mutations => {
  debug.event(`🔔 MutationObserver callback fired! ${mutations.length} mutations`);
  for (const mutation of mutations) {
    debug.event(`  → Mutation type: ${mutation.type}, target: ${mutation.target.nodeName}`);
    if (mutation.type === 'childList') {
      debug.event(
        `    - addedNodes: ${mutation.addedNodes.length}, removedNodes: ${mutation.removedNodes.length}`
      );
    }
    // ... rest of code
  }
});
```

#### Step 3: Verify Observer Setup

Add logging when observer is created:

```typescript
debug.runtime(`RUNTIME: MutationObserver created for element:`, watchedElement);
debug.runtime(`  → Element ID: ${watchedElement.id}`);
debug.runtime(`  → Current textContent: "${watchedElement.textContent}"`);
```

#### Step 4: Test Manual Mutation

Create a test button that manually sets textContent:

```html
<button onclick="document.getElementById('count').textContent = '99'">Manual Set</button>
```

If this triggers the observer but increment doesn't, the issue is in how increment modifies the DOM.

### Potential Fixes

#### Fix 1: Force MutationObserver to Detect

If textContent changes don't trigger, try explicitly removing/adding text node:

```typescript
// Instead of: target.textContent = String(newValue);
const textNode = document.createTextNode(String(newValue));
target.innerHTML = ''; // Clear
target.appendChild(textNode); // Add new text node
```

#### Fix 2: Dispatch Custom Event

As a fallback, manually trigger an event that MutationObserver listens for:

```typescript
target.textContent = String(newValue);
target.dispatchEvent(new Event('lokascript:content-changed', { bubbles: true }));
```

#### Fix 3: Use Direct Callback

Instead of relying on MutationObserver, have increment/decrement commands directly notify watchers:

```typescript
// After setting textContent
if (context.contentChangeCallbacks?.has(target)) {
  context.contentChangeCallbacks.get(target)?.(oldValue, newValue);
}
```

---

## 🔧 Issue 2: Put Command Parser - Complex Expression Support

### Current Problem

**Parser Location**: parser.ts:750-800
**Method**: `parsePutCommand()`

**Current Implementation**:

```typescript
private parsePutCommand(identifierNode: IdentifierNode): CommandNode | null {
  const allArgs: ASTNode[] = [];

  // Parse all arguments as primitives
  while (!this.isAtEnd() && !this.check('then') && ...) {
    allArgs.push(this.parsePrimary());  // ❌ PROBLEM: Only handles primitives
  }

  // Find operation keyword (into, before, after)
  for (let i = 0; i < allArgs.length; i++) {
    if (argValue === 'into' || argValue === 'before' || argValue === 'after' ...) {
      operationIndex = i;
      operationKeyword = argValue;
      break;
    }
  }

  // Split args into content and target
  const contentArgs = allArgs.slice(0, operationIndex);
  const targetArgs = allArgs.slice(operationIndex + 1);
  // ...
}
```

**Why It Fails**:

```hyperscript
put (#count's textContent as Int) + 1 into #count
```

With `parsePrimary()`:

1. `(#count's textContent as Int)` → Grouped expression (OK)
2. `+` → Operator token (stops parsing! ❌)
3. Never sees `into` keyword
4. Returns null (no command created)

### Put Command Syntax Patterns

**Official \_hyperscript patterns**:

```hyperscript
put <expr> into <target>
put <expr> before <target>
put <expr> after <target>
put <expr> at start of <target>
put <expr> at end of <target>
```

**Key insight**: Content and target are **EXPRESSIONS**, not primitives!

### Proposed Fix: Strategy 1 (Parse Full Expressions)

**Replace primitive parsing with expression parsing**:

```typescript
private parsePutCommand(identifierNode: IdentifierNode): CommandNode | null {
  // Strategy: Parse ONE expression, then look for operation keyword

  // Step 1: Parse the content expression (everything before operation keyword)
  const contentExpr = this.parseExpression();

  // Step 2: Look for operation keyword
  const validOperations = ['into', 'before', 'after', 'at'];
  if (!this.isKeyword(this.peek(), validOperations)) {
    this.addError(`Expected operation keyword (into, before, after, at) after put expression`);
    return null;
  }

  const operation = this.advance().value;  // 'into', 'before', 'after'

  // Step 3: Handle "at start of" / "at end of"
  let fullOperation = operation;
  if (operation === 'at') {
    if (this.check('start')) {
      this.advance();  // consume 'start'
      if (this.check('of')) {
        this.advance();  // consume 'of'
        fullOperation = 'at start of';
      }
    } else if (this.check('end')) {
      this.advance();  // consume 'end'
      if (this.check('of')) {
        this.advance();  // consume 'of'
        fullOperation = 'at end of';
      }
    }
  }

  // Step 4: Parse the target expression
  const targetExpr = this.parseExpression();

  // Step 5: Create command node
  return {
    type: 'command',
    name: 'put',
    args: [contentExpr, { type: 'literal', value: fullOperation }, targetExpr],
    isBlocking: false,
    start: identifierNode.start,
    end: this.getPosition().end,
    line: identifierNode.line,
    column: identifierNode.column,
  };
}
```

### Proposed Fix: Strategy 2 (Parse Until Keyword)

**Parse expressions until we hit an operation keyword**:

```typescript
private parsePutCommand(identifierNode: IdentifierNode): CommandNode | null {
  // Parse expressions until we hit an operation keyword
  const contentParts: ASTNode[] = [];
  const validOperations = ['into', 'before', 'after'];

  // Parse content (may be multiple expressions separated by operators)
  while (!this.isAtEnd() && !this.isKeyword(this.peek(), validOperations)) {
    contentParts.push(this.parseExpression());

    // If we hit an operator, it's part of the content expression
    // parseExpression should have handled it
    if (this.check('then') || this.check('and') || this.check('else')) {
      break;
    }
  }

  // Combine content parts into single expression if multiple
  let contentExpr: ASTNode;
  if (contentParts.length === 1) {
    contentExpr = contentParts[0];
  } else if (contentParts.length > 1) {
    // Multiple parts - treat as sequence or combine
    contentExpr = contentParts[0];  // For now, just use first
  } else {
    this.addError('Put command requires content expression');
    return null;
  }

  // ... rest as in Strategy 1
}
```

### Testing Plan

**Test Cases**:

```hyperscript
✅ put "hello" into #target                    # Simple literal
✅ put 123 into #target                         # Number
✅ put myVar into #target                       # Variable
✅ put #source's textContent into #target       # Possessive
✅ put (#source's textContent as Int) into #target   # Type conversion
✅ put (#count as Int) + 1 into #count          # Arithmetic (CURRENTLY FAILS)
✅ put (#a + #b) * 2 into #result               # Complex math (CURRENTLY FAILS)
✅ put "Hello " + name into #greeting           # String concatenation
✅ put <div>HTML</div> before #marker           # HTML content
✅ put value at start of #list                  # Multi-word operation
```

### Implementation Priority

**Phase 1**: Strategy 1 (Simpler, cleaner)

- Change `parsePrimary()` to `parseExpression()`
- Handle "at start/end of" multi-word operations
- Test with simple cases

**Phase 2**: Advanced Features

- Property access targets: `put value into #el.innerHTML`
- Multiple targets: `put value into #a and #b`
- Conditional puts: `put value into #target if condition`

### Files to Modify

1. **parser.ts**:
   - Line 750-800: Rewrite `parsePutCommand()`
   - Add helper for multi-word operation parsing

2. **put.ts** (runtime):
   - May need to update command execution to handle new AST structure
   - Current enhanced command should work if args are correct

3. **Test files**:
   - Add test cases for complex put expressions
   - Verify backward compatibility

---

## 📋 Next Actions

### Immediate (This Session)

1. **✅ Test counter with debug logging**
   - URL: http://localhost:3000/examples/basics/05-counter.html
   - Check console for INCREMENT debug logs
   - Verify textContent is being set
   - Note exact element being modified

2. **🔄 Add MutationObserver debug logging**
   - If textContent IS being set but observer doesn't fire
   - Add logs to observer callback
   - Verify observer is watching correct element

3. **🔧 Implement Put Parser Fix**
   - Choose Strategy 1 (parseExpression approach)
   - Implement in parser.ts
   - Test with complex expressions

### Follow-up (Next Session)

1. **Fix MutationObserver** based on findings
2. **Complete put command parser** with all test cases
3. **Update counter example** to use put commands when working
4. **Document reactive patterns** in Session 34 summary

---

**Generated**: 2025-01-15
**Session**: 34 Part 2 - Investigation & Planning

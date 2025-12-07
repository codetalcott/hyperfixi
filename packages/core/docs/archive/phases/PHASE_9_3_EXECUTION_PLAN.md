# Phase 9-3: Command Extraction - Execution Plan

**Status**: 🚧 **PLANNING**
**Created**: 2025-11-23
**Phase**: 9-3 Command Module Extraction

---

## Challenge Analysis

### Current State After Phase 9-2
- ✅ Helper modules created (token, AST, parsing)
- ✅ Type definitions centralized (parser-types.ts)
- ✅ ParserContext interface defined (Day 4)
- ❌ ParserContext NOT YET IMPLEMENTED in Parser class

### Extraction Challenges

**Problem 1**: Command parsers are private class methods that access Parser state

```typescript
private parseMeasureCommand(identifierNode: IdentifierNode): CommandNode | null {
  // Uses: this.peek(), this.advance(), this.parsePrimary(), this.getPosition()
  // Accesses: this.current, this.tokens
  // Cannot be directly extracted without refactoring
}
```

**Problem 2**: ParserContext interface exists but not bound to Parser

```typescript
// Defined in parser-types.ts (Day 4):
export interface ParserContext {
  readonly tokens: Token[];
  readonly current: number;
  advance(): Token;
  peek(): Token;
  // ... 40+ methods
}

// But Parser class doesn't implement or expose this interface yet
```

---

## Solution Approaches

### Approach A: Implement ParserContext First (Recommended)

**Step 1**: Make Parser implement ParserContext interface
**Step 2**: Extract command parsers as standalone functions
**Step 3**: Command parsers receive ParserContext as parameter

**Pros**:
- Clean separation of concerns
- Command parsers become testable in isolation
- Aligns with Day 4 design

**Cons**:
- Requires Parser class refactoring first
- More upfront work before extraction
- Risk of breaking changes

**Estimated Time**: 2-3 days for ParserContext implementation, then 1 week for command extraction

### Approach B: Extract as Static Methods (Alternative)

**Step 1**: Convert command parsers to static methods
**Step 2**: Pass parser instance as parameter
**Step 3**: Move static methods to separate modules

**Pros**:
- Less upfront refactoring
- Can extract incrementally

**Cons**:
- Doesn't use ParserContext interface (wastes Day 4 work)
- Still tightly coupled to Parser class
- Messy TypeScript patterns

**Estimated Time**: 1 week

### Approach C: Internal File Organization (Minimal)

**Step 1**: Split parser.ts into multiple files
**Step 2**: Keep everything as class methods
**Step 3**: Use TypeScript module augmentation

**Pros**:
- Minimal refactoring
- Low risk

**Cons**:
- Doesn't achieve true modularization
- Commands still coupled to Parser class
- Limited benefits

**Estimated Time**: 2-3 days

---

## Recommended Plan: Approach A (ParserContext First)

### Phase 9-3a: Implement ParserContext (2-3 days)

**Goal**: Make Parser class expose ParserContext interface

**Day 1: Bind Core Methods**
```typescript
export class Parser implements ParserContext {
  // Token navigation - already exist, just expose
  advance(): Token { /* existing implementation */ }
  peek(): Token { /* existing implementation */ }
  previous(): Token { /* existing implementation */ }
  // ... 10 token methods

  // Create context accessor
  getContext(): ParserContext {
    return {
      tokens: this.tokens,
      current: this.current,
      advance: this.advance.bind(this),
      peek: this.peek.bind(this),
      // ... bind all 40+ methods
    };
  }
}
```

**Day 2: Test Context Binding**
- Create context accessor tests
- Validate all methods work through context
- Run full parser test suite
- Success: Zero regressions

**Day 3: Extract First Command Parser**
- Convert 1 command parser to use context
- Example: parseMeasureCommand → measureCommand(context, identifierNode)
- Validate pattern works
- Document extraction process

### Phase 9-3b: Extract Command Modules (1 week)

Once ParserContext is implemented and validated:

**Day 4: Animation Commands** (2 parsers)
- Extract: parseMeasureCommand, parseTransitionCommand
- Module: `command-parsers/animation-commands.ts`
- Validation: Tests pass

**Day 5-6: DOM Commands** (4-7 parsers)
- Extract: parsePutCommand, parseAddCommand, parseRemoveCommand, parseToggleCommand
- Module: `command-parsers/dom-commands.ts`
- Validation: Tests pass

**Day 7-8: Control Flow Commands** (4 parsers)
- Extract: parseIfCommand, parseRepeatCommand, parseHaltCommand
- Module: `command-parsers/control-flow-commands.ts`
- Validation: Tests pass

**Day 9-10: Remaining Parsers** (3-4 parsers)
- Extract: parseSetCommand, parseWaitCommand, parseInstallCommand
- Modules: data-commands.ts, async-commands.ts, behavior-commands.ts
- Validation: Tests pass

---

## Alternative: Faster But Less Clean Approach

If time is critical, we could:

1. **Skip ParserContext implementation** for now
2. **Extract as static methods** that take parser instance
3. **Defer to Phase 9-4** the ParserContext refactoring

**Trade-off**: Faster extraction but messier architecture

---

## Decision Point

**Question for Continuation**: Which approach should we take?

**Option 1** (Recommended): Implement ParserContext first (2-3 days), then extract commands (1 week)
- Total: 9-13 days
- Clean architecture
- Testable command parsers

**Option 2** (Faster): Extract as static methods now (1 week), refactor later
- Total: 5-7 days
- Messier code
- Technical debt

**Option 3** (Minimal): Internal file organization only (2-3 days)
- Total: 2-3 days
- Limited benefits
- Doesn't achieve true modularization

---

## Recommendation

Given that Phase 9-2 already invested 3 days building the ParserContext infrastructure, I recommend **Approach A** (Implement ParserContext First).

**Rationale**:
- Completes the architecture started in Day 4
- Enables clean, testable command extraction
- Worth the upfront investment for long-term maintainability

**Next Step**: Implement ParserContext binding in Parser class (Phase 9-3a Day 1)

---

**Status**: ⏸️ **AWAITING DECISION**
**Created**: 2025-11-23
**Updated**: 2025-11-23

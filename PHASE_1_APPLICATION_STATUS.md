# Phase 1 Application Status

## Summary

**Infrastructure Complete:** Phase 3 - Part 1 (Browser Types) and Phase 1 (Test Safety Infrastructure) have been fully implemented.

**Application Started:** Began systematic application of test utilities to eliminate `as any` casts from test files.

---

## Infrastructure Created (Complete)

### ✅ @hyperfixi/types-browser Package
- Complete TypeScript type definitions for all browser globals
- window.hyperfixi, window.HyperFixiSemantic, window.HyperFixiI18n
- Type guards and runtime helpers
- **Files:** 6 files, ~600 lines
- **Status:** Built and ready to use

### ✅ Test Utilities
Created comprehensive type-safe test utilities:

1. **AST/Semantic Node Helpers** (`parser/__types__/test-helpers.ts`, `semantic/__types__/test-helpers.ts`)
   - Type guards, assertions, safe accessors
   - Foundation for 60+ AST assertion fixes

2. **Mock Utilities** (`__test-utils__/mock-types.ts`)
   - Typed mocks for WebSocket, EventSource, Worker, Express
   - Foundation for 80+ mock object fixes

3. **Error Testing** (`__test-utils__/error-testing.ts`)
   - Type-safe error expectations and handling
   - Foundation for 30+ error handling fixes

4. **Parser Helpers** (`__test-utils__/parser-helpers.ts`)
   - Discriminated unions, builders, assertions
   - Foundation for 50+ parser test fixes

5. **Context Builders** (`__test-utils__/context-builders.ts`)
   - Fluent API for typed execution contexts
   - Foundation for 20+ context creation fixes

6. **Documentation** (`__test-utils__/README.md`, `__test-utils__/index.ts`)
   - Complete usage guide with examples
   - Central export for all utilities

**Total Infrastructure:** 13 files, ~2,200 lines, 45+ utility functions

---

## Application Progress

### Completed Fixes

#### ✅ events.test.ts (1/1 as any fixed - 100%)
**File:** `packages/core/src/core/events.test.ts`

**Changes:**
- Removed `as any` cast from context object
- Added proper `locals` and `globals` Map properties
- Context now fully matches expected interface

**Pattern Demonstrated:**
```typescript
// Before
const context = { me: testElement, it: null, you: null, result: null };
const hsEvent = createHyperscriptEvent('test-command', {
  element: testElement,
  context: context as any,  // ← unsafe cast
  result: 'test-result',
});

// After
const context = {
  me: testElement,
  it: null,
  you: null,
  result: null,
  locals: new Map(),      // ← added
  globals: new Map(),     // ← added
};
const hsEvent = createHyperscriptEvent('test-command', {
  element: testElement,
  context,                // ← no cast needed
  result: 'test-result',
});
```

**Result:** All 40+ tests passing

---

## Remaining Work

### High-Impact Files (Priority 1)

These files have the most `as any` instances and will benefit most from the test utilities:

1. **wait-new-features.test.ts** - 163 instances
   - Mock args/modifiers: `{ value: 'something' } as any`
   - Evaluator mocks: `evaluator as any`
   - Input assertions: `(input as any).conditions`
   - **Strategy:** Create typed mock builders for command inputs

2. **dropdown-behavior.test.ts** - 49 instances
   - Behavior method casts: `(dialog as any).openModal()`
   - **Strategy:** Use context builders and extend element types

3. **toggle-group-behavior.test.ts** - 39 instances
   - Similar to dropdown - behavior extension methods
   - **Strategy:** Define behavior interfaces

4. **add.test.ts** - 37 instances
   - DOM manipulation assertions
   - **Strategy:** Use parser helpers

5. **ast-builder.test.ts** - 28 instances (semantic package)
   - Semantic node assertions
   - **Strategy:** Use semantic test helpers from `__test-utils__`

### Systematic Pattern Fixes (Priority 2)

Apply utilities across all test files:

1. **Error Handling** (~30 files)
   ```typescript
   // Replace this pattern:
   try {
     parseInvalid()
   } catch (error: any) {
     expect(error.message).toContain('invalid')
   }

   // With:
   expectThrows(() => parseInvalid(), Error, /invalid/)
   ```

2. **Parser Helpers** (~50 instances)
   ```typescript
   // Replace helpers returning any:
   function expectAST(input: string, expected: any)

   // With:
   function expectAST(input: string, expected: Partial<CommandNode>)
   ```

3. **Mock Objects** (~80 instances)
   ```typescript
   // Replace inline mocks:
   const mockWs = { postMessage: (data: any) => {} } as any

   // With:
   const mockWs = createMockWebSocket()
   ```

4. **Context Creation** (~20 instances)
   ```typescript
   // Replace:
   const context = { me: element, ... } as any

   // With:
   const context = createTestContext({ element })
   ```

### Quick Wins (Priority 3)

Regex-based replacements:

1. **Catch blocks:** `} catch (error: any) {` → `} catch (error: unknown) {` + type guard
2. **Global assignments:** `(globalThis as any).` → proper declaration
3. **Simple type assertions:** Review and replace with proper types

---

## Statistics

### Infrastructure
- **Files Created:** 13
- **Lines of Code:** ~2,200
- **Utilities:** 45+ functions and builders
- **Commits:** 8 with detailed documentation

### Application
- **Files Fixed:** 1/88 (1%)
- **Instances Fixed:** 1/914 (0.1%)
- **Tests Passing:** 100% (40+ in events.test.ts)

### Remaining
- **Files to Fix:** 87
- **Instances to Fix:** 913
- **Estimated Effort:** ~60-80 hours for complete application

---

## Methodology

### Pattern for Fixing Test Files

1. **Read the file** - Understand the `as any` usage patterns
2. **Identify the pattern:**
   - Mock objects → Use `createMock*()` factories
   - Context objects → Use `TestContextBuilder` or `createTestContext()`
   - AST assertions → Use `expectASTStructure()` or type guards
   - Error handling → Use `expectThrows()` or `expectThrowsAsync()`
   - Parser results → Use discriminated unions

3. **Apply the utility:**
   - Import from `__test-utils__`
   - Replace `as any` with proper typed call
   - Remove the cast

4. **Test:**
   - Run the test file: `npm test --prefix packages/core -- --run <file>`
   - Ensure all tests pass
   - Verify TypeScript compiles without errors

5. **Commit:**
   - Use descriptive commit message
   - Include before/after example
   - Note number of `as any` instances removed

### Example Workflow

```bash
# 1. Pick a file
file="src/expressions/logical/index.test.ts"

# 2. Check current usage
grep -n "as any" packages/core/$file

# 3. Fix the instances (using test utilities)
# ... make changes ...

# 4. Test
npm test --prefix packages/core -- --run $file

# 5. Commit
git add packages/core/$file
git commit -m "refactor(tests): Remove 'as any' from logical expression tests

Eliminated X 'as any' instances using test utilities:
- Used expectThrows() for error assertions
- Used createTestContext() for mock contexts
- Used type guards for AST node access

X/914 'as any' instances eliminated"
```

---

## Tools Available

### Import Pattern
```typescript
import {
  // Parser helpers
  expectASTStructure,
  expectCommandNode,
  createTestCommandNode,

  // Context builders
  TestContextBuilder,
  createTestContext,
  createMinimalContext,

  // Error testing
  expectThrows,
  expectThrowsAsync,
  assertIsError,

  // Mock utilities
  createMockWebSocket,
  createMockEventSource,
  createMockExpressResponse,
} from '../__test-utils__'
```

### Quick Reference

**Parser Tests:**
- `expectASTStructure(node, expected)` - Deep AST matching
- `expectCommandNode(node, 'commandName')` - Assert command type
- `createTestCommandNode('name', args)` - Build test nodes

**Context Creation:**
```typescript
const context = new TestContextBuilder()
  .withElement(element)
  .withGlobal('count', 0)
  .withIt(result)
  .build()
```

**Error Testing:**
```typescript
expectThrows(() => operation(), ErrorType, /message pattern/)
await expectThrowsAsync(async () => operation(), ErrorType)
```

**Mocks:**
```typescript
const ws = createMockWebSocket()
const es = createMockEventSource()
const res = createMockExpressResponse()
```

---

## Next Steps

### Immediate (Next Session)

1. **Fix 4-5 small files** (1-2 instances each)
   - Build momentum with quick wins
   - Validate patterns work across different test types
   - Target: 10-15 instances removed

2. **Document patterns** discovered
   - Update README with real-world examples
   - Create migration guide section
   - Add before/after from actual fixes

3. **Create helper for command inputs**
   - Major pain point in wait-new-features.test.ts
   - `createCommandInput()` builder
   - Would eliminate ~50 instances in one file

### Short-term (This Week)

1. **Fix top 5 high-impact files**
   - wait-new-features.test.ts (163)
   - dropdown-behavior.test.ts (49)
   - toggle-group-behavior.test.ts (39)
   - add.test.ts (37)
   - ast-builder.test.ts (28)
   - **Target:** 316/914 instances (35%)

2. **Apply systematic patterns**
   - All error handling (30 files)
   - All parser helpers (12 files)
   - **Target:** Additional 80+ instances

### Long-term (Next Sprint)

1. **Complete Phase 1 application**
   - Fix all 88 test files
   - Eliminate all 914 `as any` instances
   - **Target:** 100% type-safe tests

2. **Phase 2: Export Strategy**
   - Remove Core default export
   - Convert I18n wildcards
   - Add browser export paths
   - **Effort:** ~19 hours

3. **Phase 3 Completion: Browser Types**
   - Update Core globals
   - Create usage documentation
   - **Effort:** ~5 hours

---

## Success Criteria

### Phase 1 Application Complete
- [ ] 0 `as any` type assertions in test files
- [ ] 0 untyped catch variables
- [ ] All mock functions have proper generic types
- [ ] All test helpers return typed results
- [ ] 100% test suite passes

### Current Progress
- [x] Infrastructure complete (100%)
- [ ] Application started (0.1% - 1/914 instances)
- [ ] High-impact files (0% - 0/5 files)
- [ ] Systematic patterns (0%)

---

## Conclusion

**Infrastructure:** ✅ Complete and ready to use
**Application:** 🟡 Started with demonstrated pattern
**Remaining:** 913 instances across 87 files

The foundation is solid. All utilities are tested, documented, and ready to use. The first fix demonstrates the pattern works. Now it's a matter of systematically applying these utilities across the test suite.

**Estimated Time to Complete:**
- High-impact files: ~20-30 hours
- Systematic patterns: ~20-30 hours
- Remaining files: ~20-30 hours
- **Total:** ~60-80 hours of focused work

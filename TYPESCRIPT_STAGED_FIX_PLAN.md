# TypeScript Error Fix Plan: Hybrid Staged Approach

## Executive Summary

**Current Situation:**

- Baseline: 3 syntax errors (now fixed)
- Current: 650 TypeScript errors (533 in core package)
- Root Cause: Strengthening types exposed pre-existing architectural issues
- Goal: Systematically resolve all errors while maintaining code quality

**Strategy:** Hybrid Staged Fixes

- Stage 1: Keep safe improvements, revert risky changes
- Stage 2: Fix exposed issues systematically
- Stage 3: Re-apply strict types with confidence
- Stage 4: Long-term architectural improvements

---

## Stage 1: Stabilize & Commit Safe Fixes (Day 1, ~2 hours)

### Goal

Return to a stable state (3-10 errors) while keeping improvements that don't cascade issues.

### Actions

#### 1.1 Keep These Changes (Safe, No Cascading Issues)

- ✅ **Syntax fixes** in enhanced-eventsource.ts, enhanced-sockets.ts, enhanced-webworker.ts
  - Added missing commas (fixes 3 errors)
  - No side effects

- ✅ **CodeSmell interface** in ast-toolkit/src/types.ts
  - Made location properties optional to match ASTNode
  - Fixes legitimate type mismatch

- ✅ **Export additions** in core/src/index.ts
  - Added FeatureNode, StatementNode, ElementType, ExpressionCategory
  - Removed duplicate Token export
  - Fixes ast-toolkit import errors

#### 1.2 Revert These Changes (Cascading Issues - Fix Later)

- ⏸️ **ValidationError imports and type changes**
  - Revert in: backend-context.ts, enhanced-context-registry.ts, frontend-context.ts, llm-generation-context.ts
  - Revert error array type changes from `ValidationError[]` back to loose types
  - Remove `override` keywords added
  - Remove `relatedExpressions` additions

- ⏸️ **Agent-made changes**
  - Revert all changes in expressions/enhanced-* files
  - Revert changes in commands/* files
  - These were attempting to fix issues exposed by ValidationError strictness

#### 1.3 Create Clean Baseline Commit

```bash
# Revert problematic changes
git checkout src/context/backend-context.ts
git checkout src/context/enhanced-context-registry.ts
git checkout src/context/frontend-context.ts
git checkout src/context/llm-generation-context.ts
git checkout src/expressions/
git checkout src/commands/animation/
git checkout src/commands/dom/

# Keep good changes
git add ../ast-toolkit/src/types.ts
git add src/features/enhanced-eventsource.ts
git add src/features/enhanced-sockets.ts
git add src/features/enhanced-webworker.ts
git add src/index.ts

# Commit
git commit -m "fix: Syntax errors and type exports (3→0 errors)

- Fix missing commas in feature validation error objects
- Make CodeSmell location properties optional to match ASTNode
- Export missing types (FeatureNode, StatementNode, etc.) from core
- Remove duplicate Token export

Fixes 3 TS1005 syntax errors.
Sets up foundation for systematic ValidationError migration."
```

#### 1.4 Verify Baseline

```bash
npm run typecheck  # Should show 0 errors
npm test           # Should pass
npm run build      # Should succeed
```

**Expected Result:** Clean baseline with 0 errors

---

## Stage 2: Systematic ValidationError Migration (Days 2-5, ~12 hours)

### Goal

Properly migrate all ValidationError usage across the codebase with a systematic, tested approach.

### Pre-Work: Analysis & Tooling (Day 2, 2 hours)

#### 2.1 Audit All ValidationError Usage

Create analysis script:

```bash
# Find all error object creations
grep -r "errors.push\|errors = \[" packages/core/src --include="*.ts" | \
  grep -v node_modules | \
  grep -v ".test.ts" > validation-error-audit.txt

# Find all ValidationResult returns
grep -r "ValidationResult\|isValid.*errors" packages/core/src --include="*.ts" | \
  grep -v node_modules > validation-result-audit.txt
```

#### 2.2 Create Migration Checklist

Document all files needing changes:

```markdown
## ValidationError Migration Checklist

### Context Files (Priority 1 - Core Infrastructure)
- [ ] src/context/backend-context.ts (2 errors)
- [ ] src/context/frontend-context.ts (1 error)
- [ ] src/context/enhanced-context-registry.ts (20+ errors)
- [ ] src/context/llm-generation-context.ts (1 error)

### Expression Files (Priority 2 - High Usage)
- [ ] src/expressions/enhanced-array/index.ts
- [ ] src/expressions/enhanced-comparison/index.ts
- [ ] src/expressions/enhanced-function-calls/index.ts
- [ ] src/expressions/enhanced-in/index.ts
- [ ] src/expressions/enhanced-object/index.ts
- [ ] src/expressions/enhanced-references/index.ts
- [ ] src/expressions/enhanced-special/index.ts
- [ ] src/expressions/enhanced-symbol/index.ts

### Command Files (Priority 3 - Lower Impact)
- [ ] src/commands/animation/enhanced-take.ts
- [ ] src/commands/dom/put.ts
- [ ] src/commands/utility/enhanced-log.ts

### Feature Files (Priority 4 - Complex)
- [ ] src/features/enhanced-behaviors.ts
- [ ] src/features/enhanced-def.ts
- [ ] src/features/enhanced-init.ts

### Type System Files (Priority 5 - Careful)
- [ ] src/types/enhanced-context.ts
- [ ] src/types/unified-types.ts

### Runtime Files (Priority 6 - High Risk)
- [ ] src/runtime/runtime.ts (defer to Stage 4)
- [ ] src/parser/parser.ts (defer to Stage 4)
```

### Implementation: File-by-File Migration (Days 3-5, 10 hours)

#### 2.3 Migration Pattern (Template)

For each file, follow this pattern:

```typescript
// STEP 1: Add import
import type { ValidationError } from '../types/base-types';

// STEP 2: Update error array type
// BEFORE:
const errors: Array<{ type: string; message: string; path?: string }> = [];

// AFTER:
const errors: ValidationError[] = [];

// STEP 3: Update error objects
// BEFORE:
errors.push({
  type: 'custom-error',
  message: 'Something went wrong',
  path: 'some.path'
});

// AFTER:
errors.push({
  type: 'validation-error',  // Use allowed enum value
  message: 'Something went wrong',
  path: 'some.path',
  suggestions: []  // Add required field
});

// STEP 4: Add override keyword if method overrides base class
// BEFORE:
protected validateContextSpecific(data: Input): ValidationResult {

// AFTER:
protected override validateContextSpecific(data: Input): ValidationResult {

// STEP 5: Add missing metadata fields
// If ContextMetadata, ensure relatedExpressions exists:
public readonly metadata: ContextMetadata = {
  // ... existing fields ...
  relatedExpressions: ['relevant', 'expression', 'names'],
  // ... rest of fields ...
};
```

#### 2.4 Automated Fix Script

Create helper script for common patterns:

```bash
#!/bin/bash
# fix-validation-error.sh

FILE=$1

# Add import if not exists
if ! grep -q "import.*ValidationError" "$FILE"; then
  # Find the line with base-types import and add ValidationError
  sed -i '' "s/from '\.\.\/types\/base-types';/, ValidationError} from '..\/types\/base-types';/g" "$FILE"
fi

# Fix error array type declarations
sed -i '' 's/const errors: Array<{ type: string; message: string[^>]*}>/const errors: ValidationError[]/g' "$FILE"

echo "✓ Updated $FILE - please verify manually"
```

#### 2.5 Priority 1: Context Files (Day 3, 3 hours)

Fix context files one at a time:

**For each file:**

1. Create git branch: `git checkout -b fix/validation-error-contexts`
2. Apply migration pattern manually
3. Run typecheck: `npx tsc --noEmit -p packages/core`
4. Fix any new errors exposed
5. Test: `npm test -- context`
6. Commit: `git commit -m "fix: ValidationError in [filename]"`

**Files:**

```bash
# Order matters - start simple
1. src/context/frontend-context.ts       # ~1 error, simple
2. src/context/llm-generation-context.ts # ~1 error, simple
3. src/context/backend-context.ts        # ~2 errors, medium
4. src/context/enhanced-context-registry.ts # ~20 errors, complex
```

**Expected Result:** Context files properly typed, 0 errors in context/

#### 2.6 Priority 2: Expression Files (Day 4, 4 hours)

Fix expression files using similar pattern:

```bash
# Create branch
git checkout -b fix/validation-error-expressions

# Fix files in order
1. src/expressions/enhanced-special/index.ts     # Add missing error fields
2. src/expressions/enhanced-array/index.ts       # Fix suggestion → suggestions typo
3. src/expressions/enhanced-symbol/index.ts      # Simple fixes
4. src/expressions/enhanced-object/index.ts      # Medium complexity
5. src/expressions/enhanced-references/index.ts  # getValidationSuggestion return type
6. src/expressions/enhanced-comparison/index.ts  # Type alignment
7. src/expressions/enhanced-in/index.ts          # String[] → ValidationError[]
8. src/expressions/enhanced-function-calls/index.ts # Complex - issues → ValidationError[]
```

**Testing Strategy:**

```bash
# Test each expression type
npm test -- enhanced-special
npm test -- enhanced-array
# etc.

# Run full test suite
npm test

# Check error count
npx tsc --noEmit -p packages/core | grep "error TS" | wc -l
```

**Expected Result:** Expression files properly typed, tests passing

#### 2.7 Priority 3: Command Files (Day 4, 1 hour)

Fix command files (simpler, fewer changes):

```bash
git checkout -b fix/validation-error-commands

# Fix files
1. src/commands/dom/put.ts                 # Add type field
2. src/commands/animation/enhanced-take.ts # Add name field to EnhancedError
3. src/commands/utility/enhanced-log.ts    # ValidationError structure

# Test
npm test -- commands
```

**Expected Result:** Command files properly typed

#### 2.8 Priority 4: Feature Files (Day 5, 2 hours)

Feature files are more complex - need careful handling:

```bash
git checkout -b fix/validation-error-features

# These files have validation methods that need:
# - ValidationError[] type
# - suggestions field on all errors
# - Proper error types (from allowed enum)

1. src/features/enhanced-init.ts
2. src/features/enhanced-def.ts
3. src/features/enhanced-behaviors.ts  # Most complex

# For each:
# - Read existing validation logic
# - Update error objects carefully
# - Ensure suggestions make sense
# - Test feature functionality
```

**Expected Result:** Feature files properly typed, features work correctly

#### 2.9 Integration Testing (Day 5, 1 hour)

```bash
# Full test suite
npm test

# Type check all packages
npm run typecheck

# Build all packages
npm run build

# Browser compatibility tests
npm run test:browser

# Verify error count
npx tsc --noEmit -p packages/core | grep "error TS" | wc -l
# Target: <50 errors (down from 533)
```

### Stage 2 Deliverables

- ✅ All ValidationError objects have required `suggestions` field
- ✅ Error array types are `ValidationError[]` not loose types
- ✅ Error types use allowed enum values
- ✅ Override keywords added where needed
- ✅ ContextMetadata has relatedExpressions
- ✅ All tests passing
- ✅ Build succeeds
- ✅ Error count: 533 → <50

---

## Stage 3: Fix exactOptionalPropertyTypes (Day 6, 4 hours)

### Goal

Fix the 55 TS2375 errors related to TypeScript's `exactOptionalPropertyTypes` setting.

### Background

TypeScript's `exactOptionalPropertyTypes: true` enforces that optional properties must be explicitly `T | undefined`, not just `T`.

```typescript
// Without exactOptionalPropertyTypes
interface Foo {
  bar?: string;  // Can be string | undefined | missing
}
const x: Foo = { bar: undefined };  // ✅ OK

// With exactOptionalPropertyTypes (our setting)
interface Foo {
  bar?: string;  // Can be string | missing (NOT undefined)
}
const x: Foo = { bar: undefined };  // ❌ Error! Must be string or omitted
```

### Actions

#### 3.1 Identify All TS2375 Errors

```bash
git checkout -b fix/exact-optional-properties

npm run typecheck 2>&1 | grep "TS2375" > exact-optional-errors.txt
cat exact-optional-errors.txt
```

**Expected Files:**

- packages/analytics/src/types.ts (analytics package)
- packages/analytics/src/tracker.ts
- packages/analytics/src/index.ts
- packages/core/src/types/unified-types.ts
- packages/ast-toolkit/src/analyzer/index.ts

#### 3.2 Fix Analytics Package Types

**File:** `packages/analytics/src/types.ts`

Update interface definitions:

```typescript
// BEFORE
export interface AnalyticsConfig {
  apiEndpoint?: string;
  trackingId?: string;
  events?: EventConfig;
}

// AFTER
export interface AnalyticsConfig {
  apiEndpoint?: string | undefined;
  trackingId?: string | undefined;
  events?: EventConfig | undefined;
}

// OR (cleaner approach)
export interface AnalyticsConfig {
  apiEndpoint?: string;
  trackingId?: string;
  events?: EventConfig;
}

// Then update implementations to not set undefined:
const config: AnalyticsConfig = {
  // Don't include properties that are undefined
  // apiEndpoint: undefined,  // ❌ Wrong
  // Only include when you have a value
  ...(apiEndpoint && { apiEndpoint }),  // ✅ Right
};
```

**Strategy:** Fix interface definitions to use `| undefined` OR fix implementations to omit undefined values.

#### 3.3 Fix Event Type Definitions

**File:** `packages/analytics/src/types.ts`

```typescript
// Event interfaces need userId, tenantId, etc. as T | undefined
export interface BaseEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  sessionId: string;
  userId?: string | undefined;      // Add | undefined
  tenantId?: string | undefined;    // Add | undefined
  metadata: EventMetadata;
}

export interface HyperscriptCompilationEvent extends BaseEvent {
  type: 'hyperscript:compiled';
  data: {
    script: string;
    compiledLength: number;
    parseTime: number;
    complexity: number;
    features: string[];
    commands: string[];
    expressions: string[];
    warnings: string[];
  };
}

// Similar for all event types...
```

#### 3.4 Fix Tracker Implementations

**File:** `packages/analytics/src/tracker.ts`

Instead of changing interfaces, fix how we create objects:

```typescript
// BEFORE
const event: HyperscriptCompilationEvent = {
  id: generateId(),
  type: 'hyperscript:compiled',
  timestamp: Date.now(),
  sessionId: this.sessionId,
  userId: this.userId,      // Could be undefined
  tenantId: this.tenantId,  // Could be undefined
  data: { /* ... */ },
  metadata: this.getMetadata()
};

// AFTER
const event: HyperscriptCompilationEvent = {
  id: generateId(),
  type: 'hyperscript:compiled',
  timestamp: Date.now(),
  sessionId: this.sessionId,
  ...(this.userId && { userId: this.userId }),      // Conditional inclusion
  ...(this.tenantId && { tenantId: this.tenantId }), // Conditional inclusion
  data: { /* ... */ },
  metadata: this.getMetadata()
};
```

#### 3.5 Fix unified-types.ts

**File:** `packages/core/src/types/unified-types.ts`

```typescript
// Find the TS2375 error location
// Likely in UnifiedValidationResult

export type UnifiedValidationResult<T> =
  | {
      isValid: true;
      errors: never[];
      suggestions: never[];
      data: T;  // Change to: data?: T | undefined if optional
    }
  | {
      isValid: false;
      errors: ValidationError[];
      suggestions: string[];
      data?: T | undefined;  // Add | undefined explicitly
    };
```

#### 3.6 Testing

```bash
# Check analytics package
cd packages/analytics
npm run typecheck

# Check core package
cd packages/core
npm run typecheck

# Full typecheck
npm run typecheck

# Count remaining errors
npm run typecheck 2>&1 | grep "TS2375" | wc -l
# Target: 0
```

### Stage 3 Deliverables

- ✅ All TS2375 errors resolved (55 → 0)
- ✅ Analytics events properly typed
- ✅ Optional properties handled correctly
- ✅ Tests passing
- ✅ Error count: <50 → <20

---

## Stage 4: Fix Remaining Core Errors (Days 7-10, ~16 hours)

### Goal

Address remaining errors in runtime, parsers, and other complex files.

### 4.1 Runtime.ts Type System Issues (Day 7-8, 8 hours)

**Current State:** 80 errors, mostly TS2367 (impossible type comparisons) and TS2345 (argument type mismatches)

**Root Cause:** AST node type system conflict (legacy vs enhanced)

**Strategy:** Add type guards and targeted type assertions

```typescript
// Create helper file
// packages/core/src/runtime/ast-helpers.ts

import type { ASTNode } from '../types/base-types';

/**
 * Type guard utilities for runtime AST handling
 * These handle the legacy/enhanced AST system conflict
 */

export function hasProperty<K extends string>(
  node: ASTNode,
  prop: K
): node is ASTNode & Record<K, unknown> {
  return prop in node;
}

export function getNodeType(node: ASTNode): string {
  return node.type;
}

export function getNodeProperty<T = unknown>(
  node: ASTNode,
  prop: string
): T | undefined {
  if (hasProperty(node, prop)) {
    return (node as any)[prop] as T;
  }
  return undefined;
}

export function isNodeType(node: ASTNode, type: string | string[]): boolean {
  const types = Array.isArray(type) ? type : [type];
  return types.includes(node.type);
}

export function asAnyNode(node: ASTNode): any {
  // Documented escape hatch for legacy type system
  // TODO: Remove when AST types are unified
  return node;
}
```

**Apply to runtime.ts:**

```typescript
// BEFORE
if (arg.type === 'identifier' && (arg as any).name === 'to') {
  toIndex = i;
}

// AFTER
import { isNodeType, getNodeProperty } from './ast-helpers';

if (isNodeType(arg, 'identifier') && getNodeProperty(arg, 'name') === 'to') {
  toIndex = i;
}

// OR (for complex cases)
import { asAnyNode } from './ast-helpers';

if (arg.type === 'identifier' && asAnyNode(arg).name === 'to') {
  toIndex = i;
  // TODO: Replace with proper type guard when AST unified
}
```

**Testing:**

```bash
npm test -- runtime
npm run test:browser

# Check error reduction
npx tsc --noEmit src/runtime/runtime.ts | grep "error TS" | wc -l
# Target: 80 → <20
```

### 4.2 Parser Type Fixes (Day 9, 4 hours)

**File:** `src/parser/parser.ts` (22 errors)
**File:** `src/parser/expression-parser.ts` (19 errors)

**Strategy:** Ensure parser creates properly typed AST nodes

```typescript
// Add return types to parser functions
function parseIdentifier(): IdentifierNode {  // Not just ASTNode
  return {
    type: 'identifier',
    name: /* ... */,
    line: /* ... */,
    column: /* ... */
  };
}

// Use type guards for node checking
function isBinaryOperator(token: Token): boolean {
  return /* ... */;
}
```

### 4.3 Missing Overrides (Day 9, 1 hour)

Fix TS2416 errors (21 errors) - methods that override base class need `override` keyword:

```bash
# Find all override errors
npm run typecheck 2>&1 | grep "TS2416" > override-errors.txt

# Add override keyword to each method listed
# Example:
protected override validateContextSpecific(data: Input): ValidationResult {
  // ...
}
```

### 4.4 Property Existence Checks (Day 10, 2 hours)

Fix TS2339 errors (64 errors) - property doesn't exist on type:

**Pattern:**

```typescript
// BEFORE
if (node.someProperty) {  // TS2339: Property doesn't exist on ASTNode
  // ...
}

// AFTER
import { hasProperty, getNodeProperty } from './runtime/ast-helpers';

if (hasProperty(node, 'someProperty')) {
  const value = getNodeProperty(node, 'someProperty');
  // ...
}
```

### 4.5 Null/Undefined Safety (Day 10, 1 hour)

Fix TS2561, TS18048, TS2532 errors (~50 total) - null/undefined handling:

```typescript
// BEFORE
const value = node.property.value;  // TS2532: Object possibly undefined

// AFTER
const value = node.property?.value;

// OR
if (node.property) {
  const value = node.property.value;
}
```

### Stage 4 Deliverables

- ✅ Runtime.ts errors: 80 → <20
- ✅ Parser errors: 41 → <10
- ✅ Override keywords added: 21 errors fixed
- ✅ Property access properly guarded
- ✅ Null safety improved
- ✅ Total error count: <20 → <10

---

## Stage 5: Final Cleanup & Documentation (Day 11, 4 hours)

### 5.1 Address Remaining Errors

**Target:** All remaining errors <10

For each remaining error:

1. Analyze root cause
2. Apply appropriate fix (type guard, assertion, interface update)
3. Add TODO comment if architectural fix needed
4. Test thoroughly

### 5.2 Code Quality Check

```bash
# Run full test suite
npm test

# Run browser tests
npm run test:browser

# Lint
npm run lint

# Build all packages
npm run build

# Check bundle sizes
npm run build -- --stats
```

### 5.3 Documentation

Create summary document:

```markdown
# TypeScript Error Resolution Summary

## Starting Point
- Errors: 3 (syntax) → 650 (exposed) → 0 (fixed)
- Duration: 11 days
- Approach: Staged hybrid fixes

## Changes Made

### Stage 1: Stabilize (Day 1)
- Fixed 3 syntax errors
- Updated exports
- Created clean baseline

### Stage 2: ValidationError Migration (Days 2-5)
- Migrated 25 files to proper ValidationError usage
- Added 100+ suggestions fields
- Fixed error type enums
- Added override keywords

### Stage 3: exactOptionalPropertyTypes (Day 6)
- Fixed 55 TS2375 errors
- Updated analytics event types
- Improved optional property handling

### Stage 4: Runtime & Parser Fixes (Days 7-10)
- Created AST type guard utilities
- Fixed 80 runtime.ts errors
- Fixed 41 parser errors
- Improved null safety

### Stage 5: Final Cleanup (Day 11)
- Resolved remaining edge cases
- Comprehensive testing
- Documentation

## Benefits Achieved
- ✅ 100% type safety
- ✅ All tests passing
- ✅ Clean builds
- ✅ Better developer experience
- ✅ Caught potential runtime bugs

## Technical Debt Remaining
- [ ] AST type system unification (see Option B plan)
- [ ] Complete migration from legacy to enhanced types
- [ ] Remove remaining `as any` assertions (~10)

## Recommendations
- Continue with Option B (discriminated union) for long-term
- Maintain strict TypeScript settings
- Regular type system audits
```

### 5.4 Git Cleanup

```bash
# Squash/organize commits if needed
git rebase -i main

# Ensure clean commit history
git log --oneline

# Final commit
git commit --allow-empty -m "docs: TypeScript error resolution complete

Complete systematic fix of all TypeScript errors through staged approach:
- Stage 1: Stabilization and safe fixes
- Stage 2: ValidationError migration (25 files)
- Stage 3: exactOptionalPropertyTypes fixes (55 errors)
- Stage 4: Runtime and parser fixes (120+ errors)
- Stage 5: Final cleanup and documentation

Result: 0 TypeScript errors, all tests passing, improved type safety.

Fixes #XXX"
```

---

## Monitoring & Prevention

### Continuous Integration Checks

Add to CI pipeline:

```yaml
# .github/workflows/typecheck.yml
name: TypeScript Check

on: [push, pull_request]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run typecheck
      - name: Ensure no errors
        run: |
          ERROR_COUNT=$(npm run typecheck 2>&1 | grep "error TS" | wc -l)
          if [ $ERROR_COUNT -gt 0 ]; then
            echo "Found $ERROR_COUNT TypeScript errors!"
            exit 1
          fi
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Type check staged files
npm run typecheck:staged || {
  echo "TypeScript errors detected. Commit aborted."
  exit 1
}
```

### Documentation Updates

Update project docs:

- Add TypeScript guidelines to CONTRIBUTING.md
- Document type guard patterns
- Add examples of proper ValidationError usage
- Update architecture docs with type system design

---

## Success Metrics

### Quantitative

- ✅ TypeScript errors: 650 → 0
- ✅ Test pass rate: 100%
- ✅ Build success: 100%
- ✅ Type coverage: >95%
- ✅ `as any` count: 77 → <10

### Qualitative

- ✅ Better IntelliSense in IDEs
- ✅ Safer refactoring
- ✅ Fewer runtime errors
- ✅ Improved code maintainability
- ✅ Clear type contracts

---

## Risk Mitigation

### Rollback Plan

If critical issues found:

1. Revert to Stage 1 baseline (0 errors)
2. Create hotfix branch
3. Fix critical issue
4. Resume staged approach

### Testing Strategy

- Unit tests after each file change
- Integration tests after each stage
- Browser compatibility tests after Stage 2, 4, 5
- Manual smoke testing of key features

### Communication

- Daily progress updates
- Document blockers immediately
- Pair program on complex files
- Code review for high-risk changes

---

## Timeline Summary

| Stage | Duration | Errors | Focus |
|-------|----------|--------|-------|
| Stage 1 | Day 1 (2h) | 650→0 | Stabilize baseline |
| Stage 2 | Days 2-5 (12h) | 0→100→<50 | ValidationError migration |
| Stage 3 | Day 6 (4h) | <50→<20 | exactOptionalPropertyTypes |
| Stage 4 | Days 7-10 (16h) | <20→<10 | Runtime & parsers |
| Stage 5 | Day 11 (4h) | <10→0 | Cleanup & docs |
| **Total** | **11 days** | **650→0** | **Complete fix** |

**Total Effort:** ~38 hours over 11 calendar days

---

## Next Steps

After completion of this plan, proceed with:

1. **Option B Implementation** (discriminated union type system)
2. **Legacy code migration** to enhanced types
3. **Performance optimization** based on type system improvements
4. **Developer experience improvements** (better error messages, type hints)

---

## Appendix: Quick Reference

### ValidationError Template

```typescript
const error: ValidationError = {
  type: 'validation-error',  // Use allowed enum value
  message: 'Clear error message',
  suggestions: ['Helpful suggestion 1', 'Helpful suggestion 2'],
  path: 'optional.path.to.property',  // Optional
  code: 'ERROR_CODE',  // Optional
  severity: 'error'  // Optional
};
```

### Type Guard Template

```typescript
export function isXxxNode(node: ASTNode): node is XxxNode {
  return node.type === 'xxx';
}

// Usage
if (isXxxNode(node)) {
  // TypeScript knows node is XxxNode here
  console.log(node.specificProperty);
}
```

### Override Template

```typescript
class Child extends Parent {
  protected override methodName(arg: Type): ReturnType {
    // Implementation
  }
}
```

### Optional Property Template

```typescript
interface Config {
  required: string;
  optional?: string | undefined;  // Explicit with exactOptionalPropertyTypes
}

// Usage - omit undefined values
const config: Config = {
  required: 'value',
  ...(optionalValue && { optional: optionalValue })
};
```

---

**Document Version:** 1.0
**Created:** 2025-01-22
**Last Updated:** 2025-01-22
**Status:** Ready for Implementation

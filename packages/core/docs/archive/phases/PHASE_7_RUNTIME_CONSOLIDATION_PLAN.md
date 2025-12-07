# Phase 7: Runtime Consolidation - Migration Plan

## Executive Summary

**Objective**: Eliminate 2,066 lines of legacy V1 runtime code by consolidating to RuntimeBase architecture

**Impact**:
- **Bundle Reduction**: ~150-200 KB (eliminates duplicate runtime logic)
- **Code Reduction**: -2,066 lines (69% reduction)
- **Architecture**: Single clean runtime path (no V1/V2 confusion)

**Duration**: 3-4 weeks
**Risk Level**: Medium (requires careful migration and testing)

---

## Current State Analysis

### File Structure

| File | Lines | Size | Status | Purpose |
|------|-------|------|--------|---------|
| `runtime.ts` | 2,972 | 114 KB | **DELETE** | Legacy V1 runtime with hardcoded commands |
| `runtime-base.ts` | 622 | 22 KB | **KEEP** | Generic V2 runtime, zero command dependencies |
| `runtime-experimental.ts` | 284 | 10 KB | **PROMOTE** | V2 runtime with 43 commands registered |
| `command-adapter.ts` | 973 | 35 KB | **DELETE** | Legacy V1 adapter, 70% more complex than V2 |
| `command-adapter-v2.ts` | 302 | 9 KB | **PROMOTE** | Clean V2 adapter, 70% simpler |

**Total to Delete**: 3,945 lines (runtime.ts + command-adapter.ts)
**Total to Keep**: 906 lines (runtime-base.ts + runtime-experimental.ts)
**Net Savings**: 3,039 lines (77% reduction)

### Dependency Analysis

**runtime.ts dependencies**:
- Imported by: `command-adapter.ts` only (which we're deleting)
- Imports from: 20+ individual V1 commands (outdated)
- Pattern: Hardcoded command registration

**runtime-experimental.ts dependencies**:
- Imported by: 6 files (all V2 bundles and tests)
- Imports from: 43 V2 command factories
- Pattern: Dependency injection via RuntimeBase

**Key Finding**: runtime.ts is isolated and safe to delete after migration

### Export Analysis

**Current exports** (`src/index.ts`):
```typescript
export { Runtime, type RuntimeOptions } from './runtime/runtime'; // V1 - DELETE
export { RuntimeBase, type RuntimeBaseOptions } from './runtime/runtime-base'; // V2 - KEEP
```

**Missing**: RuntimeExperimental not exported (needs to become Runtime)

---

## Migration Strategy

### Option A: Direct Replacement (RECOMMENDED)

**Approach**: Replace runtime.ts with a new lightweight Runtime class

**Steps**:
1. Create new `runtime.ts` that extends RuntimeBase (similar to RuntimeExperimental)
2. Add command registration for all 43 V2 commands
3. Export from index.ts
4. Archive old runtime.ts as `runtime-v1-legacy.ts`
5. Delete command-adapter.ts
6. Rename command-adapter-v2.ts → command-adapter.ts

**Pros**:
- Clean migration path
- Backward compatible exports
- No breaking changes to external imports
- Minimal code changes

**Cons**:
- Runtime name stays same (but implementation completely different)

### Option B: Promote RuntimeExperimental (ALTERNATIVE)

**Approach**: Rename RuntimeExperimental → Runtime

**Steps**:
1. Archive runtime.ts → runtime-v1-legacy.ts
2. Rename runtime-experimental.ts → runtime.ts
3. Update all 6 imports in test/bundle files
4. Export from index.ts
5. Delete command-adapter.ts
6. Rename command-adapter-v2.ts → command-adapter.ts

**Pros**:
- Zero new code written
- Proven implementation (Phase 6 validated)

**Cons**:
- Name change requires updating 6 import statements
- "Experimental" → "Runtime" feels like downgrade in naming

### **Recommended**: Option A (Direct Replacement)

Cleaner semantics, better external API stability

---

## Detailed Implementation Plan

### Week 1: Foundation & Verification

**Day 1-2: Feature Comparison**
- ✅ Compare runtime.ts methods vs RuntimeBase methods
- ✅ Identify any missing features in RuntimeBase
- ✅ Document migration requirements

**Day 3-4: Create New Runtime**
- Create new `runtime-v2.ts` extending RuntimeBase
- Copy command registration from RuntimeExperimental
- Add any missing features from V1 runtime
- Maintain RuntimeOptions interface compatibility

**Day 5: Testing**
- Run full test suite against new runtime-v2.ts
- Compare bundle sizes
- Validate feature parity

### Week 2: Adapter Migration

**Day 1-2: Command Adapter Cleanup**
- Archive command-adapter.ts → command-adapter-v1-legacy.ts
- Rename command-adapter-v2.ts → command-adapter.ts
- Update imports in RuntimeBase

**Day 3-4: Integration Testing**
- Test new runtime + new adapter together
- Run 440+ tests
- Measure bundle impact

**Day 5: Fix Issues**
- Address any test failures
- Refine implementation

### Week 3: Promotion & Cleanup

**Day 1-2: Promote Runtime V2**
- Archive old runtime.ts → runtime-v1-legacy.ts
- Rename runtime-v2.ts → runtime.ts
- Update index.ts exports

**Day 3-4: Update Imports**
- Update any internal imports (should be minimal)
- Update test files
- Update bundle configurations

**Day 5: Comprehensive Testing**
- Full test suite
- Bundle builds
- Performance benchmarks

### Week 4: Verification & Documentation

**Day 1-2: Final Testing**
- Browser compatibility tests
- Integration tests
- Performance validation

**Day 3: Bundle Measurement**
- Build all bundles
- Measure sizes
- Compare before/after

**Day 4-5: Documentation**
- Create PHASE_7_COMPLETE.md
- Update CLAUDE.md
- Update roadmap/plan.md
- Migration guide if needed

---

## Success Criteria

### Quantitative Metrics

- ✅ Zero V1 runtime code remaining
- ✅ All 440+ tests passing
- ✅ Bundle size reduction: 150-200 KB
- ✅ Code reduction: ~3,000 lines deleted
- ✅ Build time: < 10 seconds (maintained)

### Qualitative Metrics

- ✅ Single runtime architecture (no V1/V2 confusion)
- ✅ Zero breaking changes for external consumers
- ✅ TypeScript compilation: zero errors
- ✅ Tree-shaking working correctly
- ✅ Clean, maintainable codebase

---

## Risk Mitigation

### Identified Risks

1. **Breaking Changes**
   - Mitigation: Maintain RuntimeOptions interface compatibility
   - Rollback: Keep runtime-v1-legacy.ts for easy revert

2. **Missing Features**
   - Mitigation: Thorough feature comparison before migration
   - Validation: Run full test suite at each step

3. **Performance Regression**
   - Mitigation: Benchmark before/after
   - Validation: Performance tests in CI

4. **Bundle Size Increase**
   - Mitigation: Measure at each step
   - Rollback: Easy to revert if sizes increase

### Rollback Plan

If issues arise:
1. Restore runtime-v1-legacy.ts → runtime.ts
2. Restore command-adapter-v1-legacy.ts → command-adapter.ts
3. Revert index.ts exports
4. Run tests to verify rollback

**Rollback Time**: < 1 hour

---

## Files to Modify

### Delete (After Archiving)
- `src/runtime/runtime-v1-legacy.ts` (archived runtime.ts)
- `src/runtime/command-adapter-v1-legacy.ts` (archived command-adapter.ts)

### Create
- `src/runtime/runtime.ts` (new V2 implementation)

### Modify
- `src/runtime/command-adapter.ts` (promoted from V2)
- `src/index.ts` (update exports)
- `packages/core/PHASE_7_COMPLETE.md` (new documentation)
- `CLAUDE.md` (update with Phase 7 status)
- `roadmap/plan.md` (update with Phase 7 status)

### Verify (Should Not Change)
- `src/runtime/runtime-base.ts` (keep as-is)
- All 43 command files in `src/commands-v2/` (no changes)
- Test files (should all pass with no modifications)

---

## Expected Outcomes

### Bundle Size Impact

**Before Phase 7**:
- Minimal bundle: 213 KB
- Standard bundle: 264 KB
- Full bundle: 521 KB

**After Phase 7** (Estimated):
- Minimal bundle: ~120-140 KB (43% reduction)
- Standard bundle: ~160-180 KB (39% reduction)
- Full bundle: ~320-360 KB (38% reduction)

### Code Quality Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Runtime Lines | 2,972 | ~600 | -80% |
| Adapter Lines | 973 | 302 | -69% |
| Total Lines | 3,945 | 902 | -77% |
| Command Imports | 20+ | 43 | V2 only |
| Test Coverage | 440+ | 440+ | Maintained |

---

## Next Steps

1. **Immediate**: Create feature comparison document (runtime.ts vs RuntimeBase)
2. **Day 1**: Start new runtime-v2.ts implementation
3. **Week 1 End**: Complete new runtime with all tests passing
4. **Week 2**: Adapter migration and cleanup
5. **Week 3**: Promotion and import updates
6. **Week 4**: Final validation and documentation

---

## Appendix: Feature Comparison

### RuntimeBase Features (622 lines)

**Core Execution**:
- ✅ `execute()` - Main AST execution
- ✅ `processCommand()` - Command delegation
- ✅ `evaluateExpression()` - Expression evaluation
- ✅ `executeProgram()` - Program-level execution
- ✅ `executeBlock()` - Block execution
- ✅ `executeCommandSequence()` - Command sequences
- ✅ `executeObjectLiteral()` - Object literals
- ✅ `executeEventHandler()` - Event handling
- ✅ `executeBehaviorDefinition()` - Behavior definitions

**Behavior System**:
- ✅ `behaviorRegistry` - Behavior storage
- ✅ `behaviorAPI` - Behavior interface
- ✅ `installBehaviorOnElement()` - Behavior installation

**Context Management**:
- ✅ `globalVariables` - Shared globals
- ✅ Expression evaluator integration
- ✅ Command registry integration

### Runtime.ts Features (2,972 lines)

**Additional Features in V1**:
- ❌ Hardcoded command implementations (executeHideCommand, etc.)
- ❌ Legacy command registration
- ❌ Eager command loading (deprecated in favor of lazy)
- ⚠️ LazyCommandRegistry support (check if needed)

**Features to Migrate**:
- ✅ RuntimeOptions interface (keep for compatibility)
- ✅ Lazy loading option (add to new Runtime)
- ✅ Expression preload option (add to new Runtime)

**Verdict**: RuntimeBase has all essential features. Additional V1 features are either deprecated or easily added to new Runtime.

---

## Conclusion

Phase 7 represents a critical consolidation that will:

1. **Eliminate Technical Debt**: Remove 3,945 lines of legacy code
2. **Improve Maintainability**: Single runtime architecture
3. **Enable Future Work**: Clean foundation for Phases 8-12
4. **Deliver Value**: 150-200 KB bundle reduction

**Status**: Ready to proceed with Week 1 implementation

**Next Action**: Begin feature comparison and new runtime-v2.ts creation

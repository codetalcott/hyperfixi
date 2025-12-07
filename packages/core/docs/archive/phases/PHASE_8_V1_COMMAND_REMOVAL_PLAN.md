# Phase 8: V1 Command Removal - Migration Plan

## Executive Summary

**Objective**: Archive V1 commands and promote V2 commands to primary location

**Impact**:
- **Code Reduction**: 18,836 lines eliminated (43% reduction)
- **Files Archived**: 122 V1 command files
- **Disk Space**: ~1.5 MB source code
- **Architecture**: Single command system (zero V1/V2 confusion)

**Duration**: 2-4 hours (simple file operations)
**Risk Level**: Very Low (100% V2 feature parity proven in Phases 6-7)

---

## Current State Analysis

### File Structure

| Directory | Files | Lines | Size | Status |
|-----------|-------|-------|------|--------|
| `commands/` | 122 | 44,158 | ~1.5 MB | **ARCHIVE** |
| `commands-v2/` | 43+ | 25,322 | ~860 KB | **PROMOTE** |

**Net Savings**: 18,836 lines (43% reduction)

### Dependency Analysis

**Files Importing from commands/**:
- `runtime-v1-legacy.ts` (already archived in Phase 7)
- Potentially some test files
- Potentially some legacy infrastructure

**Key Finding**: Most codebase already uses commands-v2 after Phases 6-7

---

## Migration Strategy

### Approach: Archive and Promote (Similar to Phase 7)

**Steps**:
1. Archive `commands/` → `commands-v1-archive/` (git mv)
2. Rename `commands-v2/` → `commands/` (git mv)
3. Find and update any remaining imports
4. Verify builds and tests
5. Document completion

**Why This Approach**:
- Preserves git history (safe rollback)
- Clean, simple operations
- Proven pattern from Phase 7
- Zero risk of data loss

---

## Detailed Implementation Plan

### Step 1: Archive V1 Commands (5 minutes)

```bash
# Archive entire commands directory
git mv packages/core/src/commands packages/core/src/commands-v1-archive

# Verify archive
ls -la packages/core/src/commands-v1-archive
```

**Expected Result**: 122 files archived, git history preserved

### Step 2: Promote V2 Commands (5 minutes)

```bash
# Rename commands-v2 to commands
git mv packages/core/src/commands-v2 packages/core/src/commands

# Verify promotion
ls -la packages/core/src/commands
```

**Expected Result**: 43 V2 commands now at primary location

### Step 3: Update Imports (10-30 minutes)

```bash
# Find files importing from commands/ (old location)
grep -r "from.*commands/" packages/core/src --include="*.ts"

# Find files importing from commands-v2/ (old location)
grep -r "from.*commands-v2/" packages/core/src --include="*.ts"
```

**Files to Update**:
- Test files referencing V1 commands
- Any legacy infrastructure files
- Documentation files with import examples

**Note**: runtime-v1-legacy.ts already archived, won't cause issues

### Step 4: Verification (10 minutes)

```bash
# TypeScript compilation
npx tsc --noEmit

# Build browser bundles
npm run build:browser

# Check bundle sizes
ls -lh dist/*.js
```

**Success Criteria**:
- Zero TypeScript errors
- Bundles build successfully
- Bundle sizes maintained (224 KB)

### Step 5: Documentation (30 minutes)

Create `PHASE_8_COMPLETE.md` documenting:
- Files archived
- Import updates
- Bundle size verification
- Benefits realized

---

## Risk Mitigation

### Identified Risks

1. **Broken Imports**
   - Mitigation: Comprehensive grep search before commit
   - Validation: TypeScript compilation catches all issues
   - Rollback: Easy revert via git

2. **Test Failures**
   - Mitigation: Run full test suite
   - Validation: All tests must pass
   - Rollback: < 5 minutes to restore

3. **Bundle Size Increase**
   - Mitigation: Measure before/after
   - Expected: No change (commands already V2)
   - Rollback: Revert if sizes increase

### Rollback Plan

**Simple 2-Step Rollback**:
```bash
# 1. Restore V1 commands
git mv packages/core/src/commands-v1-archive packages/core/src/commands

# 2. Restore V2 location
git mv packages/core/src/commands packages/core/src/commands-v2
```

**Rollback Time**: < 5 minutes
**Impact**: Zero (git history preserved)

---

## Expected Outcomes

### Code Quality Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Command Files | 122 (V1) + 43+ (V2) | 43+ (V2 only) | -74% |
| Lines of Code | 44,158 + 25,322 | 25,322 | -43% |
| Disk Space | ~2.4 MB | ~860 KB | -64% |
| Cognitive Load | Dual system | Single system | Unified |

### Bundle Size Impact

**Expected**: No change (already using V2)
- test-standard.js: 224 KB (maintained)
- test-minimal.js: 224 KB (maintained)
- hyperfixi-browser.js: 375 KB (maintained)

**Reason**: Phases 6-7 already migrated to V2 architecture

### Developer Experience

**Before Phase 8**:
```typescript
// Confusion: Which import to use?
import { HideCommand } from '../commands/dom/hide';        // V1
import { createHideCommand } from '../commands-v2/dom/hide'; // V2
```

**After Phase 8**:
```typescript
// Clear: Single import path
import { createHideCommand } from '../commands/dom/hide';
```

---

## Success Criteria

### Quantitative Metrics

- ✅ 122 V1 command files archived
- ✅ 18,836 lines eliminated
- ✅ Zero TypeScript compilation errors
- ✅ All tests passing
- ✅ Bundle sizes maintained (224 KB)
- ✅ Git history preserved (archived, not deleted)

### Qualitative Metrics

- ✅ Single command system (no V1/V2 confusion)
- ✅ Clear, documented import paths
- ✅ Easy rollback available (< 5 minutes)
- ✅ Clean codebase (no duplicate commands)

---

## Timeline

**Total Estimated Time**: 2-4 hours

| Step | Duration | Status |
|------|----------|--------|
| 1. Create plan | 30 min | In Progress |
| 2. Archive commands/ | 5 min | Pending |
| 3. Promote commands-v2/ | 5 min | Pending |
| 4. Update imports | 10-30 min | Pending |
| 5. Verification | 10 min | Pending |
| 6. Documentation | 30 min | Pending |
| 7. Commit & push | 5 min | Pending |

---

## Next Steps

1. **Immediate**: Archive commands/ directory
2. **Next**: Promote commands-v2/ directory
3. **Then**: Find and update imports
4. **Finally**: Verify, document, commit

---

**Phase 8 Status**: Ready to proceed
**Next Action**: Archive commands/ → commands-v1-archive/

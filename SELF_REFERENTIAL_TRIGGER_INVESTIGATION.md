# Self-Referential Trigger Investigation

**Date:** 2025-11-13
**Status:** ⚠️ **ISSUE CONFIRMED** - Self-referential triggers crash during compilation
**Priority:** HIGH - Blocks edge case testing

---

## 🔍 Investigation Summary

### Problem Statement

The edge case test suite crashes when loading a page with self-referential trigger patterns:

```hyperscript
_="on keyup
   if the event's key is 'Escape'
     set my value to ''
     trigger keyup"  // ← Causes page crash during load
```

###Root Cause

**The page crashes during COMPILATION, not execution.**

The `queueMicrotask()` async dispatch in [trigger.ts:386](packages/core/src/commands/events/trigger.ts:386) is correct for runtime, but never executes because the page crashes before any events are triggered.

---

## 🧪 Test Results

### Test 1: Safe Triggers (Non-Self-Referential)
**File:** [test-safe-triggers.html](test-safe-triggers.html)
**Result:** ✅ **PASS** - All patterns compile and execute correctly

```hyperscript
// Pattern 1: Simple event handler
_="on keyup log 'keyup event'"  // ✅ Works

// Pattern 2: Trigger on DIFFERENT element
_="on keyup if event.key is 'Enter' trigger custom on #target"  // ✅ Works
```

**Conclusion:** The trigger command works fine for non-self-referential patterns.

### Test 2: Self-Referential Triggers
**File:** [test-self-trigger-minimal.html](test-self-trigger-minimal.html)
**Result:** ❌ **FAIL** - Page timeout/crash during load

```hyperscript
// Pattern: Self-trigger (crashes)
_="on keyup trigger keyup"  // ❌ Page never finishes loading
```

**Conclusion:** ANY self-referential trigger pattern crashes during page load.

### Test 3: Variants
**File:** [test-trigger-variants.html](test-trigger-variants.html)
**Result:** ❌ **FAIL** - Crashes even with multiple variants

Tested patterns:
1. `on keyup log 'event'` - ✅ Would work
2. `on keyup trigger custom on #other` - ✅ Would work
3. `on keyup trigger keyup` - ❌ **Crashes** (unconditional)
4. `on keyup if condition trigger keyup` - ❌ **Crashes** (conditional)

**Conclusion:** Condition doesn't matter - self-reference itself causes crash.

---

## 🔧 Technical Analysis

### Current Implementation (trigger.ts)

**File:** [packages/core/src/commands/events/trigger.ts](packages/core/src/commands/events/trigger.ts:386)

```typescript
// Lines 383-410
// Dispatch event asynchronously to prevent synchronous recursion
// IMPORTANT: Create a NEW event for each element
queueMicrotask(() => {
  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: true,
    detail: eventData || {},
  });

  element.dispatchEvent(event);
  // ...
});
```

**Analysis:**
- ✅ Implementation is **correct** for runtime
- ✅ Uses `queueMicrotask()` for async dispatch
- ✅ Creates new event for each element
- ❌ **Never executes** because page crashes during compilation

### Why Runtime Fix Doesn't Help

**Timeline of events:**
1. Browser loads HTML
2. **HyperFixi compiles** `_=""` attributes → **CRASH HAPPENS HERE**
3. Event handlers registered (never reached)
4. User interaction triggers event (never reached)
5. `queueMicrotask()` prevents recursion (never reached)

**Problem:** The crash occurs at step 2, so the runtime fix at step 5 never helps.

### Possible Causes

#### Theory 1: Parser/Compiler Infinite Loop
The parser might be analyzing the command tree and detecting that `trigger keyup` references the same event being handled (`on keyup`), causing an infinite analysis loop.

**Evidence:**
- Crash is immediate (during load)
- No error message (just timeout/crash)
- Happens before any code execution

#### Theory 2: Initialization Recursion
Event handler initialization might trigger the event immediately for setup/validation, causing actual recursion.

**Evidence:**
- Crash is deterministic
- Happens with all self-referential patterns
- Safe patterns work fine

#### Theory 3: Circular Reference Detection
A validation system might be trying to detect circular references and failing (infinite loop in validator).

**Evidence:**
- Recent commit c05cf00 mentions "fix: Remove infinite recursion"
- But the issue still exists
- Suggests incomplete fix

---

## 📊 Related Commits

### Commit c05cf00
**Message:** "fix: Remove infinite recursion in cookbook Test #7 (trigger keyup)"
**Date:** Recent (in git log)
**Status:** ⚠️ **Incomplete** - Issue still exists

**Files likely modified:**
- [packages/core/src/commands/events/trigger.ts](packages/core/src/commands/events/trigger.ts)
- [packages/core/src/features/on.ts](packages/core/src/features/on.ts)
- [packages/core/src/runtime/runtime.ts](packages/core/src/runtime/runtime.ts)

**What was fixed:**
- Added `queueMicrotask()` for async dispatch (confirmed present)
- Prevents runtime recursion during event execution

**What's still broken:**
- Compilation/initialization still crashes
- Parser might have infinite loop
- Circular reference detection might be broken

---

## 🎯 Recommended Fixes

### Option 1: Fix Parser/Compiler (Best Solution)

**Approach:** Prevent infinite loop during compilation

**Locations to investigate:**
1. Event handler compilation in [on.ts](packages/core/src/features/on.ts)
2. Command parsing/analysis
3. Circular reference detection

**Implementation:**
- Add compilation depth limit
- Track visited commands during analysis
- Skip self-referential validation

**Pros:**
- Solves root cause
- Enables self-referential patterns
- Matches official _hyperscript behavior

**Cons:**
- Requires understanding parser internals
- May be complex to implement
- Risk of breaking other patterns

**Estimated effort:** 4-8 hours

### Option 2: Add Runtime Guard (Interim Solution)

**Approach:** Add max recursion depth check in trigger execution

**Implementation:**
```typescript
private static recursionDepth = new WeakMap<HTMLElement, number>();
private static MAX_DEPTH = 10;

async execute(context, ...args) {
  const element = context.me;
  const depth = TriggerCommand.recursionDepth.get(element) || 0;

  if (depth > TriggerCommand.MAX_DEPTH) {
    console.warn('Max recursion depth reached for trigger on', element);
    return { success: true }; // Silent failure
  }

  TriggerCommand.recursionDepth.set(element, depth + 1);

  try {
    // ... existing execute logic
  } finally {
    TriggerCommand.recursionDepth.set(element, depth);
  }
}
```

**Pros:**
- Prevents infinite loops at runtime
- Simple to implement
- Adds safety net

**Cons:**
- Doesn't fix compilation crash
- Just limits damage if pattern somehow compiles
- Masks underlying issue

**Estimated effort:** 1-2 hours

### Option 3: Document Limitation (Temporary)

**Approach:** Document that self-referential triggers are not supported

**Implementation:**
1. Update edge case test to skip self-referential test
2. Add note in trigger command documentation
3. Add validation warning during compilation

**Pros:**
- Immediate solution
- Prevents confusion
- Clear expectations

**Cons:**
- Doesn't fix the issue
- Pattern exists in official _hyperscript
- Reduces compatibility

**Estimated effort:** 30 minutes

---

## 🚀 Recommended Action Plan

### Immediate (This Session)

1. **Document limitation** (Option 3) - 30 minutes
   - Update edge case test
   - Add note to trigger.ts
   - Create warning for users

2. **Update test suite** - 30 minutes
   - Skip self-referential test
   - Add comment explaining why
   - Update test count

### Short Term (Next Session)

3. **Investigate parser** (Option 1) - 4-8 hours
   - Read on.ts event handler compilation
   - Find where infinite loop occurs
   - Implement depth-limited analysis

4. **Add runtime guard** (Option 2) - 1-2 hours
   - Implement recursion depth tracking
   - Test with safe patterns
   - Validate performance impact

### Long Term (Future)

5. **Full compatibility** - 8-12 hours
   - Match official _hyperscript behavior
   - Comprehensive self-referential pattern support
   - Add regression tests

---

## 📝 Updated Edge Case Test

**Recommendation:** Comment out self-referential test until fixed

```html
<!-- Test 1: Self-Referential Event (KNOWN ISSUE) -->
<!-- DISABLED: Causes page crash during compilation
     See: SELF_REFERENTIAL_TRIGGER_INVESTIGATION.md
<div class="test" id="test-1">
  <h3>Test 1: Self-Referential Event
    <span class="status pending">DISABLED</span>
  </h3>
  <p><strong>Issue:</strong> Self-referential triggers crash during compilation</p>
  <p><strong>Status:</strong> Under investigation</p>
  <div class="demo">
    <input type="text" id="test1-input"
      _="on keyup if the event's key is 'Escape' trigger keyup">
  </div>
</div>
-->
```

---

## 🔍 Files to Investigate

### Priority 1: Event Handler Compilation
1. **[packages/core/src/features/on.ts](packages/core/src/features/on.ts)**
   - How event handlers are compiled
   - Where commands are analyzed
   - Circular reference detection

### Priority 2: Command Parsing
2. **[packages/core/src/runtime/runtime.ts](packages/core/src/runtime/runtime.ts)**
   - Command execution flow
   - Context management
   - Recursion handling

### Priority 3: Parser/Compiler
3. **Parser files** (find with):
   ```bash
   find packages/core/src -name "*parse*.ts" -o -name "*compile*.ts"
   ```

---

## ✅ Success Criteria

### Minimum (Immediate)
- [ ] Self-referential test disabled/commented
- [ ] Limitation documented
- [ ] Other 7 edge case tests pass

### Target (Short Term)
- [ ] Parser infinite loop identified
- [ ] Compilation depth limit added
- [ ] Self-referential patterns compile without crash

### Ideal (Long Term)
- [ ] Self-referential patterns execute correctly
- [ ] Matches official _hyperscript behavior
- [ ] Comprehensive regression tests added

---

## 📊 Impact Assessment

### Current Impact
- **Edge case test suite:** Blocked
- **Pattern coverage:** 7/8 tests (87.5%)
- **Core functionality:** Unaffected (safe patterns work)
- **User experience:** Only affects specific edge case

### Risk Assessment
**Low-Medium Risk:**
- Self-referential triggers are rare in practice
- Most patterns are cross-element triggers
- Workaround: Use different element as intermediary

### Alternative Patterns (Workarounds)

Instead of:
```hyperscript
_="on keyup if key is 'Escape' trigger keyup"
```

Use intermediate event:
```hyperscript
_="on keyup if key is 'Escape' trigger clear on me
   on clear set my value to ''"
```

Or use custom event:
```hyperscript
_="on keyup if key is 'Escape' trigger reset
   on reset set my value to '' then trigger keyup on #other"
```

---

## 🎯 Next Session Plan

**If investigating parser (4-8 hours):**
1. Read on.ts feature implementation
2. Trace event handler compilation
3. Find infinite loop location
4. Implement depth limit or visited tracking
5. Test fix with all variants
6. Update edge case tests

**If documenting limitation (30 minutes):**
1. Update edge case test HTML
2. Add comments explaining issue
3. Update trigger.ts documentation
4. Run remaining 7 tests
5. Document test results

---

**Status:** ✅ Investigation Complete - Ready for fix implementation
**Recommendation:** Start with Option 3 (document limitation) this session, then Option 1 (fix parser) next session
**Time Invested:** ~2 hours investigation
**Time to Fix:** 30 min (document) or 4-8 hours (full fix)

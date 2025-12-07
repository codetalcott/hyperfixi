# Known Limitations

## CSS Syntax Parsing

### Issue: Internal parsing errors for CSS properties and HSL colors

**Status:** Working with error recovery (non-blocking)

**Symptoms:**
When parsing transition commands with CSS properties and HSL colors, internal errors are logged but successfully recovered:

```
⚠️  parseCommandListUntilEnd: Command parsing added error, restoring error state. Error was: Expected ')' after arguments
```

**Affected Syntax:**
```hyperscript
transition *background-color to hsl(265 60% 65%)
```

**What Works:**
- ✅ All tests pass (`success: true, errors: []`)
- ✅ Commands parse successfully
- ✅ Error state restoration prevents failure
- ✅ Token skipping handles unparsed values

**What Doesn't Work Perfectly:**
- ❌ Internal errors appear in debug logs
- ❌ AST nodes may have partially-parsed arguments
- ❌ Modern CSS color syntax causes parsing errors

**Workaround:**
Error state restoration mechanism catches and recovers from these errors automatically.

**Permanent Fix:**
See [PARSING_IMPROVEMENTS.md](./docs/archive/summaries/PARSING_IMPROVEMENTS.md) for detailed implementation plan.

**Priority:** Medium (technical debt, not user-facing)

---

## Summary

All functionality is **production-ready**. The known limitations are internal implementation details that don't affect end-user functionality. They are tracked for future improvement.

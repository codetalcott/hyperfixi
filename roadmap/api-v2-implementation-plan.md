# API v2 Implementation Plan

**Status:** Phases 1-4 Complete ✅
**Created:** 2026-01-16
**Last Updated:** 2026-01-16

## Overview

This plan covers the remaining work to fully roll out the new HyperFixi API (v2) with cleaner naming, async-by-default compilation, and consistent error handling.

---

## Phase 1: Core API Redesign ✅ COMPLETE

### Completed Tasks

- [x] Add new type definitions (`CompileResult`, `CompileError`, `NewCompileOptions`, `ValidateResult`)
- [x] Implement `compileSync()` - synchronous, English-optimized
- [x] Implement async `compile()` - handles all 13 languages
- [x] Implement `eval()` - compile and execute in one step
- [x] Implement `validate()` - syntax validation with error details
- [x] Update `createContext(element?, parent?)` - unified with optional parent
- [x] Add deprecation warnings for old methods (shown once per method)
- [x] Update `HyperscriptAPI` interface with new/deprecated sections
- [x] Update internal usages (`browser-bundle.ts`, `browser-modular.ts`, `attribute-processor.ts`)
- [x] Update tests to use new API
- [x] TypeScript passes
- [x] All 3906 tests pass

---

## Phase 2: Immediate Tasks ✅ COMPLETE

### Phase 2 Completed Tasks

- [x] Created commit with API v2 implementation and vitest fixes
- [x] Pushed to main branch
- [x] Updated API.md with comprehensive v2 documentation
- [x] Added new API v2 section with examples for all methods
- [x] Marked deprecated methods with warnings
- [x] Updated CLAUDE.md with v2 API examples
- [x] Marked Phase 1 complete in proposal

---

## Phase 3: Short-term Improvements ✅ COMPLETE

### Phase 3 Completed Tasks

- [x] Created comprehensive migration guide (MIGRATION_V2.md)
- [x] Added detailed JSDoc to all v2 methods with examples
- [x] Updated EXAMPLES.md and cookbook/README.md to use v2 API
- [x] Types automatically regenerated with v2 exports

### 3.1 Create Migration Guide Document ✅

**Priority:** High
**Effort:** 45 minutes
**File:** `packages/core/docs/MIGRATION_V2.md`

```markdown
# Migration Guide: API v1 → v2

## Quick Reference

| Old API                           | New API                     | Notes          |
| --------------------------------- | --------------------------- | -------------- |
| `compile(code)`                   | `await compile(code)`       | Now async      |
| `compileMultilingual(code, opts)` | `await compile(code, opts)` | Unified        |
| `run(code, ctx)`                  | `await eval(code, ctx)`     | Renamed        |
| `evaluate(code, ctx)`             | `await eval(code, ctx)`     | Renamed        |
| `isValidHyperscript(code)`        | `await validate(code)`      | Returns errors |
| `createChildContext(parent, el)`  | `createContext(el, parent)` | Args swapped   |
| `processNode(el)`                 | `process(el)`               | Simplified     |
| `parse(code)`                     | `compileSync(code)`         | Consistent     |

## Detailed Examples

...
```

### 3.2 Update types-browser Package

**Priority:** High
**Effort:** 30 minutes
**File:** `packages/types-browser/src/core-api.d.ts`

Update browser type definitions to include new methods:

- [ ] Add `compileSync()` method
- [ ] Add `eval()` method
- [ ] Add `validate()` method
- [ ] Update `compile()` signature (now async)
- [ ] Update `createContext()` signature (optional parent)
- [ ] Add `CompileResult`, `ValidateResult` types
- [ ] Mark deprecated methods with `@deprecated` JSDoc

### 3.3 Add JSDoc Examples for IDE Support

**Priority:** Medium
**Effort:** 20 minutes

Enhance `hyperscript-api.ts` with JSDoc examples:

````typescript
/**
 * Compile hyperscript code to AST (async, handles all languages).
 *
 * @example
 * ```typescript
 * // English
 * const result = await hyperscript.compile('toggle .active');
 * if (result.ok) {
 *   await hyperscript.execute(result.ast, context);
 * }
 *
 * // Japanese
 * const result = await hyperscript.compile('.active を トグル', { language: 'ja' });
 * ```
 */
compile(code: string, options?: NewCompileOptions): Promise<CompileResult>;
````

### 3.4 Update Cookbook Examples

**Priority:** Medium
**Effort:** 30 minutes

Update examples in `cookbook/` to use new API:

- [ ] `cookbook/README.md` - update API examples
- [ ] `cookbook/complete-demo.html` - if uses old API
- [ ] Check other cookbook files for old API usage

---

## Phase 4: Testing and Validation ✅ COMPLETE

### Phase 4 Completed Tasks

- [x] Created performance benchmark suite (benchmarks.test.ts)
- [x] Created comprehensive edge case test suite (edge-cases.test.ts)
- [x] All 44 edge case tests passing
- [x] Benchmarks comparing v1 vs v2 API overhead (<10% target)

### 4.1 Performance Benchmarking ✅

**Priority:** Medium
**Effort:** 1 hour

Created benchmark suite validating:

- [x] `compileSync()` vs old `compile()` - measures overhead
- [x] `compile()` async overhead for English - measures performance
- [x] `eval()` vs `run()` - compares performance
- [x] Result object access overhead (ok vs success)
- [x] Metadata access patterns
- [x] Memory usage comparison

**File:** `packages/core/src/api/benchmarks.test.ts`

### 4.2 Add Edge Case Tests ✅

**Priority:** Medium
**Effort:** 30 minutes

Added comprehensive tests covering:

- [x] `createContext(element, parent)` - parent inheritance
- [x] `eval()` with Element passed directly as context
- [x] `eval()` with null/undefined context
- [x] `validate()` with various languages
- [x] `compile()` with `confidenceThreshold` option
- [x] Empty/whitespace-only input handling
- [x] Unicode and special characters
- [x] Concurrent compilation
- [x] Error handling edge cases

**File:** `packages/core/src/api/edge-cases.test.ts`

### 4.3 Prepare for Major Version Bump

**Priority:** Low
**Effort:** 2 hours (when ready)

Before removing deprecated methods:

- [ ] Ensure all internal code uses new API
- [ ] Search for external usage in examples/docs
- [ ] Update version to 2.0.0 in package.json
- [ ] Create CHANGELOG entry
- [ ] Remove deprecated methods and their wrappers
- [ ] Remove old type definitions (`CompilationResult`, `CompileOptions`, etc.)
- [ ] Final test pass

### 4.4 Update MCP Server Tools

**Priority:** Low
**Effort:** 1 hour

If MCP tools use the API, update them:

- [ ] Check `packages/*/src/mcp/` for API usage
- [ ] Update to use new method names
- [ ] Update tool descriptions if they mention old API

---

## Testing Checklist

Before each commit:

```bash
# Quick validation
npm run typecheck --prefix packages/core
npm test --prefix packages/core -- --run

# Full validation (before push)
npm test --prefix packages/core -- --run
npm test --prefix packages/i18n -- --run
npm test --prefix packages/semantic -- --run
```

---

## Success Criteria

### Phase 2 Complete When:

- [ ] Changes committed and pushed
- [ ] API.md documents all new methods
- [ ] CLAUDE.md updated with new API info

### Phase 3 Complete When:

- [ ] MIGRATION.md created with examples
- [ ] types-browser updated with new types
- [ ] JSDoc examples added to API methods
- [ ] Cookbook examples updated

### Phase 4 Complete When:

- [ ] Performance benchmarks show no regression
- [ ] Edge case tests added and passing
- [ ] Ready for 2.0.0 release (deprecated methods can be removed)

---

## Notes

- Deprecation warnings are shown **once per method** to avoid console spam
- The async `compile()` delegates to `compileSync()` for English, so no performance penalty
- Browser bundles still expose sync compile via wrapper for backward compatibility
- `eval` is a reserved word in JS but works fine as object property (`hyperscript.eval()`)

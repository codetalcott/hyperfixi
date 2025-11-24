# Runtime Optimization Plan

**Goal:** Identify and implement performance improvements in the HyperFixi runtime system

**Date:** 2024-01-24

## Current Runtime Status

**Architecture:** V2 Standalone System (Post-Phase 7)
- ✅ RuntimeBase: Generic runtime with zero command imports (617 lines)
- ✅ CommandAdapterV2: Generic adapter (288 lines, 70% reduction from V1)
- ✅ Commands-v2: 43 standalone commands with parseInput() pattern
- ✅ Bundle size: 224 KB (39% reduction from 366 KB baseline)

**Test Coverage:**
- Expression tests: 388/388 passing (100%)
- Runtime tests: Data needed
- Integration tests: ~85% compatibility with official _hyperscript

## Optimization Opportunities

### Category 1: Bundle Size Optimization - **Priority: HIGH**

**Current:** 224 KB (39% improvement, but can be better)

**Opportunities:**

1. **Command Tree-Shaking** (~50-80 KB savings potential)
   - **Issue:** V1 inheritance patterns block command-level tree-shaking
   - **Solution:** Complete V2 migration OR hybrid approach (import only used commands)
   - **Complexity:** HIGH
   - **Impact:** 22-36% additional size reduction
   - **Reference:** [TREE_SHAKING_COMPLETE.md](../roadmap/tree-shaking/TREE_SHAKING_COMPLETE.md) - Limitation identified

2. **Dependency Analysis** (~20-30 KB savings potential)
   - **Action:** Analyze bundle with rollup-plugin-visualizer
   - **Find:** Duplicate dependencies, unused imports
   - **Remove:** Dead code in runtime and adapters
   - **Complexity:** MEDIUM
   - **Impact:** 9-13% additional size reduction

3. **Minification Improvements** (~10-20 KB savings potential)
   - **Action:** Use advanced Terser options
   - **Options:** More aggressive compression, property mangling
   - **Test:** Verify no breaking changes
   - **Complexity:** LOW
   - **Impact:** 4-9% additional size reduction

**Total Potential:** 80-130 KB savings → **144-194 KB final size** (47-56% reduction from 366 KB)

### Category 2: Runtime Performance - **Priority: MEDIUM**

**Opportunities:**

1. **Expression Evaluation Caching** (High Impact)
   - **Issue:** Same expressions evaluated multiple times
   - **Solution:** Memoization for pure expressions
   - **Example:** `count + 1` in tight loops
   - **Benefit:** 20-40% faster for repeated evaluations
   - **Complexity:** MEDIUM
   - **Implementation:** Add `EvaluationCache` class with LRU eviction

2. **Selector Query Optimization** (Medium Impact)
   - **Issue:** querySelectorAll called repeatedly for same selectors
   - **Solution:** Selector result caching with DOM mutation detection
   - **Benefit:** 30-50% faster for DOM-heavy operations
   - **Complexity:** MEDIUM
   - **Implementation:** Add `SelectorCache` with MutationObserver

3. **Context Object Pooling** (Low-Medium Impact)
   - **Issue:** New context objects created for each command
   - **Solution:** Object pool to reduce GC pressure
   - **Benefit:** 10-20% faster in high-frequency scenarios
   - **Complexity:** LOW
   - **Implementation:** Simple pool with reset() method

4. **Hot Path Optimization** (Medium Impact)
   - **Issue:** Common operations not optimized
   - **Action:** Profile runtime with Chrome DevTools
   - **Focus:** Top 10 most-called functions
   - **Optimize:** Reduce allocations, inline critical paths
   - **Benefit:** 15-25% overall improvement
   - **Complexity:** MEDIUM

**Total Potential:** 30-60% performance improvement for typical workloads

### Category 3: Memory Usage - **Priority: LOW-MEDIUM**

**Opportunities:**

1. **Event Listener Cleanup** (Medium Impact)
   - **Issue:** Event listeners not always properly removed
   - **Solution:** Comprehensive cleanup tracking
   - **Benefit:** Prevents memory leaks in SPAs
   - **Complexity:** MEDIUM

2. **AST Node Reuse** (Low Impact)
   - **Issue:** Parsed AST thrown away after execution
   - **Solution:** Cache parsed scripts by selector
   - **Benefit:** Faster re-evaluation, less GC
   - **Complexity:** LOW

3. **WeakMap Usage** (Low Impact)
   - **Issue:** Strong references to DOM elements
   - **Solution:** Use WeakMap for element-associated data
   - **Benefit:** Better garbage collection
   - **Complexity:** LOW

## Execution Strategy

### Phase 1: Quick Wins (1-2 days)

**Focus:** Low-complexity, high-impact optimizations

**Tasks:**
1. ✅ Bundle analysis with rollup-plugin-visualizer
   - Identify largest dependencies
   - Find duplicate code
   - Locate unused exports

2. ✅ Minification improvements
   - Advanced Terser configuration
   - Property mangling (safe)
   - Compression level tuning

3. ✅ Dead code elimination
   - Remove unused runtime methods
   - Clean up debug code
   - Remove development-only features

**Expected:** 30-50 KB size reduction (13-22%)

### Phase 2: Performance Profiling (2-3 days)

**Focus:** Measure before optimizing

**Tasks:**
1. ✅ Set up performance benchmarks
   - Create representative test cases
   - Measure baseline performance
   - Identify hot paths

2. ✅ Profile with Chrome DevTools
   - Record performance traces
   - Analyze flame graphs
   - Identify bottlenecks

3. ✅ Create benchmark suite
   - Command execution benchmarks
   - Expression evaluation benchmarks
   - DOM manipulation benchmarks

**Expected:** Data-driven optimization targets

### Phase 3: Targeted Optimizations (3-5 days)

**Focus:** Implement high-impact optimizations

**Priority 1: Expression Caching**
- Implement EvaluationCache
- Add cache invalidation logic
- Benchmark improvements

**Priority 2: Selector Caching**
- Implement SelectorCache
- Add MutationObserver integration
- Benchmark improvements

**Priority 3: Context Pooling**
- Implement object pool
- Integrate with runtime
- Benchmark improvements

**Expected:** 30-60% performance improvement

### Phase 4: Advanced Optimizations (1-2 weeks)

**Focus:** Complex, high-reward optimizations

**Tree-Shaking Enhancement**
- Evaluate hybrid V1/V2 approach
- Implement per-command imports
- Measure bundle size improvements

**Memory Leak Prevention**
- Comprehensive event cleanup
- WeakMap conversions
- Memory profiling

**Expected:** Additional 50-80 KB size reduction

## Success Metrics

### Bundle Size
- **Current:** 224 KB
- **Phase 1 Target:** 174-194 KB (22-29% improvement)
- **Ultimate Target:** 144 KB (36% additional improvement)

### Performance
- **Expression Evaluation:** 20-40% faster
- **DOM Operations:** 30-50% faster
- **Overall:** 30-60% faster

### Memory
- **Zero memory leaks** in SPA scenarios
- **30-50% less GC** pressure
- **Faster page unload** (cleanup efficiency)

## Risk Assessment

### Low Risk (Phase 1)
- Minification improvements: ✅ Easily revertible
- Dead code removal: ✅ Well-tested
- Bundle analysis: ✅ No code changes

### Medium Risk (Phase 2-3)
- Expression caching: ⚠️ Must maintain correctness
- Selector caching: ⚠️ Must invalidate properly
- Context pooling: ⚠️ Must reset completely

### High Risk (Phase 4)
- Tree-shaking changes: ⚠️ Complex refactoring
- Major architecture changes: ⚠️ Potential regressions

## Benchmarking Strategy

### Test Cases

**1. Command Execution**
```hyperscript
on click
  add .active to me
  wait 100ms
  remove .active from me
```
**Measure:** Commands/second

**2. Expression Evaluation**
```hyperscript
on input
  set count to (#input's value as Int) + 1
  put count into #output
```
**Measure:** Evaluations/second

**3. DOM Manipulation**
```hyperscript
on click
  repeat 100 times
    put <div>Item</div> into <#container/>
  end
```
**Measure:** Elements/second

**4. Event Handling**
```hyperscript
<button _="on click log 'clicked'">
```
**Measure:** Events/second

### Measurement Tools

1. **Chrome DevTools Performance**
   - Record runtime profiles
   - Analyze flame graphs
   - Identify bottlenecks

2. **Vitest Benchmarks**
   - Automated performance tests
   - Regression detection
   - CI integration

3. **Bundle Analyzer**
   - rollup-plugin-visualizer
   - Dependency tree analysis
   - Size tracking

4. **Memory Profiler**
   - Chrome Heap Snapshots
   - Memory leak detection
   - GC analysis

## Implementation Checklist

### Pre-Implementation
- [ ] Set up benchmark infrastructure
- [ ] Baseline performance measurements
- [ ] Bundle analysis complete
- [ ] Hot paths identified

### Phase 1: Quick Wins
- [ ] Advanced Terser configuration
- [ ] Dead code removal
- [ ] Dependency cleanup
- [ ] Verify 30-50 KB reduction

### Phase 2: Profiling
- [ ] Performance benchmarks created
- [ ] Chrome DevTools profiling
- [ ] Hot paths documented
- [ ] Optimization priorities set

### Phase 3: Optimizations
- [ ] Expression caching implemented
- [ ] Selector caching implemented
- [ ] Context pooling implemented
- [ ] 30-60% performance improvement verified

### Phase 4: Advanced (Optional)
- [ ] Tree-shaking enhancements
- [ ] Memory leak prevention
- [ ] Additional 50-80 KB reduction

### Post-Implementation
- [ ] Documentation updated
- [ ] Benchmarks in CI
- [ ] Performance guide created
- [ ] Roadmap updated

## Dependencies

**Required Tools:**
- rollup-plugin-visualizer (bundle analysis)
- Vitest (benchmarking)
- Chrome DevTools (profiling)

**No Breaking Changes:** All optimizations must maintain 100% API compatibility

## Timeline Estimate

- **Phase 1:** 1-2 days (Quick wins)
- **Phase 2:** 2-3 days (Profiling)
- **Phase 3:** 3-5 days (Targeted optimizations)
- **Phase 4:** 1-2 weeks (Advanced optimizations)

**Total:** 1.5-3.5 weeks depending on depth

## Next Steps

After creating this plan:
1. **Parser tests first** - Fix 10 failing tests (2-3 hours)
2. **Bundle analysis** - Start Phase 1 (1 day)
3. **Performance profiling** - Start Phase 2 (2-3 days)
4. **Optimization implementation** - Start Phase 3 (3-5 days)

## Documentation

**Related Documents:**
- [TREE_SHAKING_COMPLETE.md](../roadmap/tree-shaking/TREE_SHAKING_COMPLETE.md) - Current tree-shaking status
- [PHASE_7_COMPLETE.md](PHASE_7_COMPLETE.md) - Runtime consolidation history
- [RUNTIME_OPTIMIZATION_RESULTS.md](RUNTIME_OPTIMIZATION_RESULTS.md) - Results after implementation (TBD)

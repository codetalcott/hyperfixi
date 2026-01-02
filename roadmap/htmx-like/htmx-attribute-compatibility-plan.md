# htmx Attribute Compatibility Plan

## Executive Summary

This document assesses the feasibility and provides an implementation plan for supporting htmx-style attributes (`hx-*`) in HyperFixi. The goal is to allow htmx users to try HyperFixi as a drop-in replacement for simple htmx projects.

**Verdict: Highly feasible** — HyperFixi already has most infrastructure in place.

---

## 1. Current State Analysis

### 1.1 Existing htmx-Compatible Infrastructure

HyperFixi already implements core htmx-equivalent functionality:

| htmx Feature | HyperFixi Equivalent | Status | Location |
|--------------|---------------------|--------|----------|
| `hx-get`/`hx-post` | `fetch '/url' as html` | ✅ Implemented | `commands/async/fetch.ts` |
| `hx-target` | `swap #target with ...` | ✅ Implemented | `commands/dom/swap.ts` |
| `hx-swap` | `morph`, `innerHTML`, `beforeEnd` | ✅ Implemented | `commands/dom/swap.ts` |
| `hx-boost` | Boosted behavior | ✅ Implemented | `behaviors/boosted.ts` |
| `hx-swap-oob` | `process partials in` + `<hx-partial>` | ✅ Implemented | `commands/dom/process-partials.ts` |
| URL management | `push url`, `replace url` | ✅ Implemented | `commands/navigation/` |
| Event handling | `on click`, `on submit` | ✅ Implemented | Core parser |
| Conditional | `if ... then ... else` | ✅ Implemented | Core parser |
| Confirmation | `js window.confirm()` | ✅ Implemented | `commands/scripting/js.ts` |
| Loading states | CSS class manipulation | ✅ Implemented | `commands/dom/` |

### 1.2 Attribute Processing Architecture

**Key file:** `packages/core/src/dom/attribute-processor.ts`

The attribute processor already supports configurable attribute names:

```typescript
export interface AttributeProcessorOptions {
  attributeName?: string;  // Defaults to '_', can be customized
  autoScan?: boolean;
  processOnlyNewElements?: boolean;
}
```

**Current limitations:**
- Single attribute per element design
- No pattern-based attribute matching (`hx-*`)
- No multi-attribute aggregation

### 1.3 Existing htmx-Like Examples

Six working examples in `examples/htmx-like/`:
1. `01-swap-morph.html` — State-preserving DOM updates
2. `02-morph-comparison.html` — Morphing strategy comparison
3. `03-history-navigation.html` — URL management without reload
4. `04-multi-target-swaps.html` — Multi-target via `<hx-partial>`
5. `05-boosted-links.html` — AJAX link interception
6. `06-partial-validation.html` — Validation patterns

---

## 2. htmx Attribute Reference

### 2.1 Core Request Attributes (Priority 1)

| Attribute | Description | Translation Complexity |
|-----------|-------------|----------------------|
| `hx-get` | Issue GET request | Low |
| `hx-post` | Issue POST request | Low |
| `hx-put` | Issue PUT request | Low |
| `hx-patch` | Issue PATCH request | Low |
| `hx-delete` | Issue DELETE request | Low |

### 2.2 Response Handling (Priority 1)

| Attribute | Description | Translation Complexity |
|-----------|-------------|----------------------|
| `hx-target` | CSS selector for swap target | Low |
| `hx-swap` | Swap strategy (innerHTML, outerHTML, beforeend, etc.) | Medium |
| `hx-select` | Select content from response | Medium |
| `hx-select-oob` | Out-of-band selection | High |

### 2.3 Event Handling (Priority 1)

| Attribute | Description | Translation Complexity |
|-----------|-------------|----------------------|
| `hx-trigger` | Event that triggers request | Medium |
| `hx-on:*` | Inline event handlers | Low |

### 2.4 Request Modifiers (Priority 2)

| Attribute | Description | Translation Complexity |
|-----------|-------------|----------------------|
| `hx-params` | Parameters to include | Medium |
| `hx-vals` | Additional values to submit | Medium |
| `hx-headers` | Additional headers | Low |
| `hx-include` | Additional elements for params | Medium |

### 2.5 Behavior Modifiers (Priority 2)

| Attribute | Description | Translation Complexity |
|-----------|-------------|----------------------|
| `hx-boost` | Convert links/forms to AJAX | Low (exists) |
| `hx-confirm` | Confirmation dialog | Low |
| `hx-disable` | Disable htmx processing | Low |
| `hx-disabled-elt` | Element to disable during request | Medium |
| `hx-indicator` | Loading indicator element | Medium |

### 2.6 Advanced Features (Priority 3)

| Attribute | Description | Translation Complexity |
|-----------|-------------|----------------------|
| `hx-push-url` | Push URL to history | Low (exists) |
| `hx-replace-url` | Replace URL in history | Low (exists) |
| `hx-history` | History cache behavior | High |
| `hx-history-elt` | Element to snapshot | High |
| `hx-ext` | Extensions to use | High |
| `hx-ws` | WebSocket connection | High |
| `hx-sse` | Server-sent events | High |

---

## 3. Implementation Options

### Option A: `hx-on:*` Only (Minimal)

**Scope:** Support only `hx-on:event` attributes for event handling.

**Rationale:** This maps directly to hyperscript's event syntax and provides immediate value for htmx users who want to explore hyperscript's programming model.

**Example:**
```html
<!-- htmx style -->
<button hx-on:click="toggle .active on #menu">Menu</button>

<!-- Translates to hyperscript -->
<button _="on click toggle .active on #menu">Menu</button>
```

**Implementation:**
1. Add attribute processor for `hx-on:*` pattern
2. Strip `hx-on:` prefix, convert to `on {event}`
3. Execute via existing hyperscript parser

**Effort:** 1-2 days
**Risk:** Low
**Value:** Immediate hyperscript exploration for htmx users

---

### Option B: Core htmx Subset (Recommended)

**Scope:** Support 6-8 core attributes that cover 80% of simple htmx usage.

**Target Attributes:**
- `hx-get`, `hx-post`
- `hx-target`
- `hx-swap`
- `hx-trigger`
- `hx-on:*`
- `hx-confirm`

**Example:**
```html
<!-- htmx -->
<button hx-get="/api/data" hx-target="#result" hx-swap="innerHTML">
  Load Data
</button>

<!-- Translates to hyperscript -->
<button _="on click
  fetch '/api/data' as html
  then swap innerHTML of #result with it">
  Load Data
</button>
```

**Implementation:**
1. Create `HtmxAttributeProcessor` class
2. Scan for elements with any `hx-*` attribute
3. Collect all `hx-*` attributes per element
4. Translate to hyperscript syntax
5. Execute via existing runtime

**Effort:** 3-5 days
**Risk:** Medium
**Value:** True drop-in replacement for simple projects

---

### Option C: Full Compatibility Layer

**Scope:** Support all htmx attributes with modifiers and extensions.

**Implementation:**
- All attributes from Section 2
- Modifier support (`hx-trigger="click, load delay:1s"`)
- Extension integration points
- Response header processing
- WebSocket/SSE support

**Effort:** 2-3 weeks
**Risk:** High (semantic mismatches, maintenance burden)
**Value:** Complete htmx replacement

---

### Option D: Semantic Pathway (Recommended Long-Term)

**Scope:** Treat htmx attributes as another "input language" that maps through HyperFixi's existing semantic parsing system.

**Rationale:** HyperFixi's semantic parser already handles 13 natural languages (English, Japanese, Arabic, Korean, etc.) by mapping them to universal semantic roles. htmx attributes are semantically similar and can integrate as another input format.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Input Languages                               │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────┤
│   English   │  Japanese   │   Arabic    │   Korean    │  HTMX      │
│  "toggle"   │ "切り替え"   │   "بدّل"    │  "토글"     │ hx-swap=   │
└─────────────┴─────────────┴─────────────┴─────────────┴────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Universal Semantic Roles                         │
│  action: 'toggle' | 'fetch' | 'swap' | 'put' | ...                 │
│  patient: SelectorValue | LiteralValue                              │
│  destination: SelectorValue                                         │
│  source: LiteralValue (URL)                                        │
│  event: LiteralValue                                               │
│  method: 'GET' | 'POST' | 'PUT' | 'DELETE'                         │
│  manner: 'innerHTML' | 'outerHTML' | 'morph' | ...                 │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       Executable AST                                │
└─────────────────────────────────────────────────────────────────────┘
```

**HTMX → Semantic Role Mapping:**

| HTMX Attribute | Semantic Role | Value Type |
|----------------|---------------|------------|
| `hx-get="/api"` | `action: 'fetch'`, `source: '/api'`, `method: 'GET'` | LiteralValue |
| `hx-post="/api"` | `action: 'fetch'`, `source: '/api'`, `method: 'POST'` | LiteralValue |
| `hx-target="#out"` | `destination: '#out'` | SelectorValue |
| `hx-swap="innerHTML"` | `manner: 'innerHTML'` | LiteralValue |
| `hx-trigger="click"` | `event: 'click'` | LiteralValue |
| `hx-confirm="Sure?"` | `condition` (wrapped confirmation) | LiteralValue |
| `hx-vals='{"x":1}'` | `patient` (data payload) | ExpressionValue |

**Implementation:**

```typescript
// packages/semantic/src/tokenizers/htmx.ts
export class HtmxTokenizer implements Tokenizer {
  tokenize(element: Element): TokenStream {
    const tokens: Token[] = [];

    // Extract action from hx-get/post/put/delete
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const url = element.getAttribute(`hx-${method}`);
      if (url) {
        tokens.push({ type: 'action', value: 'fetch' });
        tokens.push({ type: 'source', value: url });
        tokens.push({ type: 'method', value: method.toUpperCase() });
        break;
      }
    }

    // Extract destination from hx-target
    const target = element.getAttribute('hx-target');
    if (target) {
      tokens.push({ type: 'destination', value: resolveTarget(target) });
    }

    // Extract swap strategy
    const swap = element.getAttribute('hx-swap');
    if (swap) {
      tokens.push({ type: 'manner', value: swap });
    }

    // Extract trigger event
    const trigger = element.getAttribute('hx-trigger') || 'click';
    tokens.push({ type: 'event', value: trigger });

    return new TokenStream(tokens);
  }
}

// Register as another "language"
registerLanguage('htmx', new HtmxTokenizer(), htmxPatterns);
```

**Key Benefits Over String Translation:**

| Aspect | String Translation (Option B) | Semantic Pathway (Option D) |
|--------|------------------------------|----------------------------|
| Intermediate step | Generate hyperscript text, re-parse | Direct to AST |
| Type safety | Strings only | Typed SemanticValue |
| Bidirectional | One-way (htmx → hyperscript) | htmx ↔ hyperscript ↔ all 13 languages |
| Debugging | String inspection | Structured SemanticNode inspection |
| Extensibility | Manual translation rules | Pattern registration |
| Validation | Runtime errors | Semantic-level validation |
| Cross-language | Not supported | Free translation to any language |

**Bidirectional Translation Bonus:**

```typescript
// htmx → semantic → any language
const node = parseHtmx(element);  // SemanticNode

// Render to Japanese
const japanese = renderToLanguage(node, 'ja');
// → "#output に '/api' を フェッチ"

// Render to English hyperscript
const english = renderToLanguage(node, 'en');
// → "fetch '/api' as html then swap innerHTML of #output with it"

// Render to Arabic
const arabic = renderToLanguage(node, 'ar');
// → "اجلب '/api' ثم بدّل #output"
```

**File Structure:**

```
packages/semantic/src/
├── tokenizers/
│   ├── en.ts           # English tokenizer (existing)
│   ├── ja.ts           # Japanese tokenizer (existing)
│   ├── ar.ts           # Arabic tokenizer (existing)
│   └── htmx.ts         # NEW: HTMX attribute tokenizer
├── patterns/
│   ├── en/             # English patterns (existing)
│   ├── ja/             # Japanese patterns (existing)
│   └── htmx/           # NEW: HTMX attribute patterns
│       ├── fetch.ts    # hx-get/post/put/delete patterns
│       ├── swap.ts     # hx-swap patterns
│       └── trigger.ts  # hx-trigger patterns
└── registry.ts         # Register 'htmx' as language
```

**Effort:** 5-7 days (slightly more than Option B, but better architecture)
**Risk:** Low (leverages proven semantic infrastructure)
**Value:** Full ecosystem integration, bidirectional translation, type safety

---

## 4. Recommended Approach

### Short-Term: Option B (String Translation)

For immediate value and quick wins, implement Option B:
- 3-5 days of effort
- Covers 80% of simple htmx use cases
- Can be shipped quickly for user feedback

### Long-Term: Option D (Semantic Pathway)

For full ecosystem integration, migrate to Option D:
- Treats htmx as a first-class "language" in the semantic system
- Enables bidirectional translation (htmx ↔ hyperscript ↔ 13 languages)
- Type-safe semantic validation
- Better debugging and tooling support
- Natural integration with existing multilingual infrastructure

### Migration Path

1. **Phase 1:** Ship Option B for quick wins
2. **Phase 2:** Implement Option D alongside Option B
3. **Phase 3:** Deprecate Option B, use semantic pathway exclusively

### 4.1 Architecture (Option B for Short-Term)

```
┌─────────────────────────────────────────────────────────┐
│                    HtmxAttributeProcessor               │
├─────────────────────────────────────────────────────────┤
│  scanForHtmxElements()                                  │
│    └─ querySelectorAll('[hx-get], [hx-post], ...')     │
├─────────────────────────────────────────────────────────┤
│  collectAttributes(element) → HtmxConfig                │
│    └─ { method, url, target, swap, trigger, ... }      │
├─────────────────────────────────────────────────────────┤
│  translateToHyperscript(config) → string                │
│    └─ "on click fetch '/api' as html then swap..."     │
├─────────────────────────────────────────────────────────┤
│  processElement(element, hyperscript)                   │
│    └─ hyperfixi.execute(hyperscript, element)          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Translation Matrix

| htmx | hyperscript Translation |
|------|------------------------|
| `hx-get="/api"` | `fetch '/api' as html` |
| `hx-post="/api"` | `fetch '/api' via POST as html` |
| `hx-target="#id"` | `swap #id with it` |
| `hx-target="this"` | `swap me with it` |
| `hx-target="closest div"` | `swap closest <div/> with it` |
| `hx-swap="innerHTML"` | `swap innerHTML of ... with it` |
| `hx-swap="outerHTML"` | `swap ... with it` |
| `hx-swap="beforeend"` | `put it at end of ...` |
| `hx-swap="afterbegin"` | `put it at start of ...` |
| `hx-swap="morph"` | `morph ... with it` |
| `hx-trigger="click"` | `on click` |
| `hx-trigger="load"` | `on load` |
| `hx-trigger="revealed"` | `on intersection` |
| `hx-confirm="Sure?"` | `if confirm('Sure?') then ...` |

### 4.3 File Structure

```
packages/core/src/
├── dom/
│   ├── attribute-processor.ts        # Existing _ processor
│   ├── htmx-attribute-processor.ts   # NEW: hx-* processor
│   └── htmx-translator.ts            # NEW: hx-* → hyperscript
├── compatibility/
│   └── htmx/
│       ├── index.ts                  # Public API
│       ├── config.ts                 # Supported attributes
│       └── __tests__/
│           └── htmx-compat.test.ts
```

### 4.4 Public API

```typescript
// Enable htmx compatibility mode
import { enableHtmxCompatibility } from '@hyperfixi/core/htmx';

// Activate processor
enableHtmxCompatibility({
  // Optional: customize behavior
  processExisting: true,      // Process elements on init
  watchMutations: true,       // Watch for new elements
  fallbackToNative: false,    // If false, warn on unsupported attrs
  debug: false,               // Log translations
});

// Or use browser bundle
<script src="hyperfixi-browser.js"></script>
<script src="hyperfixi-htmx-compat.js"></script>
<script>
  hyperfixi.enableHtmxCompatibility();
</script>
```

---

## 5. Implementation Plan

### Phase 1: Foundation (Day 1-2)

**Tasks:**
1. Create `HtmxAttributeProcessor` class
2. Implement element scanning for `hx-*` attributes
3. Implement attribute collection per element
4. Add MutationObserver for dynamic elements
5. Write unit tests for scanning/collection

**Deliverables:**
- `htmx-attribute-processor.ts`
- Test coverage for element detection

### Phase 2: Core Translation (Day 2-3)

**Tasks:**
1. Implement `translateToHyperscript()` for:
   - `hx-get`, `hx-post` → fetch commands
   - `hx-target` → element resolution
   - `hx-swap` → swap strategies
   - `hx-trigger` → event binding
2. Handle `hx-on:*` inline handlers
3. Write unit tests for translations

**Deliverables:**
- `htmx-translator.ts`
- Translation test suite

### Phase 3: Integration (Day 3-4)

**Tasks:**
1. Integrate with existing runtime
2. Add `enableHtmxCompatibility()` API
3. Create separate browser bundle entry
4. Handle edge cases (multiple triggers, modifiers)
5. Integration tests with real htmx examples

**Deliverables:**
- Public API
- Browser bundle
- Integration test suite

### Phase 4: Documentation & Polish (Day 4-5)

**Tasks:**
1. Document supported attributes
2. Document limitations/differences from htmx
3. Create migration guide
4. Add examples comparing htmx vs HyperFixi
5. Performance testing

**Deliverables:**
- `docs/htmx-compatibility.md`
- Migration examples
- Performance benchmarks

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Semantic mismatch in translation | Medium | Medium | Comprehensive test suite against real htmx examples |
| Performance overhead from translation | Low | Low | Cache translations, use event delegation |
| Bundle size increase | Low | Low | Separate bundle, tree-shakeable |
| Maintenance burden | Medium | Medium | Clear architecture, automated tests |
| User confusion (htmx vs hyperscript) | Medium | Low | Clear documentation on differences |
| Breaking existing hyperscript code | None | None | Separate processor, no changes to `_` attribute |

---

## 7. Success Criteria

### Minimum Viable Product
- [ ] `hx-get`, `hx-post` work for simple AJAX requests
- [ ] `hx-target` correctly resolves elements
- [ ] `hx-swap` supports innerHTML, outerHTML, morph
- [ ] `hx-on:*` inline handlers work
- [ ] MutationObserver processes dynamic elements

### Extended Goals
- [ ] `hx-trigger` with common events (click, load, submit)
- [ ] `hx-confirm` shows browser dialog
- [ ] `hx-boost` activates Boosted behavior
- [ ] Works with existing htmx examples (basic ones)

### Documentation
- [ ] Supported attributes documented
- [ ] Limitations clearly stated
- [ ] Migration guide available
- [ ] Examples provided

---

## 8. Limitations & Non-Goals

### Known Limitations

1. **No extension support** — htmx extensions (`hx-ext`) won't work
2. **No response headers** — `HX-Trigger`, `HX-Retarget` not processed
3. **No WebSocket/SSE** — `hx-ws`, `hx-sse` not supported initially
4. **Trigger modifiers** — Complex modifiers (`delay:1s`, `throttle:500ms`) limited
5. **History caching** — `hx-history`, `hx-history-elt` not supported

### Explicit Non-Goals

1. **100% htmx compatibility** — Focus on 80% use cases
2. **htmx extension ecosystem** — Not reproducing extension architecture
3. **Server-side header processing** — HyperFixi is client-side focused
4. **Backwards compatibility with htmx bugs** — Use correct behavior

---

## 9. Future Considerations

### Potential Enhancements

1. **Server-side rendering integration** — Pre-translate `hx-*` to `_` at build time
2. **TypeScript types** — Provide types for htmx-style attributes
3. **DevTools integration** — Show translations in developer tools
4. **Progressive enhancement** — Fall back to native htmx if available

### Alternative Approaches

1. **htmx polyfill** — Ship minimal htmx implementation using HyperFixi runtime
2. **Codemod tool** — Automated migration from htmx to hyperscript
3. **Dual syntax** — Support both `hx-*` and `_` indefinitely

---

## 10. References

- [htmx Reference](https://htmx.org/reference/)
- [htmx Attributes](https://htmx.org/docs/#attributes)
- [_hyperscript Syntax](https://hyperscript.org/docs/)
- HyperFixi attribute processor: `packages/core/src/dom/attribute-processor.ts`
- HyperFixi htmx-like examples: `examples/htmx-like/`
- HyperFixi audit plan: `roadmap/htmx-like/AUDIT_PLAN.md`

---

## Appendix A: Full Attribute Translation Reference

```typescript
// Complete translation map for Option B implementation

const TRANSLATION_MAP = {
  // Request methods
  'hx-get': (url) => `fetch '${url}' as html`,
  'hx-post': (url) => `fetch '${url}' via POST as html`,
  'hx-put': (url) => `fetch '${url}' via PUT as html`,
  'hx-patch': (url) => `fetch '${url}' via PATCH as html`,
  'hx-delete': (url) => `fetch '${url}' via DELETE as html`,

  // Target resolution
  'hx-target': {
    'this': 'me',
    'closest *': (sel) => `closest <${sel}/>`,
    'find *': (sel) => `first <${sel}/> in me`,
    'next *': (sel) => `next <${sel}/>`,
    'previous *': (sel) => `previous <${sel}/>`,
    default: (sel) => sel,  // CSS selector as-is
  },

  // Swap strategies
  'hx-swap': {
    'innerHTML': 'innerHTML',
    'outerHTML': 'outerHTML',
    'beforebegin': 'before',
    'afterbegin': 'start',
    'beforeend': 'end',
    'afterend': 'after',
    'delete': 'delete',
    'none': null,
    'morph': 'morph',
    'morph:innerHTML': 'innerHTML morph',
    'morph:outerHTML': 'morph',
  },

  // Triggers
  'hx-trigger': {
    'click': 'click',
    'load': 'load',
    'revealed': 'intersection',
    'intersect': 'intersection',
    'submit': 'submit',
    'change': 'change',
    'input': 'input',
    'keyup': 'keyup',
    'keydown': 'keydown',
    'focus': 'focus',
    'blur': 'blur',
    'mouseenter': 'mouseenter',
    'mouseleave': 'mouseleave',
  },
};
```

---

## Appendix B: Example Translations

### Simple GET Request

**htmx:**
```html
<button hx-get="/api/users" hx-target="#users-list">
  Load Users
</button>
```

**Generated hyperscript:**
```hyperscript
on click
  fetch '/api/users' as html
  then swap innerHTML of #users-list with it
```

### Form POST with Confirmation

**htmx:**
```html
<form hx-post="/api/users" hx-target="#result" hx-confirm="Create user?">
  <input name="name">
  <button type="submit">Create</button>
</form>
```

**Generated hyperscript:**
```hyperscript
on submit
  if confirm('Create user?')
    halt the event
    fetch '/api/users' via POST with values of me as html
    then swap innerHTML of #result with it
  end
```

### Boosted Link

**htmx:**
```html
<a href="/about" hx-boost="true" hx-target="#content">About</a>
```

**Generated hyperscript:**
```hyperscript
on click
  halt the event
  fetch '/about' as html
  then swap innerHTML of #content with it
  then push url '/about'
```

---

*Document created: December 2024*
*Last updated: December 2024 (added Option D: Semantic Pathway)*

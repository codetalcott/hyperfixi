# Language-Prefixed Handler IDs

**Status:** Deferred
**Priority:** Low
**Package:** `@hyperfixi/vite-plugin`
**Related:** Compile mode, multilingual support

## Overview

When using compile mode with non-English languages, the generated handler IDs normalize command names to English:

```html
<!-- Japanese source -->
<button _="クリック で .active を トグル">Toggle</button>

<!-- Current compiled output -->
<button data-h="click_toggle_3a2b">Toggle</button>
```

This loses the language context from the original source code.

## Proposed Feature

Add a `handlerIdFormat` option to preserve language information in compiled handler IDs:

```typescript
hyperfixi({
  mode: 'compile',
  handlerIdFormat: 'ascii' | 'prefixed'  // default: 'ascii'
})
```

### Format Options

| Format | Example | Description |
|--------|---------|-------------|
| `ascii` (default) | `click_toggle_3a2b` | Current behavior, English normalized |
| `prefixed` | `ja_click_toggle_3a2b` | Language code prefix for non-English |

### Output Examples

```html
<!-- With handlerIdFormat: 'prefixed' -->

<!-- Japanese -->
<button data-h="ja_click_toggle_3a2b">Toggle</button>

<!-- Spanish -->
<button data-h="es_click_toggle_5f2e">Toggle</button>

<!-- English (no prefix needed) -->
<button data-h="click_toggle_9c1d">Toggle</button>
```

## Implementation Notes

### Files to Modify

1. **`types.ts`** - Add `handlerIdFormat` option
2. **`compiler.ts`** - Update data flow:
   - `compile()` - pass language and format to `compileAST`
   - `compileAST()` - accept and pass to `generateHandlerId`
   - `generateHandlerId()` - generate prefixed ID when format='prefixed'

### Code Changes

```typescript
// compiler.ts
function generateHandlerId(
  event: string,
  command: string,
  script: string,
  language: string = 'en',
  format: 'ascii' | 'prefixed' = 'ascii'
): string {
  const hash = hashScript(script);
  const prefix = format === 'prefixed' && language !== 'en'
    ? `${language}_`
    : '';

  let id = `${prefix}${event}_${command}_${hash}`;
  // ... collision handling
}
```

## Trade-offs

### Pros

- Source tracing: Immediately identifies which language the original code was written in
- Debugging: Easier to trace compiled output back to source files
- Cultural respect: Acknowledges the developer's choice to write in their language

### Cons

- Size: ~3 extra bytes per non-English handler (negligible)
- Complexity: More parameters flowing through compilation pipeline
- Mixed codebases: Projects with multiple languages get inconsistent ID formats

## Size Impact

| Handlers | ASCII | Prefixed | Delta |
|----------|-------|----------|-------|
| 10 | ~170 bytes | ~200 bytes | +30 bytes |
| 50 | ~850 bytes | ~1000 bytes | +150 bytes |
| 100 | ~1.7 KB | ~2 KB | +300 bytes |

Negligible in context of overall bundle size.

## Why Deferred

1. **Low demand** - No user requests for this feature yet
2. **ASCII works universally** - Current format has no compatibility issues
3. **Debugging alternatives** - Source maps and comments can provide language context
4. **Complexity vs benefit** - Implementation touches multiple layers for modest benefit

## Alternatives Considered

### Native Unicode IDs (`click_トグル_3a2b`)

Rejected due to:
- Potential DevTools compatibility issues
- CSS attribute selector escaping requirements
- URL encoding complexity
- Log aggregation encoding issues

### Transliteration (`click_toguru_3a2b`)

Rejected due to:
- Inconsistent transliteration rules across languages
- Potential collisions between similar-sounding words
- Added dependency on transliteration library

## When to Revisit

Consider implementing if:
- Users explicitly request language-aware debugging
- Build tooling improves non-ASCII attribute support
- Multilingual projects become a primary use case

## References

- [compiler.ts](../packages/vite-plugin/src/compiler.ts) - Handler ID generation
- [types.ts](../packages/vite-plugin/src/types.ts) - Plugin options
- [BUNDLE-STRATEGY.md](../packages/semantic/BUNDLE-STRATEGY.md) - Semantic bundle documentation

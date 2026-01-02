# Hybrid Bundle Architecture

**Status:** ✅ Consolidated to Hybrid Complete

## Current Bundle

| Bundle | Size (gzip) | Features |
|--------|-------------|----------|
| **Hybrid Complete** | 6.7 KB | Full recursive descent parser, AST, blocks, expressions, event modifiers, i18n |

### File

- `packages/core/src/compatibility/browser-bundle-hybrid-complete.ts`

### Test Coverage

- 31/31 Playwright tests passing
- `packages/core/src/compatibility/browser-tests/hybrid-complete.spec.ts`

---

## Architecture Decision

Originally three hybrid variants were planned:

1. **Hybrid Lite** (4.6 KB) - Tiered regex/mini-parser
2. **Hybrid** (5.5 KB) - Full recursive descent parser
3. **Hybrid Complete** (6.7 KB) - Combined best features

After evaluation, **Hybrid Complete was chosen** as the single hybrid bundle because:

1. **Single parser architecture** - One tokenizer → parser → AST path is easier to maintain than the dual regex/tokenizer approach in Hybrid Lite

2. **Full expression AST** - Storing conditions as AST nodes (not strings) enables proper evaluation with operator precedence

3. **Comprehensive bug fixes** - Multiple tokenizer improvements that would need duplication in other architectures:
   - Array literals vs attribute selectors
   - HTML selectors vs comparison operators
   - Possessive `'s` vs string literals
   - Window globals lookup
   - Return propagation through blocks

4. **100% test coverage** - 31/31 tests prove reliability

5. **Minimal size trade-off** - Only ~2 KB larger than Hybrid Lite but significantly more reliable

## Features

### Commands (21)
toggle, add, remove, put, append, set, get, call, log, send, trigger, wait, show, hide, take, increment, decrement, focus, blur, go, return

### Blocks (5)
if/else/else-if, unless, repeat N times, for each, while, fetch

### Expressions
- Arithmetic with precedence: `+`, `-`, `*`, `/`, `%`
- Comparisons: `<`, `>`, `<=`, `>=`, `==`, `!=`, `is`, `is not`
- Boolean logic: `and`, `or`, `not`
- Possessive: `element's property`
- Member access: `obj.prop`, `obj[key]`
- Function calls: `str.toUpperCase()`, `arr.join('-')`
- Positional: `first`, `last`, `next`, `previous`, `closest`, `parent`
- Array/object literals

### Events
- Standard DOM events with modifiers: `.once`, `.prevent`, `.stop`, `.debounce(N)`, `.throttle(N)`
- Special events: `init`, `every Nms`

### i18n
- Built-in command aliases: flip → toggle, reveal → show, conceal → hide
- Custom aliases via `addAliases()` and `addEventAliases()`

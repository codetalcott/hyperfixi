# Binary Tree Serialization - Benchmark Results & Recommendations

## Experiment Summary

This module implements a **Lite³-inspired binary tree serialization format** that stores JavaScript objects as a B-tree inside an ArrayBuffer, enabling O(log n) field access without full deserialization.

## Benchmark Results (2000 iterations)

| Test Case | JSON | Binary | Speedup | Size Ratio |
|-----------|------|--------|---------|------------|
| Serialization | 1.07ms | 11.31ms | **10x slower** | 2.00x |
| Full Deserialization | 0.90ms | 8.75ms | **10x slower** | 2.00x |
| Single Field (Simple) | 0.91ms | 2.25ms | **2.5x slower** | 2.00x |
| Single Field (Complex) | 3.74ms | 1.48ms | **2.5x faster** | 1.88x |
| Nested Field Access | 3.89ms | 3.42ms | **1.1x faster** | 1.88x |
| Single Field (Large AST) | 76.47ms | 1.39ms | **55x faster** | 1.87x |
| Nested Field (Large AST) | 75.75ms | 2.07ms | **37x faster** | 1.87x |
| Single Field (Deep AST) | 3.12ms | 1.20ms | **2.6x faster** | 2.16x |

## Key Findings

### Where Binary Wins (Use It)

1. **Large ASTs (55x faster)** - Complex behaviors with many commands
   - JSON must parse entire structure even for one field
   - Binary navigates directly via offset table

2. **Nested Access in Large Structures (37x faster)**
   - Binary search through sorted keys at each level
   - No intermediate object allocation

3. **Deep Nesting (2.6x faster)**
   - Each level is O(log n) lookup, not O(n) scan

### Where JSON Wins (Don't Use It)

1. **Small Objects** - JSON is 2.5x faster for simple commands
   - Binary overhead (headers, offset tables) not amortized
   - V8's JSON.parse is highly optimized

2. **Serialization** - Binary is 10x slower
   - TypeScript can't match native JSON.stringify
   - Must sort keys, build offset tables

3. **Full Deserialization** - Binary is 10x slower
   - When you need the whole object anyway

### Size Comparison

Binary format is **~2x larger** than JSON (not smaller as originally hypothesized):
- B-tree overhead: headers, offset tables, type tags
- Each object entry: 12 bytes (keyOffset + keyLen + valueOffset)
- JSON benefits from string compression in V8

## Recommendations

### Use Binary Format When:

```typescript
// ✅ Large AST with selective access
const largeAST = compile(complexBehavior);
const binary = new BinaryAST(largeAST);

// Only need type and name - 55x faster than JSON.parse()
const type = binary.getNodeType();
const name = binary.getName();
```

```typescript
// ✅ Worker transfer with repeated access
const buffer = binary.getBuffer();
worker.postMessage(buffer, [buffer]); // Zero-copy transfer

// In worker - access fields without parsing
const received = BinaryAST.fromBuffer(buffer);
if (received.isBlocking()) { /* ... */ }
```

```typescript
// ✅ Compilation cache for complex behaviors
cache.set(code, {
  buffer: binary.getBuffer(),
  timestamp: Date.now()
});

// Later - quick metadata check without full parse
const cached = cache.get(code);
const meta = BinaryAST.fromBuffer(cached.buffer);
console.log(`Cached: ${meta.getName()}`);
```

### Don't Use Binary Format When:

```typescript
// ❌ Simple commands - JSON is faster
const simple = compile('toggle .active');
// Just use regular AST object

// ❌ When you need the full structure
const ast = binary.toAST(); // 10x slower than JSON.parse

// ❌ Frequent serialization
// Each serialize() is 10x slower than JSON.stringify
```

## Integration Recommendations

### 1. Threshold-Based Usage
Only use binary format for ASTs above a complexity threshold:

```typescript
function shouldUseBinary(ast: ASTNode): boolean {
  const commandCount = countCommands(ast);
  return commandCount > 10; // Threshold where binary wins
}
```

### 2. Worker Communication
Add optional binary format to worker feature:

```typescript
// In webworker.ts
interface WorkerMessage {
  format: 'json' | 'binary';
  data: any | ArrayBuffer;
}
```

### 3. Compilation Cache
Store pre-compiled large behaviors in binary format:

```typescript
// In expression-cache.ts
interface CachedCompilation {
  buffer: ArrayBuffer;  // Binary format
  metadata: { type: string; name: string }; // Pre-extracted
}
```

## Conclusion

The binary tree format shows **strong promise for large AST scenarios** (55x speedup) but should **not be used universally**. The optimal strategy is:

1. **Default to JSON** for simple commands and full deserialization
2. **Use binary** for large behaviors where selective field access is needed
3. **Pre-serialize** complex behaviors at build time when possible

The 55x speedup for large AST field access validates the Lite³ approach - the cost is in serialization, but the benefit compounds with each field access on a pre-serialized buffer.

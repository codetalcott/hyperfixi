# Migration Guide: API v1 → v2

This guide helps you migrate from the legacy LokaScript API (v1) to the new API v2.

## Overview

API v2 provides:

- **Cleaner names**: `eval()` instead of `run()`, `validate()` instead of `isValidHyperscript()`
- **Structured results**: `{ ok, errors, meta }` instead of `{ success, errors, tokens }`
- **Better async/sync separation**: `compileSync()` vs `compileAsync()` (previously just `compile()`)
- **Unified context creation**: `createContext(element, parent)` instead of separate methods

## Quick Reference

| v1 API (Deprecated)              | v2 API (Recommended)        | Notes                            |
| -------------------------------- | --------------------------- | -------------------------------- |
| `compile(code)`                  | `compileSync(code)`         | Same behavior, clearer name      |
| `compileMultilingual(code, opt)` | `compileAsync(code, opt)`   | Renamed for consistency          |
| `run(code, ctx)`                 | `eval(code, ctx)`           | Clearer intent                   |
| `evaluate(code, ctx)`            | `eval(code, ctx)`           | No more aliases                  |
| `isValidHyperscript(code)`       | `validate(code)`            | Returns structured result        |
| `createChildContext(parent, el)` | `createContext(el, parent)` | Unified signature                |
| `result.success`                 | `result.ok`                 | Shorter, matches modern patterns |
| `result.compilationTime`         | `result.meta.timeMs`        | Grouped metadata                 |
| N/A                              | `result.meta.parser`        | Know which parser was used       |
| N/A                              | `result.meta.confidence`    | Semantic parser confidence       |

## Step-by-Step Migration

### 1. Compilation

**Before (v1):**

```typescript
const result = hyperscript.compile('toggle .active');
if (result.success) {
  console.log('Time:', result.compilationTime, 'ms');
  // use result.ast
} else {
  console.error(result.errors);
}
```

**After (v2):**

```typescript
const result = hyperscript.compileSync('toggle .active');
if (result.ok) {
  console.log('Time:', result.meta.timeMs, 'ms');
  console.log('Parser:', result.meta.parser); // New: semantic or traditional
  // use result.ast
} else {
  console.error(result.errors);
}
```

### 2. Compile + Execute

**Before (v1):**

```typescript
// Option 1: run()
await hyperscript.run('toggle .active', context);

// Option 2: evaluate() (alias)
await hyperscript.evaluate('toggle .active', context);

// Option 3: compile + execute
const compiled = hyperscript.compile(code);
if (compiled.success) {
  await hyperscript.execute(compiled.ast, context);
}
```

**After (v2):**

```typescript
// Recommended: eval()
await hyperscript.eval('toggle .active', context);

// Or with element directly
await hyperscript.eval('toggle .active', element);

// Still available: compile + execute (for caching compiled AST)
const compiled = hyperscript.compileSync(code);
if (compiled.ok) {
  await hyperscript.execute(compiled.ast, context);
}
```

### 3. Validation

**Before (v1):**

```typescript
if (hyperscript.isValidHyperscript(code)) {
  // valid
} else {
  // invalid
}
```

**After (v2):**

```typescript
const result = await hyperscript.validate(code);
if (result.valid) {
  // valid
} else {
  // invalid - with detailed errors
  result.errors?.forEach(err => {
    console.error(`Line ${err.line}:${err.column}: ${err.message}`);
    if (err.suggestion) {
      console.log('Suggestion:', err.suggestion);
    }
  });
}
```

### 4. Context Creation

**Before (v1):**

```typescript
// Basic context
const ctx = hyperscript.createContext(element);

// Child context
const child = hyperscript.createChildContext(parent, element);
```

**After (v2):**

```typescript
// Basic context
const ctx = hyperscript.createContext(element);

// Child context (unified signature)
const child = hyperscript.createContext(element, parent);
```

### 5. Multilingual Compilation

**Before (v1):**

```typescript
const result = await hyperscript.compileMultilingual(code, {
  language: 'ja',
  confidenceThreshold: 0.8,
});
```

**After (v2):**

```typescript
const result = await hyperscript.compileAsync(code, {
  language: 'ja',
  confidenceThreshold: 0.8,
});
```

## Result Object Changes

### v1 CompilationResult

```typescript
interface CompilationResult {
  success: boolean;
  ast?: ASTNode;
  errors: ParseError[];
  tokens: Token[];
  compilationTime: number;
}
```

### v2 CompileResult

```typescript
interface CompileResult {
  ok: boolean; // Was: success
  ast?: ASTNode;
  errors?: CompileError[]; // Optional now, only present if !ok
  meta: {
    // New: grouped metadata
    parser: 'semantic' | 'traditional';
    confidence?: number; // Semantic parser confidence
    language: string; // Language used
    timeMs: number; // Was: compilationTime
    directPath?: boolean;
  };
}
```

**Key differences:**

- `success` → `ok` (shorter, matches modern patterns like `fetch().ok`)
- `errors` is optional (only present when `!ok`)
- Metadata grouped under `meta` object
- New `meta.parser` field tells you which parser was used
- New `meta.confidence` for semantic parser results
- `tokens` removed (internal detail)

## Common Patterns

### Pattern 1: Compile Once, Execute Many Times

**v1:**

```typescript
const compiled = hyperscript.compile(code);
if (compiled.success) {
  await hyperscript.execute(compiled.ast, ctx1);
  await hyperscript.execute(compiled.ast, ctx2);
}
```

**v2:**

```typescript
const compiled = hyperscript.compileSync(code);
if (compiled.ok) {
  await hyperscript.execute(compiled.ast, ctx1);
  await hyperscript.execute(compiled.ast, ctx2);
}
```

### Pattern 2: Error Handling

**v1:**

```typescript
try {
  await hyperscript.run(code, context);
} catch (error) {
  console.error('Failed:', error);
}
```

**v2:**

```typescript
try {
  await hyperscript.eval(code, context);
} catch (error) {
  console.error('Failed:', error);
}
```

### Pattern 3: Validation Before Execution

**v1:**

```typescript
if (!hyperscript.isValidHyperscript(code)) {
  throw new Error('Invalid syntax');
}
await hyperscript.run(code, context);
```

**v2:**

```typescript
const validation = await hyperscript.validate(code);
if (!validation.valid) {
  throw new Error(`Invalid syntax: ${validation.errors?.[0]?.message}`);
}
await hyperscript.eval(code, context);
```

## Type Imports

Update your imports to include new v2 types:

**v1:**

```typescript
import { hyperscript, type CompilationResult, type ExecutionContext } from '@hyperfixi/core';
```

**v2:**

```typescript
import {
  hyperscript,
  type CompileResult, // New
  type CompileError, // New
  type NewCompileOptions, // New
  type ValidateResult, // New
  type ExecutionContext,
  // Legacy types still available for gradual migration
  type CompilationResult,
} from '@hyperfixi/core';
```

## Deprecation Timeline

- **Current (v0.x)**: Legacy methods work with deprecation warnings
- **Next minor (v0.x+1)**: Migration guide added, v2 recommended
- **Next major (v1.0)**: Legacy methods removed

## Automated Migration

For large codebases, consider these regex patterns:

```bash
# Replace compile() with compileSync()
find . -name "*.ts" -exec sed -i '' 's/hyperscript\.compile(/hyperscript.compileSync(/g' {} +

# Replace run() with eval()
find . -name "*.ts" -exec sed -i '' 's/hyperscript\.run(/hyperscript.eval(/g' {} +

# Replace .success with .ok
find . -name "*.ts" -exec sed -i '' 's/result\.success/result.ok/g' {} +

# Replace .compilationTime with .meta.timeMs
find . -name "*.ts" -exec sed -i '' 's/result\.compilationTime/result.meta.timeMs/g' {} +
```

**Note:** Test thoroughly after automated migration. Some changes may need manual review.

## Benefits of Migrating

1. **Clearer intent**: Method names better describe what they do
2. **Better debugging**: `meta.parser` and `meta.confidence` help understand behavior
3. **Consistent patterns**: No more aliases (`run` vs `evaluate`)
4. **Future-proof**: v2 API is stable and will be maintained long-term
5. **Better TypeScript**: More precise types, better IDE autocomplete

## Need Help?

- See [API.md](./API.md) for complete v2 API reference
- Check [EXAMPLES.md](./EXAMPLES.md) for usage examples
- Report issues at https://github.com/codetalcott/lokascript/issues

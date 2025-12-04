# NAPI-RS Architecture Patterns: Exploration for HyperFixi

## Executive Summary

This document explores how HyperFixi could adopt architectural patterns from [napi-rs](https://github.com/napi-rs/napi-rs), a framework for building Node.js addons in Rust. While HyperFixi is a pure TypeScript/JavaScript project (no native bindings), napi-rs's design philosophy offers valuable patterns that could enhance HyperFixi's architecture.

**Key Insight**: The patterns that make napi-rs successful—macro-based code generation, systematic type mapping, zero-boilerplate APIs, and TypeScript-first design—are applicable beyond FFI contexts.

---

## 1. NAPI-RS Core Architecture

### 1.1 The `#[napi]` Macro Pattern

napi-rs's defining feature is its procedural macro that eliminates FFI boilerplate:

```rust
// Developer writes this:
#[napi]
pub fn fibonacci(n: u32) -> u32 {
  match n {
    1 | 2 => 1,
    _ => fibonacci(n - 1) + fibonacci(n - 2),
  }
}

// Macro generates: Node-API registration, type conversion, error handling, TypeScript definitions
```

**Design Principles**:
1. **Declaration over implementation** - Describe what, not how
2. **Compile-time code generation** - Zero runtime overhead
3. **Type safety guaranteed** - Mismatches caught at build time
4. **Automatic artifact generation** - .d.ts, bindings, platform builds

### 1.2 Systematic Type Mapping

napi-rs maintains a clear mapping table between Rust and JavaScript types:

| Rust Type | JavaScript Type |
|-----------|-----------------|
| `u32/i32/i64/f64` | `number` |
| `String/&str` | `string` |
| `Vec<T>` | `Array<T>` |
| `HashMap<K,V>` | `Object` |
| `Result<T>` | throws or returns `T` |
| `Option<T>` | `T \| null` |

This systematic approach eliminates ad-hoc conversion code throughout the codebase.

### 1.3 Async-First Architecture

```rust
#[napi]
pub async fn read_file_async(path: String) -> Result<Buffer> {
  Ok(tokio::fs::read(path).await?.into())
}
```

Async functions automatically:
- Return JavaScript Promises
- Integrate with the event loop
- Handle errors via rejection

---

## 2. HyperFixi's Current Architecture

### 2.1 Command Pattern (V2)

HyperFixi commands follow a consistent but verbose pattern:

```typescript
class SetCommandV2 implements CommandImplementation<SetInput, SetOutput> {
  name = 'set';

  metadata = {
    description: 'Set a variable or property',
    category: 'data',
    // ... more metadata
  };

  async parseInput(raw: unknown, evaluator: ExpressionEvaluator, ctx: ExecutionContext): Promise<SetInput> {
    // Manual parsing logic - ~50 lines
  }

  async execute(input: SetInput, context: ExecutionContext): Promise<SetOutput> {
    // Execution logic - ~100 lines
  }

  validate(input: SetInput): boolean {
    // Validation logic - ~20 lines
  }
}

export function createSetCommand(): SetCommandV2 {
  return new SetCommandV2();
}
```

**Current Boilerplate Per Command**:
- Class definition with interface implementation
- Metadata object
- `parseInput()` method (often repetitive patterns)
- `execute()` method
- `validate()` method (optional but common)
- Factory function
- Registration in command registry

### 2.2 Expression Evaluation Pattern

```typescript
// Current: Manual dispatch in evaluator
async evaluate(node: ExpressionNode, context: ExecutionContext): Promise<unknown> {
  switch (node.type) {
    case 'string': return this.evaluateString(node, context);
    case 'number': return this.evaluateNumber(node, context);
    case 'identifier': return this.evaluateIdentifier(node, context);
    // ... 20+ more cases
  }
}
```

---

## 3. Proposed Pattern Adoptions

### 3.1 Decorator-Based Command Definition

**Inspiration**: napi-rs's `#[napi]` macro

**Proposed Pattern**: TypeScript decorators for command definition

```typescript
// PROPOSED: Decorator-based command definition
@command({
  name: 'set',
  category: 'data',
  description: 'Set a variable or property',
  syntax: 'set <target> to <value>',
})
@input({
  target: { type: 'expression', required: true },
  value: { type: 'expression', required: true },
  scope: { type: 'enum', values: ['local', 'global', 'element'], default: 'local' },
})
class SetCommand {
  async execute(input: SetInput, context: ExecutionContext): Promise<SetOutput> {
    const { target, value, scope } = input;
    // Pure execution logic - no parsing boilerplate
    context.setVariable(target, value, scope);
    return { success: true, value };
  }
}
```

**What the Decorator Generates**:
1. `parseInput()` implementation from `@input` schema
2. `validate()` implementation from schema constraints
3. TypeScript interface for `SetInput`
4. Command registration call
5. Documentation/metadata extraction

**Benefits**:
- **~60% code reduction** per command (estimated)
- **Consistent parsing** - All commands parse inputs the same way
- **Self-documenting** - Schema IS the documentation
- **Type inference** - Input types derived from schema
- **Validation included** - Schema constraints become runtime checks

### 3.2 Expression Type Registry

**Inspiration**: napi-rs's systematic type mapping

**Proposed Pattern**: Declarative expression type definitions

```typescript
// PROPOSED: Expression type registry
const expressionTypes = defineExpressionTypes({
  // Primitive types
  string: {
    nodeType: 'string',
    jsType: 'string',
    evaluate: (node) => node.value,
  },

  number: {
    nodeType: 'number',
    jsType: 'number',
    evaluate: (node) => Number(node.value),
  },

  // Complex types with dependencies
  cssSelector: {
    nodeType: 'cssSelector',
    jsType: 'Element | Element[] | null',
    evaluate: async (node, ctx) => {
      const scope = node.scope === 'me' ? ctx.me : document;
      return scope?.querySelectorAll(node.selector);
    },
    coerceTo: {
      'Element': (result) => result?.[0] ?? null,
      'Element[]': (result) => Array.from(result ?? []),
      'boolean': (result) => result?.length > 0,
    },
  },

  // Reference types
  me: {
    nodeType: 'me',
    jsType: 'Element | null',
    evaluate: (_, ctx) => ctx.me,
  },
});

// Auto-generates:
// 1. ExpressionEvaluator dispatch table
// 2. TypeScript types for all expressions
// 3. Coercion functions between types
// 4. Documentation for each expression type
```

**Benefits**:
- **Single source of truth** for expression types
- **Automatic type coercion** between expression results
- **Generated TypeScript types** for all expressions
- **Consistent error messages** across all expression evaluations

### 3.3 Schema-Driven Parser Generation

**Inspiration**: napi-rs's macro-generated bindings

**Proposed Pattern**: Command syntax schemas that generate parsers

```typescript
// PROPOSED: Schema-driven parser generation
@syntax(`
  set {target:expression} to {value:expression}
  set {target:expression} to {value:expression} globally
  set the {property:identifier} of {element:expression} to {value:expression}
`)
class SetCommand {
  // Parser automatically generated from @syntax decorator
}

// The schema generates:
// 1. Tokenizer patterns for command recognition
// 2. Parser rules with proper precedence
// 3. AST node structure
// 4. Error messages with syntax hints
```

**Benefits**:
- **Syntax IS documentation** - No separate docs needed
- **Automatic parser generation** - No manual parsing code
- **Syntax validation** - Schema violations caught at build time
- **IDE support generation** - Completion, hover info from schema

### 3.4 Build-Time Code Generation Pipeline

**Inspiration**: napi-rs's CLI and build pipeline

**Proposed Pattern**: Build-time generation from declarations

```
Source Files (Decorated)
        │
        ▼
┌───────────────────┐
│ Code Generator    │
│  - Parse decorators│
│  - Generate impls │
│  - Generate types │
└───────────────────┘
        │
        ▼
Generated Files
  ├── command-parsers.generated.ts
  ├── expression-evaluators.generated.ts
  ├── command-types.generated.ts
  └── hyperscript.generated.d.ts
        │
        ▼
Final Bundle (Rollup)
```

**Implementation Options**:

1. **TypeScript Transformers** (ts-patch, ttypescript)
   - Runs during TypeScript compilation
   - Full type information available
   - Complex setup but powerful

2. **Babel Plugins**
   - Runs as build step
   - Well-documented plugin API
   - Limited type information

3. **Custom Rollup Plugin**
   - Integrate with existing build
   - Process files before bundling
   - HyperFixi already uses Rollup

4. **Standalone Generator Script**
   - Run before build (`npm run generate`)
   - Simple implementation
   - Easy to debug and iterate

**Recommended**: Start with Option 4 (standalone generator), migrate to Option 3 (Rollup plugin) once patterns stabilize.

---

## 4. Advanced Patterns

### 4.1 WASM Integration (Performance Layer)

**Inspiration**: napi-rs's Rust performance

HyperFixi could adopt a **hybrid architecture** with performance-critical code in Rust/WASM:

```
┌─────────────────────────────────────────────┐
│              HyperFixi API                   │
│         (TypeScript - unchanged)             │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│  JS Runtime   │       │  WASM Runtime │
│  (Default)    │       │  (Optional)   │
└───────────────┘       └───────────────┘
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ JS Tokenizer  │       │ Rust Tokenizer│
│ JS Parser     │       │ Rust Parser   │
│ JS Evaluator  │       │ Rust Evaluator│
└───────────────┘       └───────────────┘
```

**Candidates for WASM**:
1. **Tokenizer** (3,308 lines) - Hot path, simple logic, ideal for WASM
2. **Expression Parser** (2,445 lines) - CPU-intensive, well-defined grammar
3. **AST Analysis** - Visitor patterns, tree traversal

**Implementation Strategy**:
```typescript
// Feature detection with fallback
const tokenizer = await (async () => {
  if (typeof WebAssembly !== 'undefined') {
    try {
      const wasm = await import('@hyperfixi/tokenizer-wasm');
      return wasm.createTokenizer();
    } catch {
      // WASM load failed, use JS fallback
    }
  }
  return createJSTokenizer();
})();
```

**Benefits**:
- **2-10x performance** for parsing-heavy workloads
- **Same API** - WASM is an implementation detail
- **Graceful fallback** - JS version always available
- **Progressive enhancement** - WASM when supported

### 4.2 Multi-Target Generation

**Inspiration**: napi-rs's 18+ platform support

HyperFixi could generate multiple output targets from single source:

```typescript
// Single source definition
@command({ name: 'fetch', ... })
class FetchCommand { ... }

// Generated outputs:
// 1. Browser bundle (current)
// 2. Node.js bundle (with node-fetch)
// 3. Deno bundle (with Deno.fetch)
// 4. Cloudflare Workers bundle
// 5. React Native bundle
// 6. TypeScript definitions for all targets
```

### 4.3 Plugin Contract Generation

**Inspiration**: napi-rs's type-safe FFI contracts

Generate type-safe plugin interfaces from command definitions:

```typescript
// From command definition, generate:
interface SetCommandPlugin {
  // Called before execution
  beforeSet?(input: SetInput, context: ExecutionContext): SetInput | void;

  // Called after execution
  afterSet?(result: SetOutput, context: ExecutionContext): SetOutput | void;

  // Override default behavior entirely
  overrideSet?(input: SetInput, context: ExecutionContext): Promise<SetOutput>;
}

// Plugin authors get full type safety:
const myPlugin: SetCommandPlugin = {
  beforeSet(input) {
    console.log(`Setting ${input.target} to ${input.value}`);
    return input; // TypeScript knows the shape
  }
};
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Low Risk)

1. **Expression Type Registry** (1-2 days)
   - Create `defineExpressionTypes()` utility
   - Migrate 5-10 expression types to new pattern
   - Generate TypeScript types from registry
   - No breaking changes

2. **Command Metadata Schema** (1 day)
   - Standardize metadata format across all 43 commands
   - Extract to JSON schema for tooling
   - Generate documentation from schema

### Phase 2: Code Generation (Medium Risk)

3. **Input Schema Decorators** (2-3 days)
   - Implement `@input` decorator
   - Generate `parseInput()` from schema
   - Migrate 10 simple commands
   - Validate approach before full migration

4. **Build Pipeline Integration** (1-2 days)
   - Create standalone generator script
   - Integrate with npm scripts
   - Generate `.generated.ts` files

### Phase 3: Advanced (Higher Risk, Higher Reward)

5. **Syntax Schema Parser** (3-5 days)
   - Design syntax DSL
   - Implement parser generator
   - Migrate command parsing to generated code

6. **WASM Tokenizer** (5-7 days)
   - Port tokenizer to Rust
   - Compile to WASM with wasm-pack
   - Benchmark against JS implementation
   - Implement feature detection and fallback

---

## 6. Risk Analysis

### Low Risk Patterns
- Expression type registry (additive, no breaking changes)
- Metadata standardization (documentation improvement)
- Generated TypeScript types (tooling enhancement)

### Medium Risk Patterns
- Decorator-based commands (requires decorator support)
- Build-time generation (new build step)
- Schema-driven parsing (significant refactor)

### Higher Risk Patterns
- WASM integration (new language, tooling complexity)
- Multi-target generation (maintenance burden)
- Syntax DSL (domain-specific language design)

---

## 7. Comparison Matrix

| Pattern | napi-rs | HyperFixi Current | HyperFixi Proposed |
|---------|---------|-------------------|-------------------|
| Code Generation | Proc macros | Manual | Decorators + Build step |
| Type Mapping | Systematic table | Ad-hoc | Type registry |
| Async Support | Native Futures | Promise-based | ✓ (already good) |
| TypeScript | Auto-generated | Manual | Auto-generated |
| Multi-platform | 18+ platforms | Browser + Node | Target generation |
| Performance Layer | Native Rust | Pure JS | Optional WASM |

---

## 8. Conclusion

napi-rs's success comes from three core principles that HyperFixi can adopt:

1. **Declaration over implementation** - Express intent, generate details
2. **Systematic type handling** - Consistent patterns eliminate bugs
3. **Zero-boilerplate philosophy** - Developer experience as priority

The recommended starting point is **Expression Type Registry** (Phase 1.1) - it's low risk, immediately valuable, and establishes patterns for future work.

The highest-value long-term investment is **Decorator-based Command Definition** - it could reduce command code by 60% while improving consistency and enabling better tooling.

WASM integration should be considered only after measuring actual performance bottlenecks in production use cases.

---

## References

- [napi-rs GitHub](https://github.com/napi-rs/napi-rs)
- [napi-rs Documentation](https://napi.rs/)
- [TypeScript Decorators Proposal](https://github.com/tc39/proposal-decorators)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [Rollup Plugin Development](https://rollupjs.org/plugin-development/)

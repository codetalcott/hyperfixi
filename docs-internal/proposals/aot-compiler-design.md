# LokaScript AOT Compiler Design

> **Status**: Implemented (with gaps)
> **Author**: Design Session
> **Date**: 2026-02-05
> **Last reviewed**: 2026-02-05

## Executive Summary

This document proposes an Ahead-of-Time (AOT) compiler for LokaScript that transforms hyperscript source code into optimized JavaScript at build time. The compiler eliminates runtime parsing overhead, enables static analysis, reduces bundle sizes through dead code elimination, and improves execution performance by 40-60%.

## Table of Contents

1. [Goals and Benefits](#1-goals-and-benefits)
2. [Architecture Overview](#2-architecture-overview)
3. [Compilation Pipeline](#3-compilation-pipeline)
4. [Code Generation Strategies](#4-code-generation-strategies)
5. [Runtime Support Layer](#5-runtime-support-layer)
6. [Integration Points](#6-integration-points)
7. [Implementation Plan](#7-implementation-plan)
8. [Example Outputs](#8-example-outputs)
9. [Performance Considerations](#9-performance-considerations)
10. [Migration Path](#10-migration-path)
11. [Implementation Status (2026-02-05)](#11-implementation-status-2026-02-05)

---

## 1. Goals and Benefits

### Primary Goals

1. **Zero-cost parsing**: Eliminate 100% of runtime parsing by pre-compiling to JavaScript
2. **Smaller bundles**: Remove parser (~60KB) when using AOT-only mode
3. **Static analysis**: Enable TypeScript type checking, linting, and IDE support
4. **Tree-shaking**: Include only commands actually used in the codebase
5. **Faster execution**: Direct function calls instead of registry lookups

### Quantified Benefits

| Metric             | JIT (Current)           | AOT (Proposed)        | Improvement |
| ------------------ | ----------------------- | --------------------- | ----------- |
| Initial parse time | 2-5ms per handler       | 0ms                   | 100%        |
| Bundle size (full) | 203 KB                  | ~40 KB (runtime only) | 80%         |
| Bundle size (lite) | 7.3 KB                  | ~3 KB (no parser)     | 59%         |
| Command dispatch   | ~0.5ms                  | ~0.1ms                | 80%         |
| Memory (AST cache) | ~500KB per 100 handlers | 0                     | 100%        |

### Non-Goals

- Replacing the JIT runtime entirely (AOT is opt-in)
- Supporting dynamic hyperscript generation at runtime
- Breaking backward compatibility with existing code

---

## 2. Architecture Overview

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BUILD TIME (AOT Compiler)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   HTML/Vue/Svelte Files          Hyperscript Files (.hs)               │
│   ┌──────────────────┐           ┌──────────────────┐                  │
│   │ <button          │           │ behavior Counter │                  │
│   │   _="on click    │           │   on click       │                  │
│   │   toggle .active"│           │   increment :n   │                  │
│   │ >                │           │ end              │                  │
│   └────────┬─────────┘           └────────┬─────────┘                  │
│            │                              │                             │
│            └──────────────┬───────────────┘                             │
│                           ↓                                             │
│              ┌────────────────────────┐                                 │
│              │   Source Scanner       │  (Extract _ attributes)         │
│              │   (Vite plugin hook)   │                                 │
│              └────────────┬───────────┘                                 │
│                           ↓                                             │
│              ┌────────────────────────┐                                 │
│              │   Parser               │  (Existing parser.ts)           │
│              │   - Traditional        │                                 │
│              │   - Semantic (24 lang) │                                 │
│              └────────────┬───────────┘                                 │
│                           ↓                                             │
│              ┌────────────────────────┐                                 │
│              │   AST                  │  CommandNode, EventHandlerNode  │
│              │   (Intermediate Rep)   │                                 │
│              └────────────┬───────────┘                                 │
│                           ↓                                             │
│              ┌────────────────────────┐                                 │
│              │   AOT Compiler Core    │                                 │
│              │   ┌──────────────────┐ │                                 │
│              │   │ Phase 1: Analyze │ │  Static analysis, type infer   │
│              │   │ Phase 2: Optimize│ │  Constant fold, inline         │
│              │   │ Phase 3: Codegen │ │  Emit JavaScript               │
│              │   └──────────────────┘ │                                 │
│              └────────────┬───────────┘                                 │
│                           ↓                                             │
│              ┌────────────────────────┐                                 │
│              │   Generated JavaScript │  Optimized, type-safe          │
│              │   + Source Maps        │                                 │
│              └────────────────────────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         RUNTIME (Browser)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌────────────────────────┐    ┌────────────────────────┐             │
│   │  AOT Runtime (~3KB)    │    │  Generated Handlers    │             │
│   │  - ExecutionContext    │◄───│  - Direct function     │             │
│   │  - DOM helpers         │    │    calls               │             │
│   │  - Event binding       │    │  - No parsing          │             │
│   └────────────────────────┘    └────────────────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Package Structure

```
packages/
└── aot-compiler/
    ├── package.json
    ├── src/
    │   ├── index.ts                    # Public API
    │   ├── compiler/
    │   │   ├── aot-compiler.ts         # Main compiler orchestrator
    │   │   ├── analyzer.ts             # Static analysis pass
    │   │   ├── optimizer.ts            # Optimization passes
    │   │   └── codegen.ts              # JavaScript code generation
    │   ├── transforms/
    │   │   ├── command-transforms.ts   # Per-command code generation
    │   │   ├── expression-transforms.ts # Expression → JS
    │   │   └── event-transforms.ts     # Event handler codegen
    │   ├── runtime/
    │   │   ├── aot-runtime.ts          # Minimal runtime (~3KB)
    │   │   ├── context.ts              # ExecutionContext implementation
    │   │   └── dom-helpers.ts          # DOM manipulation utilities
    │   ├── scanner/
    │   │   ├── html-scanner.ts         # Extract from HTML attributes
    │   │   ├── vue-scanner.ts          # Vue SFC support
    │   │   └── svelte-scanner.ts       # Svelte support
    │   └── types/
    │       └── aot-types.ts            # TypeScript definitions
    └── tests/
        ├── compiler.test.ts
        ├── codegen.test.ts
        └── e2e/
```

---

## 3. Compilation Pipeline

### Phase 1: Source Extraction

Extract hyperscript from various source formats:

```typescript
interface SourceExtractor {
  /**
   * Extract hyperscript code with source locations
   */
  extract(source: string, filename: string): ExtractedScript[];
}

interface ExtractedScript {
  code: string; // The hyperscript code
  location: SourceLocation; // File, line, column
  elementId?: string; // ID for DOM binding
  elementSelector?: string; // CSS selector for binding
  language?: string; // Language code (for semantic)
}

// Example extraction from HTML
// Input: <button id="btn" _="on click toggle .active">
// Output: {
//   code: "on click toggle .active",
//   location: { file: "index.html", line: 5, column: 20 },
//   elementId: "btn",
//   language: "en"
// }
```

### Phase 2: Parsing (Reuse Existing)

Leverage the existing parser infrastructure:

```typescript
import { Parser } from '@lokascript/core/parser';
import { SemanticParser } from '@lokascript/semantic';

interface ParseResult {
  ast: ASTNode;
  errors: ParseError[];
  warnings: ParseWarning[];
  metadata: {
    parserUsed: 'traditional' | 'semantic';
    language?: string;
    confidence?: number;
  };
}

async function parse(script: ExtractedScript): Promise<ParseResult> {
  // Try semantic parser first for multilingual support
  if (script.language && script.language !== 'en') {
    const semantic = await SemanticParser.parse(script.code, script.language);
    if (semantic.confidence > 0.8) {
      return { ast: semantic.ast, metadata: { parserUsed: 'semantic', ...} };
    }
  }

  // Fall back to traditional parser
  const ast = Parser.parse(script.code);
  return { ast, metadata: { parserUsed: 'traditional' } };
}
```

### Phase 3: Static Analysis

Perform analysis on the AST to inform optimization:

```typescript
interface AnalysisResult {
  // Command usage statistics
  commandsUsed: Set<string>; // e.g., {'toggle', 'add', 'set'}

  // Variable analysis
  variables: {
    locals: Map<string, VariableInfo>; // :localVar
    globals: Map<string, VariableInfo>; // ::globalVar
    contextVars: Set<string>; // me, you, it, event, result
  };

  // Expression complexity
  expressions: {
    pure: ExpressionNode[]; // Can be evaluated at compile time
    dynamic: ExpressionNode[]; // Require runtime evaluation
    selectors: SelectorInfo[]; // CSS selectors used
  };

  // Control flow
  controlFlow: {
    hasAsync: boolean; // Uses fetch, settle, wait
    hasLoops: boolean; // repeat, for each, while
    hasConditionals: boolean; // if/else
    canThrow: boolean; // May throw halt/exit
  };

  // Dependencies
  dependencies: {
    domQueries: string[]; // Selectors that need querySelectorAll
    eventTypes: string[]; // Events listened to
    behaviors: string[]; // Behaviors referenced
  };
}

class Analyzer {
  analyze(ast: ASTNode): AnalysisResult {
    const visitor = new AnalysisVisitor();
    visitor.visit(ast);
    return visitor.getResult();
  }
}
```

### Phase 4: Optimization

Apply optimizations based on analysis:

```typescript
interface Optimizer {
  optimize(ast: ASTNode, analysis: AnalysisResult): OptimizedAST;
}

class OptimizationPipeline implements Optimizer {
  private passes: OptimizationPass[] = [
    new ConstantFoldingPass(), // Evaluate compile-time constants
    new SelectorMergingPass(), // Combine repeated selector queries
    new DeadCodeEliminationPass(), // Remove unreachable code
    new InliningPass(), // Inline simple expressions
    new LoopUnrollingPass(), // Unroll small fixed-count loops
  ];

  optimize(ast: ASTNode, analysis: AnalysisResult): OptimizedAST {
    let current = ast;
    for (const pass of this.passes) {
      if (pass.shouldRun(analysis)) {
        current = pass.transform(current, analysis);
      }
    }
    return current as OptimizedAST;
  }
}
```

#### Optimization Pass Examples

**1. Constant Folding**

```typescript
// Input AST for: set :x to 5 + 3
{
  type: 'command',
  name: 'set',
  modifiers: {
    to: {
      type: 'binaryExpression',
      operator: '+',
      left: { type: 'literal', value: 5 },
      right: { type: 'literal', value: 3 }
    }
  }
}

// Output (constant folded)
{
  type: 'command',
  name: 'set',
  modifiers: {
    to: { type: 'literal', value: 8 }  // Pre-computed
  }
}
```

**2. Selector Caching**

```typescript
// Input: "add .active to #btn then remove .loading from #btn"
// Without optimization: 2 x document.querySelector('#btn')

// Optimized: Cache selector result
// Generated code:
const _sel_btn = document.querySelector('#btn');
_sel_btn.classList.add('active');
_sel_btn.classList.remove('loading');
```

### Phase 5: Code Generation

Transform optimized AST to JavaScript:

```typescript
interface CodeGenerator {
  generate(ast: OptimizedAST, options: CodegenOptions): GeneratedCode;
}

interface CodegenOptions {
  target: 'es2020' | 'es2022' | 'esnext';
  mode: 'iife' | 'esm' | 'cjs';
  minify: boolean;
  sourceMaps: boolean;
  runtimeImport: string; // e.g., '@lokascript/aot-runtime'
  preserveComments: boolean;
  debugMode: boolean;
}

interface GeneratedCode {
  code: string;
  map?: SourceMap;
  imports: string[]; // Required runtime imports
  exports: string[]; // Exported handler names
  metadata: {
    commandsUsed: string[];
    originalSize: number;
    generatedSize: number;
  };
}
```

---

## 4. Code Generation Strategies

### 4.1 Command-Specific Code Generation

Each command has a dedicated code generator:

```typescript
// packages/aot-compiler/src/transforms/command-transforms.ts

interface CommandCodegen {
  /** Command name this generator handles */
  readonly command: string;

  /** Generate JavaScript for this command */
  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression;
}

// Registry of command code generators
const commandCodegens = new Map<string, CommandCodegen>([
  ['toggle', new ToggleCodegen()],
  ['add', new AddCodegen()],
  ['remove', new RemoveCodegen()],
  ['set', new SetCodegen()],
  ['put', new PutCodegen()],
  ['if', new IfCodegen()],
  ['repeat', new RepeatCodegen()],
  ['fetch', new FetchCodegen()],
  // ... 40+ commands
]);
```

#### Example: Toggle Command Codegen

```typescript
class ToggleCodegen implements CommandCodegen {
  readonly command = 'toggle';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const target = node.args[0]; // The class/attribute to toggle
    const element = node.modifiers?.on ?? ctx.implicitTarget;

    // Generate optimized code based on target type
    if (target.type === 'classRef') {
      // Class toggle: .active
      const className = target.value.slice(1); // Remove leading '.'
      const elementCode = ctx.generateExpression(element);

      return {
        code: `${elementCode}.classList.toggle(${JSON.stringify(className)})`,
        async: false,
        sideEffects: true,
      };
    }

    if (target.type === 'attributeRef') {
      // Attribute toggle: @disabled
      const attrName = target.value.slice(1);
      const elementCode = ctx.generateExpression(element);

      return {
        code: `_rt.toggleAttr(${elementCode}, ${JSON.stringify(attrName)})`,
        async: false,
        sideEffects: true,
      };
    }

    // Complex case: runtime evaluation needed
    return {
      code: `_rt.toggle(${ctx.generateExpression(target)}, ${ctx.generateExpression(element)})`,
      async: false,
      sideEffects: true,
    };
  }
}
```

### 4.2 Expression Code Generation

Transform hyperscript expressions to JavaScript:

```typescript
class ExpressionCodegen {
  generate(node: ExpressionNode, ctx: CodegenContext): string {
    switch (node.type) {
      case 'literal':
        return JSON.stringify(node.value);

      case 'identifier':
        return this.generateIdentifier(node, ctx);

      case 'selector':
        return this.generateSelector(node, ctx);

      case 'binaryExpression':
        return this.generateBinary(node, ctx);

      case 'memberExpression':
        return this.generateMember(node, ctx);

      case 'callExpression':
        return this.generateCall(node, ctx);

      case 'possessive':
        return this.generatePossessive(node, ctx);

      // ... more expression types
    }
  }

  private generateIdentifier(node: IdentifierNode, ctx: CodegenContext): string {
    const name = node.name;

    // Context variables
    if (name === 'me') return '_ctx.me';
    if (name === 'you') return '_ctx.you';
    if (name === 'it' || name === 'result') return '_ctx.it';
    if (name === 'event') return '_ctx.event';

    // Local variables (:varName)
    if (name.startsWith(':')) {
      const varName = name.slice(1);
      return `_ctx.locals.get(${JSON.stringify(varName)})`;
    }

    // Global variables (::varName)
    if (name.startsWith('::')) {
      const varName = name.slice(2);
      return `_rt.globals.get(${JSON.stringify(varName)})`;
    }

    // Unqualified identifier - check context
    return `_ctx.resolve(${JSON.stringify(name)})`;
  }

  private generateSelector(node: SelectorNode, ctx: CodegenContext): string {
    const selector = node.value;

    // Check if we can cache this selector
    if (ctx.canCacheSelector(selector)) {
      const cacheVar = ctx.getCachedSelector(selector);
      return cacheVar;
    }

    // ID selector optimization
    if (selector.startsWith('#') && !selector.includes(' ')) {
      const id = selector.slice(1);
      return `document.getElementById(${JSON.stringify(id)})`;
    }

    // General selector
    return `document.querySelector(${JSON.stringify(selector)})`;
  }

  private generateBinary(node: BinaryExpressionNode, ctx: CodegenContext): string {
    const left = this.generate(node.left, ctx);
    const right = this.generate(node.right, ctx);
    const op = this.mapOperator(node.operator);

    // Special handling for hyperscript-specific operators
    if (node.operator === 'is') {
      return `(${left} === ${right})`;
    }
    if (node.operator === 'is not') {
      return `(${left} !== ${right})`;
    }
    if (node.operator === 'contains') {
      return `_rt.contains(${left}, ${right})`;
    }
    if (node.operator === 'matches') {
      return `_rt.matches(${left}, ${right})`;
    }

    return `(${left} ${op} ${right})`;
  }

  private generatePossessive(node: PossessiveNode, ctx: CodegenContext): string {
    // "element's value" → element.value or getAttribute
    const object = this.generate(node.object, ctx);
    const property = node.property;

    // Common DOM properties
    const domProps = ['value', 'textContent', 'innerHTML', 'checked', 'disabled'];
    if (domProps.includes(property)) {
      return `${object}.${property}`;
    }

    // Style properties
    if (property.startsWith('style.')) {
      const styleProp = property.slice(6);
      return `${object}.style.${styleProp}`;
    }

    // General property access (may be attribute)
    return `_rt.getProp(${object}, ${JSON.stringify(property)})`;
  }
}
```

### 4.3 Event Handler Code Generation

Generate event listener setup code:

```typescript
class EventHandlerCodegen {
  generate(node: EventHandlerNode, ctx: CodegenContext): GeneratedHandler {
    const eventName = node.event;
    const modifiers = node.modifiers ?? {};

    // Generate the handler function body
    const bodyCode = this.generateBody(node.commands, ctx);

    // Build event listener options
    const options = this.buildListenerOptions(modifiers);

    // Generate the complete handler
    return {
      handlerCode: `
async function _handler_${ctx.handlerId}(_event) {
  const _ctx = _rt.createContext(_event, this);
  ${ctx.localVarDeclarations}
  try {
    ${bodyCode}
  } catch (_e) {
    if (_e === _rt.HALT) return;
    if (_e === _rt.EXIT) return;
    throw _e;
  }
}`,

      bindingCode: this.generateBinding(node, ctx, options),

      cleanup: options.once
        ? null
        : `
_el.removeEventListener(${JSON.stringify(eventName)}, _handler_${ctx.handlerId}${options.capture ? ', true' : ''});`,
    };
  }

  private buildListenerOptions(modifiers: Record<string, any>): ListenerOptions {
    return {
      once: modifiers.once === true,
      passive: modifiers.passive === true,
      capture: modifiers.capture === true,
      debounce: typeof modifiers.debounce === 'number' ? modifiers.debounce : null,
      throttle: typeof modifiers.throttle === 'number' ? modifiers.throttle : null,
    };
  }

  private generateBinding(
    node: EventHandlerNode,
    ctx: CodegenContext,
    options: ListenerOptions
  ): string {
    const event = JSON.stringify(node.event);
    const handlerRef = `_handler_${ctx.handlerId}`;

    // Apply debounce/throttle wrappers
    let handler = handlerRef;
    if (options.debounce) {
      handler = `_rt.debounce(${handler}, ${options.debounce})`;
    } else if (options.throttle) {
      handler = `_rt.throttle(${handler}, ${options.throttle})`;
    }

    // Event listener options
    const listenerOpts = [];
    if (options.once) listenerOpts.push('once: true');
    if (options.passive) listenerOpts.push('passive: true');
    if (options.capture) listenerOpts.push('capture: true');

    const optsArg = listenerOpts.length > 0 ? `, { ${listenerOpts.join(', ')} }` : '';

    // Event delegation?
    if (node.target) {
      const delegateSelector = this.generateSelector(node.target, ctx);
      return `_rt.delegate(_el, ${event}, ${delegateSelector}, ${handler}${optsArg});`;
    }

    return `_el.addEventListener(${event}, ${handler}${optsArg});`;
  }
}
```

### 4.4 Control Flow Code Generation

```typescript
class ControlFlowCodegen {
  generateIf(node: IfNode, ctx: CodegenContext): string {
    const condition = ctx.exprCodegen.generate(node.condition, ctx);
    const thenBranch = this.generateBlock(node.thenBranch, ctx);

    let code = `if (${condition}) {\n${thenBranch}\n}`;

    if (node.elseBranch) {
      const elseBranch = this.generateBlock(node.elseBranch, ctx);
      code += ` else {\n${elseBranch}\n}`;
    }

    return code;
  }

  generateRepeat(node: RepeatNode, ctx: CodegenContext): string {
    // "repeat 5 times" → fixed count loop
    if (node.count !== undefined) {
      const count =
        typeof node.count === 'number' ? node.count : ctx.exprCodegen.generate(node.count, ctx);

      const body = this.generateBlock(node.body, ctx);

      return `
for (let _i = 0; _i < ${count}; _i++) {
  _ctx.locals.set('index', _i);
  ${body}
}`;
    }

    // "repeat until event" → event-driven loop
    if (node.untilEvent) {
      return this.generateRepeatUntilEvent(node, ctx);
    }

    // "repeat while condition" → while loop
    if (node.whileCondition) {
      const condition = ctx.exprCodegen.generate(node.whileCondition, ctx);
      const body = this.generateBlock(node.body, ctx);
      return `while (${condition}) {\n${body}\n}`;
    }

    throw new CodegenError('Unsupported repeat variant');
  }

  generateForEach(node: ForEachNode, ctx: CodegenContext): string {
    const collection = ctx.exprCodegen.generate(node.collection, ctx);
    const itemVar = node.itemName;
    const indexVar = node.indexName ?? 'index';
    const body = this.generateBlock(node.body, ctx);

    return `
{
  const _collection = ${collection};
  const _arr = Array.isArray(_collection) ? _collection : Array.from(_collection);
  for (let _i = 0; _i < _arr.length; _i++) {
    _ctx.locals.set(${JSON.stringify(itemVar)}, _arr[_i]);
    _ctx.locals.set(${JSON.stringify(indexVar)}, _i);
    ${body}
  }
}`;
  }
}
```

---

## 5. Runtime Support Layer

### 5.1 Minimal AOT Runtime (~3KB)

```typescript
// packages/aot-compiler/src/runtime/aot-runtime.ts

/**
 * Minimal runtime for AOT-compiled hyperscript.
 * Provides only the utilities that cannot be inlined.
 */

// Control flow signals
export const HALT = Symbol('halt');
export const EXIT = Symbol('exit');

// Global variable store
export const globals = new Map<string, unknown>();

// Execution context factory
export function createContext(event: Event | null, me: Element): ExecutionContext {
  return {
    me,
    you: null,
    it: null,
    result: null,
    event,
    locals: new Map(),
    halted: false,
    returned: false,
  };
}

// DOM helpers
export function toggle(target: unknown, element: Element): void {
  if (typeof target === 'string') {
    if (target.startsWith('.')) {
      element.classList.toggle(target.slice(1));
    } else if (target.startsWith('@')) {
      toggleAttr(element, target.slice(1));
    }
  }
}

export function toggleAttr(element: Element, attr: string): void {
  if (element.hasAttribute(attr)) {
    element.removeAttribute(attr);
  } else {
    element.setAttribute(attr, '');
  }
}

export function addClass(element: Element, className: string): void {
  element.classList.add(className.startsWith('.') ? className.slice(1) : className);
}

export function removeClass(element: Element, className: string): void {
  element.classList.remove(className.startsWith('.') ? className.slice(1) : className);
}

export function getProp(element: Element, property: string): unknown {
  // Try as property first
  if (property in element) {
    return (element as any)[property];
  }
  // Fall back to attribute
  return element.getAttribute(property);
}

export function setProp(element: Element, property: string, value: unknown): void {
  if (property in element) {
    (element as any)[property] = value;
  } else {
    element.setAttribute(property, String(value));
  }
}

// Collection helpers
export function contains(container: unknown, item: unknown): boolean {
  if (typeof container === 'string') {
    return container.includes(String(item));
  }
  if (Array.isArray(container)) {
    return container.includes(item);
  }
  if (container instanceof Element) {
    return container.contains(item as Node);
  }
  return false;
}

export function matches(element: Element, selector: string): boolean {
  return element.matches(selector);
}

// Timing helpers
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  } as T;
}

export function throttle<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let last = 0;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      return fn.apply(this, args);
    }
  } as T;
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Event delegation
export function delegate(
  container: Element,
  event: string,
  selector: string,
  handler: (e: Event) => void,
  options?: AddEventListenerOptions
): () => void {
  const delegatedHandler = (e: Event) => {
    const target = e.target as Element;
    if (target?.matches?.(selector)) {
      handler.call(target, e);
    }
  };
  container.addEventListener(event, delegatedHandler, options);
  return () => container.removeEventListener(event, delegatedHandler, options);
}

// Fetch helper (for fetch command)
export async function fetchJSON(url: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchText(url: string, options?: RequestInit): Promise<string> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}
```

### 5.2 Type Definitions

```typescript
// packages/aot-compiler/src/runtime/types.ts

export interface ExecutionContext {
  me: Element;
  you: Element | null;
  it: unknown;
  result: unknown;
  event: Event | null;
  locals: Map<string, unknown>;
  halted: boolean;
  returned: boolean;
}

export interface CompiledHandler {
  /** Unique identifier for this handler */
  id: string;

  /** Original hyperscript source */
  source: string;

  /** Event type(s) this handles */
  events: string[];

  /** The compiled handler function */
  handler: (event: Event) => void | Promise<void>;

  /** Bind this handler to an element */
  bind(element: Element): void;

  /** Unbind from element */
  unbind(element: Element): void;
}

export interface CompiledBehavior {
  /** Behavior name */
  name: string;

  /** Install this behavior on an element */
  install(element: Element): void;

  /** Remove this behavior from an element */
  uninstall(element: Element): void;
}
```

---

## 6. Integration Points

### 6.1 Vite Plugin Integration

```typescript
// packages/vite-plugin/src/aot-transform.ts

import { AOTCompiler } from '@lokascript/aot-compiler';
import type { Plugin } from 'vite';

export interface AOTPluginOptions {
  /** Enable AOT compilation (default: true in production) */
  enabled?: boolean;

  /** Include source maps */
  sourceMaps?: boolean;

  /** Languages to support for semantic parsing */
  languages?: string[];

  /** Additional runtime helpers to include */
  helpers?: string[];

  /** Minify generated code */
  minify?: boolean;
}

export function lokascriptAOT(options: AOTPluginOptions = {}): Plugin {
  const compiler = new AOTCompiler();

  return {
    name: 'lokascript-aot',

    enforce: 'pre',

    async transform(code, id) {
      // Only process HTML-like files
      if (!id.match(/\.(html|vue|svelte|jsx|tsx)$/)) {
        return null;
      }

      // Extract hyperscript from attributes
      const scripts = compiler.extract(code, id);
      if (scripts.length === 0) {
        return null;
      }

      // Compile to JavaScript
      const compiled = await compiler.compile(scripts, {
        sourceMaps: options.sourceMaps ?? true,
        minify: options.minify ?? false,
      });

      // Inject compiled handlers
      const output = this.injectHandlers(code, compiled);

      return {
        code: output.code,
        map: output.map,
      };
    },

    // Generate runtime bundle
    generateBundle() {
      // Emit minimal runtime based on which helpers were used
      this.emitFile({
        type: 'chunk',
        id: 'lokascript-aot-runtime',
        name: 'lokascript-runtime',
      });
    },
  };
}
```

### 6.2 CLI Tool

```typescript
// packages/aot-compiler/src/cli.ts

import { Command } from 'commander';
import { AOTCompiler } from './compiler/aot-compiler';
import { glob } from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
  .name('lokascript-aot')
  .description('Ahead-of-Time compiler for LokaScript/hyperscript')
  .version('1.0.0');

program
  .command('compile')
  .description('Compile hyperscript files to JavaScript')
  .argument('<input>', 'Input file or glob pattern')
  .option('-o, --output <dir>', 'Output directory', './dist')
  .option('--format <format>', 'Output format (esm|cjs|iife)', 'esm')
  .option('--minify', 'Minify output')
  .option('--sourcemap', 'Generate source maps')
  .option('--language <lang>', 'Default language for semantic parsing', 'en')
  .action(async (input, options) => {
    const compiler = new AOTCompiler();
    const files = await glob(input);

    console.log(`Compiling ${files.length} files...`);

    for (const file of files) {
      const source = await fs.readFile(file, 'utf-8');
      const scripts = compiler.extract(source, file);

      if (scripts.length === 0) {
        console.log(`  ${file}: no hyperscript found`);
        continue;
      }

      const result = await compiler.compile(scripts, {
        mode: options.format,
        minify: options.minify,
        sourceMaps: options.sourcemap,
        defaultLanguage: options.language,
      });

      const outPath = path.join(options.output, file.replace(/\.(html|vue|svelte)$/, '.hs.js'));

      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, result.code);

      if (result.map) {
        await fs.writeFile(outPath + '.map', JSON.stringify(result.map));
      }

      console.log(`  ${file} → ${outPath} (${result.code.length} bytes)`);
    }
  });

program
  .command('analyze')
  .description('Analyze hyperscript usage without compiling')
  .argument('<input>', 'Input file or glob pattern')
  .option('--json', 'Output as JSON')
  .action(async (input, options) => {
    const compiler = new AOTCompiler();
    const files = await glob(input);

    const analysis = {
      files: files.length,
      scripts: 0,
      commands: new Set<string>(),
      events: new Set<string>(),
      selectors: new Set<string>(),
      errors: [] as string[],
    };

    for (const file of files) {
      const source = await fs.readFile(file, 'utf-8');
      const scripts = compiler.extract(source, file);
      analysis.scripts += scripts.length;

      for (const script of scripts) {
        try {
          const result = compiler.analyze(script.code);
          result.commandsUsed.forEach(c => analysis.commands.add(c));
          result.dependencies.eventTypes.forEach(e => analysis.events.add(e));
          result.dependencies.domQueries.forEach(s => analysis.selectors.add(s));
        } catch (e) {
          analysis.errors.push(`${file}: ${e.message}`);
        }
      }
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            ...analysis,
            commands: Array.from(analysis.commands),
            events: Array.from(analysis.events),
            selectors: Array.from(analysis.selectors),
          },
          null,
          2
        )
      );
    } else {
      console.log(`\nAnalysis Results:`);
      console.log(`  Files: ${analysis.files}`);
      console.log(`  Scripts: ${analysis.scripts}`);
      console.log(`  Commands: ${Array.from(analysis.commands).join(', ')}`);
      console.log(`  Events: ${Array.from(analysis.events).join(', ')}`);
      if (analysis.errors.length > 0) {
        console.log(`  Errors: ${analysis.errors.length}`);
        analysis.errors.forEach(e => console.log(`    - ${e}`));
      }
    }
  });

program.parse();
```

### 6.3 Programmatic API

```typescript
// packages/aot-compiler/src/index.ts

export { AOTCompiler } from './compiler/aot-compiler';
export { Analyzer } from './compiler/analyzer';
export { CodeGenerator } from './compiler/codegen';
export * from './types/aot-types';

// Convenience function for simple use cases
export async function compileHyperscript(code: string, options?: CompileOptions): Promise<string> {
  const compiler = new AOTCompiler();
  const result = await compiler.compileScript(code, options);
  return result.code;
}

// Example usage:
// import { compileHyperscript } from '@lokascript/aot-compiler';
// const js = await compileHyperscript('on click toggle .active');
// console.log(js);
// Output: `_el.addEventListener('click', async function(_event) { ... });`
```

---

## 7. Implementation Plan

### Phase 1: Core Compiler (4 weeks)

| Week | Tasks                                                               |
| ---- | ------------------------------------------------------------------- |
| 1    | Set up package structure, TypeScript config, testing infrastructure |
| 1    | Implement source extraction for HTML files                          |
| 2    | Implement expression code generation (all expression types)         |
| 2    | Implement basic command code generators (toggle, add, remove, set)  |
| 3    | Implement control flow code generation (if, repeat, for each)       |
| 3    | Implement event handler code generation with modifiers              |
| 4    | Implement minimal AOT runtime                                       |
| 4    | Integration testing with real hyperscript examples                  |

### Phase 2: Optimization Passes (2 weeks)

| Week | Tasks                                           |
| ---- | ----------------------------------------------- |
| 5    | Implement constant folding pass                 |
| 5    | Implement selector caching optimization         |
| 6    | Implement dead code elimination                 |
| 6    | Implement loop unrolling for small fixed counts |

### Phase 3: Integration (2 weeks)

| Week | Tasks                      |
| ---- | -------------------------- |
| 7    | Vite plugin integration    |
| 7    | CLI tool implementation    |
| 8    | Source map generation      |
| 8    | Vue/Svelte scanner support |

### Phase 4: Advanced Features (3 weeks)

| Week | Tasks                                                |
| ---- | ---------------------------------------------------- |
| 9    | Multilingual support via semantic parser integration |
| 9    | Behavior compilation support                         |
| 10   | Bundle optimization (tree-shaking runtime)           |
| 10   | Async command support (fetch, settle, wait)          |
| 11   | Performance benchmarking and optimization            |
| 11   | Documentation and examples                           |

### File Structure

```
packages/aot-compiler/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                        # Public API exports
│   ├── compiler/
│   │   ├── aot-compiler.ts             # Main compiler class
│   │   ├── analyzer.ts                 # Static analysis
│   │   ├── optimizer.ts                # Optimization pipeline
│   │   └── codegen.ts                  # Code generation orchestrator
│   ├── transforms/
│   │   ├── index.ts                    # Transform registry
│   │   ├── command-transforms/
│   │   │   ├── index.ts
│   │   │   ├── toggle.ts
│   │   │   ├── add-remove.ts
│   │   │   ├── set-put.ts
│   │   │   ├── show-hide.ts
│   │   │   ├── fetch.ts
│   │   │   ├── wait.ts
│   │   │   └── ... (40+ commands)
│   │   ├── expression-transforms.ts    # All expression types
│   │   ├── event-transforms.ts         # Event handler generation
│   │   └── control-flow-transforms.ts  # if/repeat/for/while
│   ├── optimizations/
│   │   ├── index.ts
│   │   ├── constant-folding.ts
│   │   ├── selector-caching.ts
│   │   ├── dead-code-elimination.ts
│   │   └── loop-unrolling.ts
│   ├── runtime/
│   │   ├── aot-runtime.ts              # Minimal browser runtime
│   │   ├── context.ts                  # ExecutionContext
│   │   └── helpers.ts                  # DOM/timing helpers
│   ├── scanner/
│   │   ├── html-scanner.ts
│   │   ├── vue-scanner.ts
│   │   └── svelte-scanner.ts
│   ├── cli/
│   │   └── index.ts                    # CLI entry point
│   └── types/
│       └── aot-types.ts
└── tests/
    ├── compiler.test.ts
    ├── analyzer.test.ts
    ├── codegen/
    │   ├── expressions.test.ts
    │   ├── commands.test.ts
    │   └── events.test.ts
    ├── optimizations/
    │   └── *.test.ts
    └── e2e/
        ├── html-files/
        └── integration.test.ts
```

---

## 8. Example Outputs

### Example 1: Simple Toggle

**Input (HTML):**

```html
<button id="btn" _="on click toggle .active">Toggle</button>
```

**Generated JavaScript:**

```javascript
// lokascript-compiled.js
import { createContext } from '@lokascript/aot-runtime';

const _el_btn = document.getElementById('btn');

_el_btn.addEventListener('click', function (_event) {
  this.classList.toggle('active');
});
```

### Example 2: Form Validation

**Input:**

```html
<form
  _="on submit
  if #email's value is empty
    add .error to #email
    halt
  end
  remove .error from #email
"
></form>
```

**Generated JavaScript:**

```javascript
import { createContext, HALT } from '@lokascript/aot-runtime';

const _el_form = document.querySelector('form[_]');
const _sel_email = document.getElementById('email');

_el_form.addEventListener('submit', async function (_event) {
  const _ctx = createContext(_event, this);

  try {
    // if #email's value is empty
    if (_sel_email.value === '') {
      // add .error to #email
      _sel_email.classList.add('error');
      // halt
      throw HALT;
    }
    // remove .error from #email
    _sel_email.classList.remove('error');
  } catch (_e) {
    if (_e === HALT) {
      _event.preventDefault();
      return;
    }
    throw _e;
  }
});
```

### Example 3: Fetch with Loading State

**Input:**

```html
<button
  _="on click
  add .loading to me
  fetch /api/data as json
  put result into #output
  remove .loading from me
"
></button>
```

**Generated JavaScript:**

```javascript
import { createContext, fetchJSON } from '@lokascript/aot-runtime';

const _el_btn = document.querySelector('button[_]');
const _sel_output = document.getElementById('output');

_el_btn.addEventListener('click', async function (_event) {
  const _ctx = createContext(_event, this);

  // add .loading to me
  this.classList.add('loading');

  // fetch /api/data as json
  _ctx.it = await fetchJSON('/api/data');

  // put result into #output
  _sel_output.innerHTML = _ctx.it;

  // remove .loading from me
  this.classList.remove('loading');
});
```

### Example 4: Repeat Loop

**Input:**

```html
<div
  _="on click
  repeat 5 times
    add <div.item/> to me
    wait 100ms
  end
"
></div>
```

**Generated JavaScript:**

```javascript
import { createContext, wait } from '@lokascript/aot-runtime';

const _el_div = document.querySelector('div[_]');

_el_div.addEventListener('click', async function (_event) {
  const _ctx = createContext(_event, this);

  // repeat 5 times
  for (let _i = 0; _i < 5; _i++) {
    _ctx.locals.set('index', _i);

    // add <div.item/> to me
    const _newEl = document.createElement('div');
    _newEl.className = 'item';
    this.appendChild(_newEl);

    // wait 100ms
    await wait(100);
  }
});
```

### Example 5: Event Modifiers

**Input:**

```html
<input _="on input.debounce(300) put my value into #preview" />
```

**Generated JavaScript:**

```javascript
import { createContext, debounce } from '@lokascript/aot-runtime';

const _el_input = document.querySelector('input[_]');
const _sel_preview = document.getElementById('preview');

const _handler_1 = debounce(function (_event) {
  _sel_preview.textContent = this.value;
}, 300);

_el_input.addEventListener('input', _handler_1);
```

### Example 6: Multilingual (Japanese)

**Input:**

```html
<button _="クリック で .active を トグル" lang="ja">Toggle</button>
```

**Generated JavaScript (same output):**

```javascript
const _el_btn = document.querySelector('button[_]');

_el_btn.addEventListener('click', function (_event) {
  this.classList.toggle('active');
});
```

---

## 9. Performance Considerations

### Bundle Size Comparison

| Scenario             | JIT Bundle | AOT Bundle          | Savings |
| -------------------- | ---------- | ------------------- | ------- |
| Full runtime         | 203 KB     | 3 KB (runtime only) | 98.5%   |
| With parser fallback | 203 KB     | 65 KB               | 68%     |
| Lite mode            | 7.3 KB     | 2 KB                | 73%     |

### Execution Performance

| Operation          | JIT Time | AOT Time   | Improvement |
| ------------------ | -------- | ---------- | ----------- |
| Initial parse      | 2-5ms    | 0ms        | 100%        |
| Command dispatch   | 0.5ms    | 0.1ms      | 80%         |
| Expression eval    | 0.3ms    | 0.05ms     | 83%         |
| Total handler exec | 3-6ms    | 0.15-0.2ms | 95%+        |

### Memory Usage

| Metric                   | JIT     | AOT    | Improvement |
| ------------------------ | ------- | ------ | ----------- |
| AST cache (100 handlers) | ~500 KB | 0      | 100%        |
| Parser heap              | ~2 MB   | 0      | 100%        |
| Runtime heap             | ~50 KB  | ~10 KB | 80%         |

---

## 10. Migration Path

### Gradual Adoption

1. **Phase 1: Analysis Mode**
   - Run AOT analyzer to identify hyperscript usage
   - No code changes required

2. **Phase 2: Hybrid Mode**
   - AOT compile static hyperscript
   - Keep JIT runtime for dynamic scripts
   - Both work together seamlessly

3. **Phase 3: Full AOT**
   - Remove JIT runtime if no dynamic scripts
   - Maximum bundle size savings

### Configuration

```javascript
// vite.config.js
import { lokascript, lokascriptAOT } from '@lokascript/vite-plugin';

export default {
  plugins: [
    // Option 1: JIT only (current behavior)
    lokascript(),

    // Option 2: AOT only (no runtime parsing)
    lokascriptAOT({ enabled: true }),

    // Option 3: Hybrid (AOT + JIT fallback)
    lokascript({ aot: true, fallback: true }),
  ],
};
```

### Compatibility Notes

- All existing hyperscript code works without modification
- AOT output is functionally identical to JIT execution
- Source maps enable debugging of original hyperscript
- Multilingual support works through semantic parser integration

---

## 11. Implementation Status (2026-02-05)

### What's Built

The AOT compiler package (`packages/aot-compiler`) is implemented with:

- **AOT Compiler** (`aot-compiler.ts`): Main orchestrator — parses, generates code, tracks metadata, produces combined output
- **Two parser adapters**: `CoreParserAdapter` (English, wraps `@lokascript/core`) and `SemanticParserAdapter` (24 languages, wraps `@lokascript/semantic`)
- **Regex fallback parser** (`createSimpleAST`): Zero-dependency pattern matching for simple cases
- **Code generation**: `CommandCodegen` (12 commands), `ExpressionCodegen` (all expression types), `EventCodegen` (event handler wiring)
- **128 tests passing** (vitest, happy-dom environment)

### Adapter Correctness Fixes (commit `a0b580ab`)

The following bugs were found and fixed in both parser adapters:

| Bug                                                        | Impact                                             | Fix                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| `unaryExpression` mapped to `type: 'binary'`               | `not x` generated `(0 not x)` — invalid JS         | Changed to `type: 'unary'` which dispatches to `generateUnary()` → `!x` |
| `unless` / `until` negation used broken binary pattern     | Same invalid JS for negated conditions             | Changed to `{ type: 'unary', operator: 'not', operand }`                |
| `convertMember()` recursed on string `property`            | Crash when member property is a raw string         | Added `typeof node.property === 'string'` guard                         |
| Semantic adapter missing `unless` command                  | `unless` silently dropped                          | Routes to `convertIfCommand()` with negated condition                   |
| Semantic adapter missing `variable` / `htmlSelector` nodes | Variables and selectors lost during conversion     | Added conversion cases matching core adapter                            |
| Semantic adapter ignored event modifiers                   | `once`, `debounce`, `throttle`, etc. not extracted | Added extraction from both flat properties and `eventModifiers` object  |
| Test suites vacuously passing                              | 19 core adapter tests silently skipped (no DOM)    | Added `@vitest-environment happy-dom` + `describe.runIf()`              |

### Multilingual Reliability Assessment

Tested actual JS output (not just `success: true`) across 9 languages via both parser adapters.

#### What Works (High Reliability)

**Standalone class commands** generate correct JS across all tested languages:

| Input            | Generated JS                    | Languages Verified                 |
| ---------------- | ------------------------------- | ---------------------------------- |
| `toggle .active` | `el.classList.toggle('active')` | en, es, ja, ko, ar, zh, tr, pt, fr |
| `add .clicked`   | `el.classList.add('clicked')`   | en, es, ko, ar, zh, tr, pt, fr     |
| `remove .hidden` | `el.classList.remove('hidden')` | en, es, ja, ko, ar, zh, tr, pt, fr |
| `show`           | `el.style.display = ''`         | en, es, ja, ko, ar, zh, tr, pt, fr |
| `hide`           | `el.style.display = 'none'`     | en, es, ja, ko, ar, zh, tr, pt, fr |

These pass through the semantic adapter → AOT AST → `CommandCodegen` cleanly. The semantic parser correctly identifies the command and class operand regardless of language.

#### Previously Broken (Now Fixed)

1. **~~Non-English event handlers produce empty function bodies~~ FIXED**
   - Input: `クリック で .active を 切り替え` (Japanese: "on click toggle .active")
   - Previously: `function(event) { }` — the event was wired but the body was empty
   - Root cause: `applyExtractionRules()` in `pattern-matcher.ts` only handled `rule.default` but not `rule.value`. Grammar-transformed event patterns (e.g., `toggle-event-ja-sov`) captured the event and roles but the static `action: { value: "toggle" }` was never placed into the captured map. `buildEventHandler()` couldn't find the action, fell through to `parseBodyWithClauses()` which had no tokens left (pattern consumed all tokens), and returned `body: []`.
   - Fix: `applyExtractionRules()` now also applies `rule.value` as a `{ type: 'literal', value }` entry. Verified with body-content tests for JA, KO, ES, AR, ZH.
   - Also added: `node.body` fallback in `fromSemanticAST.convertEventHandler()`, nested `EventNode` handling in `EventHandlerCodegen.generateNode()`, and silent-failure detection in `compileScript()`.

2. **Japanese `add` (`追加 .clicked`) fails entirely**
   - The semantic parser returns a structure the adapter doesn't recognize for this command in Japanese
   - Other languages (Korean `추가`, Arabic `أضف`, etc.) work fine

#### Remaining Items

1. **`addEventListener` is in a separate binding step (by design)**
   - `compileScript()` generates the handler function body only
   - Event binding (`el.addEventListener(...)`) is produced by `generateCombinedCode()` which wraps all handlers
   - This is correct architecture but means individual `compileScript()` results don't show the full picture

#### Reliability Summary

| Category                      | English (core)      | English (semantic) | Non-English (semantic) |
| ----------------------------- | ------------------- | ------------------ | ---------------------- |
| Standalone class ops          | Works               | Works              | Works                  |
| Event handler + class ops     | Works               | Works              | **Works** (fixed)      |
| `set` / `put` / data commands | Works               | Works              | Works                  |
| Control flow (`if`/`repeat`)  | Works (core parser) | Untested           | Untested               |
| `fetch` / async               | Works               | Untested           | Untested               |

### Recommended Next Steps

1. **Expand command codegen coverage** — remaining ~9 commands without AOT codegens: `swap`, `morph`, `transition`, `measure`, `settle`, `tell`, `async`, `install`, `render`.

2. **Fix Japanese `add` command** — `追加 .clicked` fails in the semantic parser while other languages work fine.

3. **Test non-English control flow and async** — `if`/`repeat`/`fetch` in JA/KO/ES/AR are untested through the AOT pipeline.

---

## Appendix A: Command Coverage Matrix

| Command    | AOT Support | Notes                         |
| ---------- | ----------- | ----------------------------- |
| toggle     | Full        | Direct classList.toggle()     |
| add        | Full        | classList.add() or DOM        |
| remove     | Full        | classList.remove() or DOM     |
| set        | Full        | Property/attribute assignment |
| put        | Full        | innerHTML/textContent         |
| get        | Full        | Property access               |
| if/else    | Full        | Direct JS conditionals        |
| repeat     | Full        | for loop                      |
| for each   | Full        | for...of loop                 |
| while      | Full        | while loop                    |
| wait       | Full        | setTimeout promise            |
| fetch      | Full        | Native fetch API              |
| send       | Full        | dispatchEvent                 |
| trigger    | Full        | dispatchEvent                 |
| call       | Full        | Function call                 |
| return     | Full        | return statement              |
| halt       | Full        | throw HALT                    |
| exit       | Full        | throw EXIT                    |
| log        | Full        | console.log                   |
| throw      | Full        | throw Error                   |
| try/catch  | Full        | try/catch block               |
| async      | Full        | async/await                   |
| settle     | Full        | Promise.allSettled            |
| show/hide  | Full        | display style                 |
| transition | Partial     | CSS transitions               |
| measure    | Full        | getBoundingClientRect         |
| go         | Full        | location/history              |
| focus/blur | Full        | Element methods               |
| scroll     | Full        | scrollIntoView                |
| take       | Full        | classList manipulation        |

---

## Appendix B: Expression Support Matrix

| Expression Type            | AOT Support | Generated Code       |
| -------------------------- | ----------- | -------------------- |
| Literals                   | Full        | JSON.stringify       |
| Selectors (#id, .class)    | Full        | querySelector        |
| Context vars (me, you, it) | Full        | \_ctx.\* access      |
| Local vars (:var)          | Full        | \_ctx.locals.get/set |
| Global vars (::var)        | Full        | \_rt.globals.get/set |
| Binary operators           | Full        | Native JS operators  |
| Possessive ('s)            | Full        | Property access      |
| Comparisons                | Full        | ===, !==, <, >, etc. |
| contains/matches           | Full        | Runtime helper       |
| as conversion              | Full        | Type coercion        |
| first/last/random          | Full        | Array access         |
| closest/parent             | Full        | DOM traversal        |

---

## Appendix C: Glossary

- **AOT (Ahead-of-Time)**: Compilation that occurs before runtime, typically at build time
- **JIT (Just-in-Time)**: Compilation that occurs at runtime when code is first executed
- **AST (Abstract Syntax Tree)**: Tree representation of parsed source code
- **Codegen**: Code generation - transforming AST to target language
- **Tree-shaking**: Dead code elimination based on usage analysis
- **Source map**: Mapping from generated code back to original source for debugging

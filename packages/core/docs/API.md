# API Reference

Complete API documentation for HyperFixi.

## Table of Contents

- [Main API](#main-api)
- [HTML Integration](#html-integration)
- [Types](#types)
- [Context Management](#context-management)
- [Runtime Configuration](#runtime-configuration)
- [Error Handling](#error-handling)

## Main API

### `hyperscript`

The main HyperFixi API object providing all core functionality.

```typescript
import { hyperscript } from 'hyperfixi';
```

#### Methods

##### `compile(code: string): CompilationResult`

Compiles hyperscript code into an Abstract Syntax Tree (AST).

```typescript
const result = hyperscript.compile('5 + 3 * 2');

if (result.success) {
  console.log('Compilation successful');
  console.log('AST:', result.ast);
  console.log('Tokens:', result.tokens);
  console.log('Time:', result.compilationTime, 'ms');
} else {
  console.error('Compilation failed:', result.errors);
}
```

**Parameters:**
- `code: string` - The hyperscript code to compile

**Returns:** [`CompilationResult`](#compilationresult)

---

##### `execute(ast: ASTNode, context?: ExecutionContext): Promise<any>`

Executes a compiled AST with the given context.

```typescript
const compiled = hyperscript.compile('me.textContent');
if (compiled.success) {
  const context = hyperscript.createContext(element);
  const result = await hyperscript.execute(compiled.ast, context);
  console.log('Result:', result);
}
```

**Parameters:**
- `ast: ASTNode` - The compiled AST to execute
- `context?: ExecutionContext` - Execution context (optional)

**Returns:** `Promise<any>` - The result of execution

---

##### `run(code: string, context?: ExecutionContext): Promise<any>`

Compiles and executes hyperscript code in one operation.

```typescript
// Simple expression
const result = await hyperscript.run('5 + 3');

// With context
const context = hyperscript.createContext(element);
await hyperscript.run('hide me', context);
```

**Parameters:**
- `code: string` - The hyperscript code to compile and execute
- `context?: ExecutionContext` - Execution context (optional)

**Returns:** `Promise<any>` - The result of execution

**Throws:** `Error` if compilation fails

---

##### `createContext(element?: HTMLElement | null): ExecutionContext`

Creates a new execution context.

```typescript
// Context without element
const context = hyperscript.createContext();

// Context with element
const button = document.getElementById('myButton');
const context = hyperscript.createContext(button);

// Access context properties
console.log(context.me);        // The element (or null)
console.log(context.variables); // Variable storage
```

**Parameters:**
- `element?: HTMLElement | null` - Element to bind as 'me' (optional)

**Returns:** [`ExecutionContext`](#executioncontext)

---

##### `createChildContext(parent: ExecutionContext, element?: HTMLElement | null): ExecutionContext`

Creates a child context that inherits from a parent context.

```typescript
const parent = hyperscript.createContext();
parent.globals?.set('theme', 'dark');

const child = hyperscript.createChildContext(parent, element);
// Child inherits parent's globals but has separate locals
console.log(child.globals?.get('theme')); // 'dark'
```

**Parameters:**
- `parent: ExecutionContext` - Parent context to inherit from
- `element?: HTMLElement | null` - Element to bind as 'me' (optional)

**Returns:** [`ExecutionContext`](#executioncontext)

---

##### `isValidHyperscript(code: string): boolean`

Validates hyperscript syntax without executing.

```typescript
if (hyperscript.isValidHyperscript('hide me')) {
  console.log('Valid syntax');
} else {
  console.log('Invalid syntax');
}
```

**Parameters:**
- `code: string` - The hyperscript code to validate

**Returns:** `boolean` - True if syntax is valid

---

##### `createRuntime(options?: RuntimeOptions): Runtime`

Creates a custom runtime instance with specific options.

```typescript
const customRuntime = hyperscript.createRuntime({
  enableAsyncCommands: true,
  commandTimeout: 5000,
  enableErrorReporting: false
});
```

**Parameters:**
- `options?: RuntimeOptions` - Runtime configuration (optional)

**Returns:** [`Runtime`](#runtime)

---

##### `parse: typeof parse`

Direct access to the low-level parser function.

```typescript
const result = hyperscript.parse('5 + 3');
console.log('Parse result:', result);
```

**Returns:** [`ParseResult`](#parseresult)

---

#### Properties

##### `version: string`

The current version of HyperFixi.

```typescript
console.log('HyperFixi version:', hyperscript.version);
```

## Types

### `CompilationResult`

Result of compiling hyperscript code.

```typescript
interface CompilationResult {
  success: boolean;           // Whether compilation succeeded
  ast?: ASTNode;             // Compiled AST (if successful)
  errors: ParseError[];      // Compilation errors
  tokens: Token[];           // Tokenized input
  compilationTime: number;   // Time taken in milliseconds
}
```

### `ExecutionContext`

Context for executing hyperscript expressions.

```typescript
interface ExecutionContext {
  me: HTMLElement | null;          // Current element
  it: any;                        // Result of previous operation
  you: HTMLElement | null;        // Target element
  result: any;                    // Explicit result storage
  locals?: Map<string, any>;      // Local variable scope
  globals?: Map<string, any>;     // Global variable scope
  variables?: Map<string, any>;   // General variables storage
  events?: Map<string, EventHandler>; // Event handlers
  event?: Event;                  // Current DOM event
  parent?: ExecutionContext;      // Parent context
  flags?: ExecutionFlags;         // Execution state flags
}
```

### `RuntimeOptions`

Configuration options for the runtime.

```typescript
interface RuntimeOptions {
  enableAsyncCommands?: boolean;  // Enable async command execution
  commandTimeout?: number;        // Command timeout in milliseconds
  enableErrorReporting?: boolean; // Enable error logging
}
```

### `ParseResult`

Result of parsing hyperscript code.

```typescript
interface ParseResult<T = ASTNode> {
  success: boolean;      // Whether parsing succeeded
  node?: T;             // Parsed AST node
  error?: ParseError;   // Parse error (if failed)
  tokens: Token[];      // Tokenized input
}
```

### `ParseError`

Information about a parsing error.

```typescript
interface ParseError {
  message: string;       // Error message
  position: number;      // Character position in input
  line: number;         // Line number
  column: number;       // Column number
  expected?: string[];  // Expected tokens (if applicable)
  actual?: string;      // Actual token found
}
```

## Context Management

### Variables

Context variables provide the execution environment:

```typescript
const context = hyperscript.createContext(element);

// Special context variables
context.me;          // Current element
context.it;          // Previous result
context.you;         // Target element
context.result;      // Explicit result

// Custom variables
context.variables?.set('userName', 'Alice');
context.variables?.set('counter', 42);

// Access in hyperscript
await hyperscript.run('userName + " clicked " + counter + " times"', context);
```

### Scope Chain

Child contexts inherit from parents:

```typescript
const parent = hyperscript.createContext();
parent.globals?.set('appName', 'MyApp');

const child = hyperscript.createChildContext(parent);
child.locals?.set('pageName', 'Home');

// Child can access both appName (from parent) and pageName (local)
await hyperscript.run('appName + " - " + pageName', child);
```

## Runtime Configuration

### Custom Runtime

Create specialized runtime instances:

```typescript
// Development runtime with enhanced error reporting
const devRuntime = hyperscript.createRuntime({
  enableAsyncCommands: true,
  commandTimeout: 30000,      // Longer timeout for debugging
  enableErrorReporting: true
});

// Production runtime with optimizations
const prodRuntime = hyperscript.createRuntime({
  enableAsyncCommands: true,
  commandTimeout: 5000,       // Shorter timeout
  enableErrorReporting: false // Disable console logging
});
```

### Runtime Methods

```typescript
// Execute with custom runtime
const context = hyperscript.createContext(element);
await customRuntime.execute(ast, context);
```

## Error Handling

### Compilation Errors

Handle compilation failures gracefully:

```typescript
const result = hyperscript.compile('invalid syntax @@');

if (!result.success) {
  result.errors.forEach(error => {
    console.error(`Error at line ${error.line}, column ${error.column}:`);
    console.error(error.message);
  });
}
```

### Execution Errors

Handle runtime errors:

```typescript
try {
  await hyperscript.run('me.nonExistentMethod()', context);
} catch (error) {
  console.error('Execution failed:', error.message);
  
  // Handle gracefully
  await hyperscript.run('add ".error"', context);
}
```

### Enhanced Error Messages

HyperFixi provides detailed error information:

```typescript
const result = hyperscript.compile('5 +');

if (!result.success) {
  const error = result.errors[0];
  console.log(error.message);
  // "Expected expression after '+' operator. Binary operators require both left and right operands."
}
```

### Error Recovery

HyperFixi attempts to provide partial results when possible:

```typescript
const result = hyperscript.compile('valid + invalid syntax');

// Even with errors, tokens and partial AST may be available
console.log('Tokens parsed:', result.tokens.length);
if (result.node) {
  console.log('Partial AST available');
}
```

## Advanced Usage

### Performance Optimization

```typescript
// Compile once, execute many times
const compiled = hyperscript.compile('hide me then wait 500ms then show me');

if (compiled.success) {
  // Reuse compiled AST for better performance
  await hyperscript.execute(compiled.ast, contextA);
  await hyperscript.execute(compiled.ast, contextB);
  await hyperscript.execute(compiled.ast, contextC);
}
```

### Syntax Validation

```typescript
// Validate user input before execution
function safeExecute(code: string, context: ExecutionContext) {
  if (!hyperscript.isValidHyperscript(code)) {
    throw new Error('Invalid hyperscript syntax');
  }
  
  return hyperscript.run(code, context);
}
```

### Event Integration

```typescript
// Integrate with DOM events
element.addEventListener('click', async (event) => {
  const context = hyperscript.createContext(element);
  context.event = event;
  
  await hyperscript.run('add ".clicked"', context);
});
```

## Migration Guide

### From Raw Hyperscript

```typescript
// Before: Using _hyperscript directly
// <div _="on click add .active">

// After: Using HyperFixi
element.addEventListener('click', async () => {
  const context = hyperscript.createContext(element);
  await hyperscript.run('add ".active"', context);
});
```

### From jQuery

```typescript
// Before: jQuery
// $element.addClass('active').hide().delay(1000).show();

// After: HyperFixi
const context = hyperscript.createContext(element);
await hyperscript.run('add ".active" then hide me then wait 1s then show me', context);
```

---

## HTML Integration

### Inline Attributes

The standard way to add hyperscript to elements:

```html
<button _="on click add .active to me">Click me</button>
```

### Script Blocks

For behavior definitions that should be available globally:

```html
<script type="text/hyperscript">
behavior Draggable
  on pointerdown
    -- drag logic
  end
end
</script>
```

### Script Blocks with `for` Attribute

Bind hyperscript to specific elements using the `for` attribute. This is useful for:

- Multi-line handlers that are hard to read in `_=` attributes
- Avoiding quote escaping when HTML strings contain `_=` attributes
- Separating behavior from markup

```html
<button id="my-btn">Click me</button>
<script type="text/hyperscript" for="#my-btn">
  on click
    set html to `<div class="box" _="install Draggable">Drag me</div>`
    swap innerHTML of #container with html
    call hyperfixi.processNode(#container)
</script>
```

**Selector behavior:**

- Accepts any valid CSS selector
- Executes once for each matched element
- Sets `me` to the target element
- Warns if no elements match (doesn't error)

```html
<!-- Bind to multiple elements -->
<script type="text/hyperscript" for=".toggle-btn">
  on click toggle .active on me
</script>
```

### `processNode(element)`

Re-process an element (and descendants) after dynamic HTML insertion:

```javascript
container.innerHTML = '<div _="on click log \'hello\'">New</div>';
hyperfixi.processNode(container);
```

---

For more examples and advanced usage patterns, see [EXAMPLES.md](./EXAMPLES.md).
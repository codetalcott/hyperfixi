# Type-Safe Test Utilities

This directory contains type-safe test utilities that eliminate the need for `as any` casts in tests.

## Quick Start

```typescript
import {
  // Parser helpers
  expectASTStructure,
  expectCommandNode,
  createTestCommandNode,

  // Context builders
  TestContextBuilder,
  createTestContext,
  createMinimalContext,

  // Error testing
  expectThrows,
  expectThrowsAsync,
  assertIsError,

  // Mock utilities
  createMockWebSocket,
  createMockEventSource,
  createMockExpressResponse,
} from './__test-utils__'
```

## Parser Test Helpers (`parser-helpers.ts`)

### Parse Result Types

```typescript
// Discriminated union for parse results
type ParserTestResult = ParserTestSuccess | ParserTestFailure

// Type guards
isParseSuccess(result) // returns true if success
isParseFailure(result) // returns true if failure

// Assertions
assertParseSuccess(result) // throws if failed
assertParseFailure(result) // throws if succeeded
```

### AST Assertions

```typescript
// Deep structure matching
expectASTStructure(node, {
  type: 'Command',
  name: 'toggle',
  arguments: [{ type: 'Selector', value: '.active' }]
})

// Expect specific command
expectCommandNode(node, 'toggle')

// Expect specific node type
expectNodeType<CommandNode>(node, 'Command')

// Property assertions
expectNodeProperty(node, 'name', 'toggle')
```

### Test Node Builders

```typescript
// Fluent builder
const node = new TestNodeBuilder()
  .withName('toggle')
  .withArguments(createTestSelector('.active'))
  .withTarget(createTestIdentifier('button'))
  .build()

// Quick factories
const cmdNode = createTestCommandNode('toggle', [createTestSelector('.active')])
const literal = createTestLiteral('hello')
const identifier = createTestIdentifier('myVar')
const selector = createTestSelector('.button')
```

## Context Builders (`context-builders.ts`)

### Fluent Builder

```typescript
const context = new TestContextBuilder()
  .withElement(button)
  .withGlobal('count', 0)
  .withLocal('temp', 'value')
  .withEvent(clickEvent)
  .withIt(lastResult)
  .build()
```

### Factory Functions

```typescript
// Create from options
const context = createTestContext({
  element: button,
  globals: { count: 0 },
  it: lastResult
})

// Minimal context
const context = createMinimalContext()

// Custom element
const element = createMockElement('button', { 'data-id': '123' })

// Custom event
const event = createMockEvent('click', { target: button })
```

## Error Testing (`error-testing.ts`)

### Basic Error Expectations

```typescript
// Expect any error
expectThrows(() => {
  throw new Error('test')
})

// Expect specific error type
expectThrows(() => {
  throw new TypeError('invalid')
}, TypeError)

// Expect error with message pattern
expectThrows(() => {
  throw new Error('invalid argument')
}, Error, /invalid/)

// Async version
await expectThrowsAsync(async () => {
  throw new Error('async error')
})
```

### Complex Error Assertions

```typescript
// Match multiple error properties
expectThrowsMatching(() => {
  throw new ValidationError('invalid', 'ERR_INVALID')
}, {
  type: ValidationError,
  message: /invalid/,
  code: 'ERR_INVALID',
  properties: {
    field: 'email'
  }
})
```

### Safe Error Handling

```typescript
// Type-safe error handler
try {
  riskyOperation()
} catch (error) {
  handleError(error, (err) => {
    // err is guaranteed to be Error
    console.log(err.message)
  })
}

// Error property access
const code = getErrorProperty<string>(error, 'code')
if (hasErrorProperty(error, 'statusCode')) {
  // error has statusCode property
}
```

## Mock Utilities (`mock-types.ts`)

### Mock Functions

```typescript
// Create tracked mock
const mockFn = createMockFunction<[string, number], boolean>((str, num) => {
  return str.length > num
})

mockFn('hello', 3) // returns true
console.log(mockFn.callCount) // 1
console.log(mockFn.lastCall) // ['hello', 3]
console.log(mockFn.calls) // [['hello', 3]]
```

### Browser API Mocks

```typescript
// WebSocket
const ws = createMockWebSocket('ws://localhost:8080')
ws.addEventListener('message', (event) => {
  console.log(event.data)
})
ws.postMessage({ type: 'ping' })

// EventSource
const es = createMockEventSource('/events')
es.addEventListener('message', (event) => {
  console.log(event.data)
})
es.simulateMessage('hello', 'message')

// Worker
const worker = createMockWorker()
worker.postMessage({ type: 'start' })
```

### HTTP Mocks

```typescript
// Express Response
const res = createMockExpressResponse<{ id: number }>()
res.status(200).json({ id: 123 })

console.log(res.getStatusCode()) // 200
console.log(res.getData()) // { id: 123 }
console.log(res.getHeaders()) // { 'Content-Type': 'application/json' }

// Express Request
const req = createMockExpressRequest({
  method: 'POST',
  url: '/api/users',
  body: { name: 'John' },
  headers: { 'content-type': 'application/json' }
})
```

## Migration Guide

### Before (using `as any`)

```typescript
// Unsafe AST assertion
const node = result.node as any
expect(node.name).toBe('toggle')
expect(node.arguments[0].value).toBe('.active')

// Unsafe error handling
try {
  parseInvalid()
} catch (error: any) {
  expect(error.message).toContain('invalid')
}

// Unsafe mock
const mockWs = {
  postMessage: (data: any) => {}
} as any
```

### After (using test utilities)

```typescript
// Type-safe AST assertion
expectASTStructure(result.node, {
  name: 'toggle',
  arguments: [{ value: '.active' }]
})

// Type-safe error handling
expectThrows(() => parseInvalid(), Error, /invalid/)

// Type-safe mock
const mockWs = createMockWebSocket()
mockWs.postMessage({ type: 'test' })
```

## Benefits

1. **Type Safety** - No more `as any`, full TypeScript checking
2. **Better Error Messages** - Detailed failure messages with context
3. **IDE Support** - Full autocomplete and type hints
4. **Maintainability** - Changes to types caught at compile time
5. **Discoverability** - Clear, documented API surface

## Architecture

```
__test-utils__/
├── index.ts                  # Central export
├── parser-helpers.ts         # AST and parse result utilities
├── context-builders.ts       # Execution context builders
├── error-testing.ts          # Error assertion utilities
├── mock-types.ts            # Mock object factories
└── README.md                # This file

../parser/__types__/
└── test-helpers.ts          # Parser-specific type helpers

../../semantic/src/__types__/
└── test-helpers.ts          # Semantic node type helpers
```

## Contributing

When adding new test utilities:

1. **Use discriminated unions** for result types (success/failure)
2. **Provide type guards** for narrowing types
3. **Include assertion helpers** that throw with good messages
4. **Create builder classes** for complex object construction
5. **Document with JSDoc** and add usage examples
6. **Export from index.ts** for easy access

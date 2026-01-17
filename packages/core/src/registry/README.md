# HyperFixi Registry System

The registry system provides extensibility APIs for commands, event sources, and context providers. This enables server-side hyperscript, custom events, and dynamic context values.

## Quick Start

```typescript
import { registry } from '@hyperfixi/core/registry';

// Register a custom command
registry.commands.register({
  name: 'myCommand',
  async execute(input, context) {
    console.log('Command executed!');
  },
});

// Register an event source
registry.eventSources.register('custom', customEventSource);

// Register a context provider
registry.context.register('myData', () => ({ foo: 'bar' }));
```

## Three Registries

### 1. Command Registry

Register custom hyperscript commands.

```typescript
import { commands } from '@hyperfixi/core/registry';

const greetCommand = {
  name: 'greet',
  async parseInput(raw, evaluator, context) {
    return {
      name: await evaluator.evaluate(raw.args[0], context),
    };
  },
  async execute(input, context) {
    console.log(`Hello, ${input.name}!`);
  },
};

commands.register(greetCommand);

// Usage in hyperscript:
// on click greet "World"
```

**API:**

- `commands.register(command)` - Register a command
- `commands.has(name)` - Check if command exists
- `commands.names()` - List all registered commands

### 2. Event Source Registry

Register custom event sources beyond DOM events (HTTP requests, WebSockets, SSE, etc.).

```typescript
import { eventSources } from '@hyperfixi/core/registry';

const requestEventSource = {
  name: 'request',
  description: 'HTTP request events',
  supportedEvents: ['GET', 'POST', 'PUT', 'DELETE'],

  subscribe(options, context) {
    // Setup event listener
    const id = setupListener(options.event, options.handler);

    return {
      id,
      source: 'request',
      event: options.event,
      unsubscribe: () => cleanup(id),
    };
  },
};

eventSources.register('request', requestEventSource);

// Usage in hyperscript:
// on request(GET, /api/users) respond with users
```

**API:**

- `eventSources.register(name, source)` - Register an event source
- `eventSources.has(name)` - Check if source exists
- `eventSources.names()` - List all registered sources

### 3. Context Provider Registry

Register dynamic context values that are resolved at runtime.

```typescript
import { context } from '@hyperfixi/core/registry';

// Simple provider
context.register('user', () => currentUser);

// Async provider
context.register('session', async ctx => {
  return await getSession(ctx.locals.get('sessionId'));
});

// Provider with options
context.register('db', () => database, {
  cache: true, // Cache value per execution
  dependencies: ['config'], // Resolve 'config' first
});

// Usage in hyperscript:
// set name to user.name
// log session.id
```

**API:**

- `context.register(name, provider, options?)` - Register a provider
- `context.has(name)` - Check if provider exists
- `context.names()` - List all registered providers

## Plugin System

Bundle multiple extensions into a single plugin.

```typescript
import { definePlugin } from '@hyperfixi/core/registry';

const serverPlugin = definePlugin({
  name: 'my-server-plugin',
  version: '1.0.0',

  commands: [respondCommand, redirectCommand],

  eventSources: [requestEventSource],

  contextProviders: [
    { name: 'request', provide: () => currentRequest },
    { name: 'response', provide: () => responseBuilder },
  ],

  setup(registry) {
    console.log('Plugin installed!');
  },

  teardown(registry) {
    console.log('Plugin removed');
  },
});

// Install the plugin
registry.use(serverPlugin);
```

## Server-Side Example

Complete example for server-side hyperscript in Express:

```typescript
import express from 'express';
import { registry } from '@hyperfixi/core/registry';
import { respondCommand, requestEventSource } from '@hyperfixi/core/registry/examples';

// Register server commands
registry.commands.register(respondCommand);
registry.eventSources.register('request', requestEventSource);

// Setup context providers in middleware
app.use((req, res, next) => {
  registry.context.register('request', () => req);
  registry.context.register('response', () => res);
  next();
});

// Hyperscript can now use:
// on request(GET, /api/users)
//   set users to [{ name: 'Alice' }, { name: 'Bob' }]
//   respond with <json> users </json>
```

## Multilingual Server Plugin

Enable server-side hyperscript in any of 23 supported languages.

```typescript
import { createMultilingualServerPlugin } from '@hyperfixi/core/registry/multilingual';

const plugin = createMultilingualServerPlugin({
  languages: ['en', 'ja', 'es'], // English, Japanese, Spanish
  customKeywords: {
    respond: { ja: '返答' }, // Override default
  },
});

registry.use(plugin);

// Now you can write server commands in multiple languages:
// English:  on request(GET, /users) respond with users
// Japanese: リクエスト(GET, /users) で 返答 with users
// Spanish:  en solicitud(GET, /users) responder con users
```

**Language Detection:**

- Auto-detects language from script (Hiragana → Japanese, Arabic script → Arabic)
- Falls back to keyword matching for Latin scripts
- Defaults to English for unknown input

**Supported Languages:**
English, Japanese, Korean, Chinese, Arabic, Spanish, Portuguese, French, German, Turkish, Indonesian, Russian, Ukrainian, Hindi, Vietnamese, Thai, Italian, Polish, Tagalog, Bengali, Malay, Swahili, Quechua

## Advanced Usage

### Custom Command Registry

Create isolated registries for different contexts:

```typescript
import { createRegistry } from '@hyperfixi/core/registry';

const myRegistry = createRegistry();
myRegistry.commands.register(myCommand);
```

### Context Provider Dependencies

Ensure providers are resolved in order:

```typescript
context.register('config', () => loadConfig(), {
  cache: true,
});

context.register(
  'database',
  ctx => {
    const config = ctx.locals.get('config');
    return connectDB(config.dbUrl);
  },
  {
    dependencies: ['config'], // Resolves config first
  }
);
```

### Event Source with Filtering

```typescript
const websocketSource = {
  name: 'websocket',

  subscribe(options, context) {
    const socket = getSocket();

    const handler = data => {
      // Filter by target/selector if provided
      if (options.target && !matches(data, options.target)) return;

      options.handler(
        {
          type: options.event,
          data,
          target: socket,
        },
        context
      );
    };

    socket.on(options.event, handler);

    return {
      id: generateId(),
      source: 'websocket',
      event: options.event,
      unsubscribe: () => socket.off(options.event, handler),
    };
  },
};
```

## TypeScript Support

All registries are fully typed:

```typescript
import type {
  CommandWithParseInput,
  EventSource,
  ContextProviderFn,
  HyperFixiPlugin,
} from '@hyperfixi/core/registry';

const myCommand: CommandWithParseInput = {
  name: 'example',
  async execute(input: { value: string }, context) {
    // Fully typed!
  },
};

const myProvider: ContextProviderFn<User> = ctx => {
  return getCurrentUser(); // Returns User type
};
```

## Examples

See complete examples in:

- [packages/core/src/registry/examples/server-commands.ts](examples/server-commands.ts) - Server commands (respond, redirect, setHeader)
- [packages/core/src/registry/examples/server-event-source.ts](examples/server-event-source.ts) - Request event source
- [packages/core/src/registry/multilingual/examples.ts](multilingual/examples.ts) - Multilingual commands (query, sendEmail, log)

## API Reference

### Command Interface

```typescript
interface CommandWithParseInput {
  name: string;

  parseInput?(
    raw: { args: ASTNode[]; modifiers: Record<string, any> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any>;

  execute(input: any, context: TypedExecutionContext): Promise<unknown>;

  validate?(input: unknown): ValidationResult<unknown>;

  metadata?: {
    description: string;
    syntax: string[];
    examples: string[];
    category?: string;
  };
}
```

### Event Source Interface

```typescript
interface EventSource {
  name: string;
  description?: string;
  supportedEvents?: string[];

  subscribe(
    options: {
      event: string;
      handler: EventSourceHandler;
      target?: string | RegExp;
      selector?: string;
      options?: Record<string, unknown>;
    },
    context: ExecutionContext
  ): EventSourceSubscription;

  supports?(event: string): boolean;
  destroy?(): void;
}
```

### Context Provider Interface

```typescript
type ContextProviderFn<T> = (context: ExecutionContext) => T | Promise<T>;

interface ContextProviderOptions<T> {
  description?: string;
  cache?: boolean; // Cache value per execution
  dependencies?: string[]; // Resolve these providers first
}
```

## Testing

```typescript
import { createRegistry } from '@hyperfixi/core/registry';
import { describe, it, expect } from 'vitest';

describe('My Plugin', () => {
  it('should register commands', () => {
    const registry = createRegistry();
    registry.commands.register(myCommand);

    expect(registry.commands.has('myCommand')).toBe(true);
  });
});
```

## License

Same as HyperFixi core.

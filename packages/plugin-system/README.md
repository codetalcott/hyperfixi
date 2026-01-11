# Hyperfixi Plugin System

A modular, type-safe plugin system for extending Hyperfixi with custom commands, features, and runtime behaviors.

## Installation

```bash
npm install @hyperfixi/plugin-system
```

## Overview

The plugin system provides four types of extensibility:

| Plugin Type | Purpose | Example |
|-------------|---------|---------|
| **Command** | Add hyperscript commands | `toggle`, `add`, `remove` |
| **Feature** | Add element capabilities | reactive state, auto-fetch |
| **Transform** | Modify AST during parsing | optimization, i18n |
| **Runtime** | Enhance execution behavior | debugging, logging |

## Quick Start

```typescript
import { optimizedRegistry, initializeHyperfixi } from '@hyperfixi/plugin-system';
import { ToggleCommand, AddCommand } from './my-plugins';

// Option 1: Use the quick start function
initializeHyperfixi({
  plugins: [ToggleCommand, AddCommand],
  autoApply: true,
});

// Option 2: Manual setup
optimizedRegistry.load(ToggleCommand, AddCommand);
optimizedRegistry.apply();
```

## Plugin Types

### Command Plugins

Handle hyperscript commands like `on`, `toggle`, `send`:

```typescript
import type { CommandPlugin, RuntimeContext } from '@hyperfixi/plugin-system';

const ToggleCommand: CommandPlugin = {
  type: 'command',
  name: 'toggle',
  pattern: /^toggle$/i,

  execute: async (ctx: RuntimeContext) => {
    const { element, args } = ctx;
    const className = args[0];
    element.classList.toggle(className);
  },
};
```

### Feature Plugins

Add new capabilities to elements:

```typescript
import type { FeaturePlugin, ElementContext } from '@hyperfixi/plugin-system';

const AutoSaveFeature: FeaturePlugin = {
  type: 'feature',
  name: 'auto-save',

  onElementInit: (ctx: ElementContext) => {
    const { element } = ctx;
    const interval = setInterval(() => {
      // Auto-save logic
    }, 5000);

    // Return cleanup function
    return () => clearInterval(interval);
  },
};
```

### Transform Plugins

Modify the AST during parsing:

```typescript
import type { TransformPlugin, ASTNode, TransformContext } from '@hyperfixi/plugin-system';

const OptimizeTransform: TransformPlugin = {
  type: 'transform',
  name: 'optimize',

  transformNode: (node: ASTNode, ctx: TransformContext) => {
    // Transform AST node
    return node;
  },
};
```

### Runtime Plugins

Enhance runtime execution with hooks:

```typescript
import type { RuntimePlugin, RuntimeContext } from '@hyperfixi/plugin-system';

const LoggerRuntime: RuntimePlugin = {
  type: 'runtime',
  name: 'logger',

  beforeExecute: (ctx: RuntimeContext) => {
    console.log(`Executing: ${ctx.plugin.name}`, ctx.args);
  },

  afterExecute: (ctx: RuntimeContext) => {
    console.log(`Completed: ${ctx.plugin.name}`);
  },

  interceptCommand: (command: string, ctx: RuntimeContext) => {
    // Return true to intercept and prevent execution
    return false;
  },
};
```

## Integration Bridges

### Parser Bridge

Integrate plugin commands with the core parser:

```typescript
import { ParserBridge, createParserBridge } from '@hyperfixi/plugin-system';

const bridge = createParserBridge([ToggleCommand, AddCommand]);

// Register commands for parsing
bridge.registerCommand(myCustomCommand);

// Parse and match commands
const ctx = bridge.createExtendedContext(parseContext);
const result = bridge.tryParseAnyCommand(ctx);

// Export for core parser integration
const parserCommands = bridge.exportForCoreParser();
```

### Runtime Bridge

Integrate plugin commands with the runtime:

```typescript
import { RuntimeBridge, createRuntimeBridge } from '@hyperfixi/plugin-system';

const bridge = createRuntimeBridge(
  [ToggleCommand, AddCommand],
  [LoggerRuntime],
  {
    enableHooks: true,
    executionTimeout: 5000,
    debug: true,
  }
);

// Execute commands
const result = await bridge.executeCommand('toggle', element, ['.active'], {
  event: clickEvent,
});

// Process hyperscript attributes
await bridge.processAttribute(element, attribute);

// Cleanup when done
bridge.cleanup(element);
```

## Error Handling

The plugin system provides structured error handling:

```typescript
import {
  PluginLoadError,
  PluginExecutionError,
  PluginDependencyError,
  isPluginSystemError,
  wrapError,
} from '@hyperfixi/plugin-system';

try {
  await bridge.executeCommand('unknown', element);
} catch (error) {
  if (isPluginSystemError(error)) {
    console.log(`Plugin error [${error.code}]: ${error.message}`);
  }
}

// Error types:
// - PluginLoadError: Plugin failed to load
// - PluginExecutionError: Execution failed (includes element/action context)
// - PluginDependencyError: Missing dependencies
// - PluginRegistrationError: Registration failed (duplicate, invalid)
// - PluginInitError: Initialization failed
// - PluginParseError: Parsing failed
```

## Hybrid Loading

Load plugins dynamically based on DOM content:

```typescript
import { HybridPluginLoader, createHybridLoader } from '@hyperfixi/plugin-system';

const loader = new HybridPluginLoader({
  corePlugins: [OnCommand, ToggleCommand],
  optionalPlugins: new Map([
    ['websocket', async () => import('./plugins/websocket')],
    ['animation', async () => import('./plugins/animation')],
  ]),
  autoDetect: true,
  lazyLoadDelay: 100,
});

await loader.initialize();

// Plugins are automatically loaded when elements need them:
// <div data-ws="..."> triggers websocket plugin load
// <div data-animate="..."> triggers animation plugin load
```

## Build-Time Analysis

Analyze HTML files to determine required plugins:

```typescript
import { PluginAnalyzer, optimizePluginsForBuild } from '@hyperfixi/plugin-system';

const analyzer = new PluginAnalyzer();

// Analyze single file
const result = analyzer.analyzeHTML('<button _="on click toggle .active">');
console.log(result.requiredPlugins); // Set { 'toggle' }

// Analyze entire directory
const dirResult = await analyzer.analyzeDirectory('./src', ['.html', '.vue']);

// Get optimized plugin list for builds
const optimized = optimizePluginsForBuild(myPlugins, result);
```

## Bundle Building

Create optimized bundles:

```typescript
import { PluginBundleBuilder, buildBundles } from '@hyperfixi/plugin-system';

const builder = new PluginBundleBuilder({
  outputDir: './dist',
  minify: true,
});

// Build bundles for different configurations
await buildBundles({
  minimal: ['toggle', 'add'],
  standard: ['toggle', 'add', 'remove', 'on', 'send'],
  full: 'all',
});
```

## API Reference

### Registry

| Method | Description |
|--------|-------------|
| `load(...plugins)` | Register plugins |
| `unload(name)` | Unregister a plugin |
| `get(name)` | Get plugin by name |
| `getByType(type)` | Get all plugins of type |
| `apply(root?)` | Apply plugins to DOM |
| `has(name)` | Check if plugin exists |

### ParserBridge

| Method | Description |
|--------|-------------|
| `registerCommand(plugin)` | Register command for parsing |
| `createExtendedContext(ctx)` | Create extended parse context |
| `wrapCoreParserContext(ctx)` | Wrap core parser context |
| `parseCommand(name, ctx)` | Parse a specific command |
| `tryParseAnyCommand(ctx)` | Try to match any command |
| `exportForCoreParser()` | Export for core integration |

### RuntimeBridge

| Method | Description |
|--------|-------------|
| `registerCommand(plugin)` | Register command plugin |
| `registerRuntimePlugin(plugin)` | Register runtime plugin |
| `executeCommand(name, el, args)` | Execute a command |
| `processAttribute(el, attr)` | Process hyperscript attribute |
| `registerCleanup(el, fn)` | Register cleanup function |
| `cleanup(el)` | Run cleanup for element |
| `exportCommandRegistry()` | Export command registry |

## TypeScript Support

Full TypeScript types are exported:

```typescript
import type {
  // Plugin types
  Plugin,
  CommandPlugin,
  FeaturePlugin,
  TransformPlugin,
  RuntimePlugin,

  // Context types
  RuntimeContext,
  ParseContext,
  ElementContext,
  TransformContext,

  // Integration types
  ExtendedParseContext,
  ExecutionResult,
  ParsedCommand,

  // Error types
  ErrorCode,
} from '@hyperfixi/plugin-system';
```

## License

MIT

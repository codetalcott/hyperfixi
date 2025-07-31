# Hyperfixi Plugin System

This experimental plugin system is inspired by Datastar's modular architecture,
adapted for Hyperfixi's needs.

## Overview

The plugin system allows Hyperfixi to be extended through four types of plugins:

### 1. Command Plugins

Handle hyperscript commands like `on`, `toggle`, `send`:

```typescript
const OnCommandPlugin: CommandPlugin = {
  type: "command",
  name: "on",
  pattern: /^on\s+(\w+)/,
  execute: async (ctx) => {
    // Handle event binding
  },
};
```

### 2. Feature Plugins

Add new capabilities to elements:

```typescript
const ReactiveStateFeature: FeaturePlugin = {
  type: "feature",
  name: "reactive-state",
  onElementInit: (ctx) => {
    // Initialize reactive state
  },
};
```

### 3. Transform Plugins

Modify the AST during parsing:

```typescript
const OptimizeTransform: TransformPlugin = {
  type: "transform",
  name: "optimize",
  transformNode: (node, ctx) => {
    // Optimize AST node
    return node;
  },
};
```

### 4. Runtime Plugins

Enhance runtime execution:

```typescript
const DebugRuntime: RuntimePlugin = {
  type: "runtime",
  name: "debug",
  beforeExecute: (ctx) => {
    console.log("Executing:", ctx);
  },
};
```

## Usage

### Loading Plugins

```typescript
import { pluginRegistry } from "@hyperfixi/plugin-system";
import { OnCommandPlugin } from "./plugins/commands";

// Load individual plugins
pluginRegistry.load(OnCommandPlugin);

// Or load multiple
pluginRegistry.load(
  OnCommandPlugin,
  ReactiveStateFeature,
  AutoFetchFeature,
);

// Apply to DOM
pluginRegistry.apply();
```

### Creating Bundles

Different bundles can load different sets of plugins:

```typescript
// standard.ts - Full featured
pluginRegistry.load(
  OnCommandPlugin,
  ToggleCommandPlugin,
  SendCommandPlugin,
  ReactiveStateFeature,
  AutoFetchFeature,
  IntersectionFeature,
);

// minimal.ts - Just core commands
pluginRegistry.load(
  OnCommandPlugin,
  ToggleCommandPlugin,
  SendCommandPlugin,
);
```

## Key Differences from Datastar

1. **Type Safety**: Stronger TypeScript types throughout
2. **Plugin Types**: Four distinct types vs Datastar's three
3. **Integration**: Designed to work with existing Hyperfixi parser/runtime
4. **Lifecycle**: More granular lifecycle hooks
5. **Dependencies**: Explicit dependency management

## Benefits

1. **Modularity**: Load only what you need
2. **Extensibility**: Easy to add new commands/features
3. **Bundle Size**: Create minimal bundles for specific use cases
4. **Runtime Loading**: Plugins can be loaded dynamically
5. **Type Safety**: Full TypeScript support

## Migration Path

To adopt this in Hyperfixi:

1. **Phase 1**: Implement plugin registry alongside existing system
2. **Phase 2**: Migrate existing features to plugins
3. **Phase 3**: Update parser to use command plugins
4. **Phase 4**: Deprecate old feature system

## Example: Custom Plugin

```typescript
const CustomCommandPlugin: CommandPlugin = {
  type: "command",
  name: "animate",
  pattern: /^animate\s+/,

  execute: async (ctx) => {
    const { element, args } = ctx;
    const [animation, duration] = args;

    element.animate(
      getKeyframes(animation),
      { duration: parseDuration(duration) },
    );
  },
};

// Register and use
pluginRegistry.load(CustomCommandPlugin);
```

This plugin system provides a flexible foundation for extending Hyperfixi while
maintaining compatibility with the existing architecture.

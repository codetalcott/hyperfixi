# Hyperfixi Plugin System Implementation Plan

## Overview

This document outlines the implementation plan for the experimental plugin
system in Hyperfixi, inspired by Datastar's modular architecture. The system has
been prototyped in `/packages/plugin-system` and is ready for validation and
integration.

## Current State

### Completed Work

1. **Core Architecture** (`/packages/plugin-system/src/`)
   - Type-safe plugin definitions (`types.ts`, `typed.ts`)
   - Plugin registry with performance optimizations (`registry.ts`,
     `optimized-registry.ts`)
   - Command plugins with strong typing (`plugins/typed-commands.ts`)
   - Feature plugins for extensions (`plugins/features.ts`)

2. **Build-Time Optimization**
   - Plugin analyzer for detecting usage (`compiler/analyzer.ts`)
   - Bundle builder for optimized outputs (`compiler/bundle-builder.ts`)
   - Hybrid loader for dynamic imports (`hybrid-loader.ts`)

3. **Documentation**
   - Architecture comparison (`COMPARISON.md`)
   - Migration guide (`MIGRATION.md`)
   - README with examples

### Key Files to Review

```
packages/plugin-system/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types.ts                    # Core type definitions
│   ├── typed.ts                    # Enhanced type-safe APIs
│   ├── registry.ts                 # Base plugin registry
│   ├── optimized-registry.ts       # Performance-optimized registry
│   ├── hybrid-loader.ts            # Dynamic loading support
│   ├── plugins/
│   │   ├── typed-commands.ts       # Type-safe command plugins
│   │   └── features.ts             # Feature plugins
│   └── compiler/
│       ├── analyzer.ts             # Usage analysis
│       └── bundle-builder.ts       # Bundle generation
├── tests/
├── benchmarks/
└── examples/
```

## Implementation Steps

### Phase 1: Validation (Days 1-3)

#### 1.1 Build and Test

```bash
cd packages/plugin-system
npm install
npm run build
npm test
```

#### 1.2 Fix Any Build Issues

- Ensure all TypeScript errors are resolved
- Verify rollup builds work correctly
- Test in browser environment

#### 1.3 Run Benchmarks

```bash
# Open benchmarks/performance.ts in browser
# Document performance metrics:
# - Pattern matching speed
# - Plugin loading time
# - DOM application performance
```

### Phase 2: Integration Prototype (Days 4-7)

#### 2.1 Parser Integration

Create bridge between existing parser and plugin system:

```typescript
// packages/core/src/parser/plugin-bridge.ts
import { Parser } from "./parser";
import type { PluginRegistry } from "@hyperfixi/plugin-system";

export class PluginAwareParser extends Parser {
  constructor(private plugins: PluginRegistry) {
    super();
  }

  parseCommand(input: string) {
    // First try plugin-based parsing
    const plugin = this.plugins.findMatchingCommand(input);
    if (plugin) {
      return this.parseWithPlugin(plugin, input);
    }

    // Fall back to original parser
    return super.parseCommand(input);
  }
}
```

#### 2.2 Runtime Integration

Connect plugin execution to existing runtime:

```typescript
// packages/core/src/runtime/plugin-executor.ts
export class PluginExecutor {
  async executeCommand(
    ctx: ExecutionContext,
    commandName: string,
    args: any[],
  ) {
    const plugin = this.registry.get(commandName);
    if (plugin?.type === "command") {
      return plugin.execute({
        ...ctx,
        plugin,
        args,
        modifiers: this.parseModifiers(ctx),
      });
    }
  }
}
```

### Phase 3: Feature Migration (Days 8-14)

#### 3.1 Migrate 'on' Command

This is the most used command and good test case:

```typescript
// packages/core/src/features/on/plugin-wrapper.ts
import { createOnFeature } from "./original";
import { OnCommand } from "@hyperfixi/plugin-system";

export function getOnFeature() {
  if (process.env.USE_PLUGINS) {
    return createPluginWrapper(OnCommand);
  }
  return createOnFeature();
}
```

#### 3.2 Test Migration

- Ensure all existing tests pass
- Add plugin-specific tests
- Compare performance

### Phase 4: Evaluation (Days 15-16)

#### 4.1 Metrics to Collect

| Metric               | Target        | Method                 |
| -------------------- | ------------- | ---------------------- |
| Bundle Size          | -30%          | Compare webpack builds |
| Parse Performance    | No regression | Benchmark suite        |
| Runtime Performance  | No regression | Operations/second      |
| Type Safety          | Maintained    | TypeScript strict mode |
| Developer Experience | Improved      | Team feedback          |

#### 4.2 Decision Matrix

| Scenario               | Criteria                    | Action                |
| ---------------------- | --------------------------- | --------------------- |
| **Full Success**       | All targets met             | Plan full migration   |
| **Partial Success**    | Some benefits, minor issues | Hybrid approach       |
| **Performance Issues** | Slower than current         | Investigate/optimize  |
| **Complexity Issues**  | Harder to use/maintain      | Extract best patterns |

### Phase 5: Production Path (If Proceeding)

#### 5.1 Migration Tools

```bash
# Create CLI tool
npx create-hyperfixi-plugin my-command
npx hyperfixi-migrate on-feature
npx hyperfixi-analyze ./src
```

#### 5.2 Documentation Updates

- Update main docs with plugin system
- Create plugin development guide
- Add migration tutorials

#### 5.3 Release Strategy

1. **v2.0-beta**: Plugin system in parallel
2. **v2.1**: Deprecate old system
3. **v3.0**: Remove old system

## Code Examples for Next Session

### Example 1: Creating Custom Plugin

```typescript
import { defineCommand } from "@hyperfixi/plugin-system";

export const AnimateCommand = defineCommand("animate", {
  pattern: /^animate\s+(\w+)(?:\s+(\d+))?/,
  execute: async (ctx) => {
    const [type, duration = "300"] = ctx.args;
    const keyframes = getAnimationKeyframes(type);

    await ctx.element.animate(keyframes, {
      duration: parseInt(duration),
      easing: ctx.modifiers.has("ease") ? "ease-out" : "linear",
    }).finished;
  },
});
```

### Example 2: Bundle Configuration

```typescript
// hyperfixi.config.ts
export default {
  plugins: {
    bundles: [
      {
        name: "minimal",
        plugins: ["on", "toggle", "send"],
      },
      {
        name: "standard",
        plugins: ["minimal", "fetch", "intersect"],
      },
      {
        name: "full",
        analyze: true, // Auto-detect all needed plugins
      },
    ],
  },
};
```

### Example 3: Testing Strategy

```typescript
describe("Plugin System Integration", () => {
  it("should maintain backward compatibility", () => {
    const legacy = hyperscript();
    const pluginBased = initializeHyperfixi();

    // Both should work identically
    expect(legacy.parse("on click toggle .active"))
      .toEqual(pluginBased.parse("on click toggle .active"));
  });
});
```

## Open Questions to Resolve

1. **Plugin Discovery**: Should plugins auto-register or require explicit
   loading?
2. **Version Management**: How to handle plugin version conflicts?
3. **SSR Support**: How do plugins work in server-side rendering?
4. **Plugin Marketplace**: Should we create a registry for community plugins?
5. **Breaking Changes**: What's acceptable to break for v3.0?

## Resources Needed

1. **Performance Testing Environment**: Real-world apps for benchmarking
2. **Community Feedback**: Beta testers from current users
3. **Documentation Site**: Updates for plugin system
4. **CI/CD Updates**: New build and test pipelines

## Risk Mitigation

| Risk                   | Mitigation                                |
| ---------------------- | ----------------------------------------- |
| Performance regression | Extensive benchmarking, gradual rollout   |
| Breaking changes       | Compatibility layer, deprecation warnings |
| Complexity increase    | Clear documentation, migration tools      |
| Community resistance   | RFC process, show clear benefits          |

## Success Metrics

- [ ] 30%+ bundle size reduction for typical apps
- [ ] No performance regression in benchmarks
- [ ] 3+ community plugins within 3 months
- [ ] 90%+ test coverage maintained
- [ ] Positive developer feedback

## Next Session Checklist

When continuing in a new Claude session:

1. Open this document first: `/packages/plugin-system/IMPLEMENTATION_PLAN.md`
2. Review current code in `/packages/plugin-system/src/`
3. Start with Phase 1: Validation
4. Reference the examples above for implementation patterns
5. Check `/packages/plugin-system/COMPARISON.md` for architecture details

The plugin system is ready for validation and integration. The next session
should focus on building, testing, and creating the integration prototype.

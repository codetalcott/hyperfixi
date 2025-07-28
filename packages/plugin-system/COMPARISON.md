# Plugin System Architecture Comparison

## Current Hyperfixi Architecture

```typescript
// Direct imports and exports
import { createDefFeature } from './features/enhanced-def';
import { createOnFeature } from './features/on';

// Static registration
export {
  TypedDefFeatureImplementation,
  createDefFeature,
  TypedOnFeatureImplementation,
  createOnFeature,
  // ... more exports
};
```

**Characteristics:**
- Build-time module resolution
- Tree-shakeable imports
- Strong type safety
- Static dependency graph
- Predictable bundle sizes

## Datastar-Inspired Plugin Architecture

```typescript
// Plugin definition
const OnPlugin: AttributePlugin = {
  type: 'attribute',
  name: 'on',
  keyReq: 'must',
  onLoad: (ctx) => {
    // Implementation
  }
};

// Dynamic registration
pluginRegistry.load(OnPlugin, BindPlugin, ShowPlugin);
pluginRegistry.apply();
```

**Characteristics:**
- Runtime plugin registration
- Dynamic feature composition
- Flexible bundle creation
- Plugin discovery via patterns
- Easier third-party extensions

## Benefits of Plugin System for Hyperfixi

### 1. **Dynamic Feature Loading**
```typescript
// Load features based on page requirements
if (needsAdvancedFeatures) {
  pluginRegistry.load(WebSocketPlugin, WebWorkerPlugin);
}
```

### 2. **Custom Bundles**
```typescript
// minimal.bundle.js - 15KB
load(OnPlugin, TogglePlugin);

// standard.bundle.js - 25KB  
load(OnPlugin, TogglePlugin, FetchPlugin, StatePlugin);

// full.bundle.js - 40KB
load(...allPlugins);
```

### 3. **Third-Party Extensions**
```typescript
// Easy for users to add custom commands
const CustomPlugin: CommandPlugin = {
  type: 'command',
  name: 'animate',
  pattern: /^animate\s+/,
  execute: async (ctx) => { /* ... */ }
};

pluginRegistry.load(CustomPlugin);
```

### 4. **Feature Discovery**
```typescript
// Automatically match attributes to plugins
// data-on-click → OnPlugin
// data-fetch → FetchPlugin
// data-intersect → IntersectionPlugin
```

## Implementation Strategy

### Phase 1: Parallel Systems
- Keep existing module exports
- Add plugin registry alongside
- Test with select features

### Phase 2: Migration
- Convert features to plugins one by one
- Maintain backward compatibility
- Add plugin wrappers for existing features

### Phase 3: Optimization
- Remove duplicate code
- Optimize plugin loading
- Enhanced tree-shaking for plugins

### Phase 4: Full Adoption
- Deprecate old system
- Plugin-first architecture
- Dynamic import() for code splitting

## Code Example: Migration

### Before (Current)
```typescript
import { hyperscript } from '@hyperfixi/core';
import { createOnFeature } from '@hyperfixi/core/features/on';

const hs = hyperscript();
hs.addFeature(createOnFeature());
```

### After (Plugin System)
```typescript
import { pluginRegistry } from '@hyperfixi/plugin-system';
import { OnCommandPlugin } from '@hyperfixi/plugins';

pluginRegistry.load(OnCommandPlugin);
pluginRegistry.apply();
```

## Performance Considerations

1. **Bundle Size**: Plugin system adds ~3KB overhead
2. **Runtime Cost**: Minimal - pattern matching is fast
3. **Memory**: Cleanup functions prevent leaks
4. **Startup**: Lazy initialization possible

## Conclusion

The plugin system offers flexibility without sacrificing Hyperfixi's core strengths. It enables:
- Smaller initial bundles
- Progressive enhancement
- Easier community contributions
- Better runtime adaptability

While keeping:
- Type safety (via TypeScript interfaces)
- Performance (minimal overhead)
- Developer experience (clear APIs)

/**
 * Plugin System for Hyperfixi
 * Main exports with performance optimizations
 */

// Import for local use first
import { optimizedRegistry } from './optimized-registry';
import { createHybridLoader } from './hybrid-loader';
import type { Plugin } from './types';

// Core types
export * from './types';
export * from './typed';

// Registries
export { HyperfixiPluginRegistry } from './registry';
export { OptimizedPluginRegistry, optimizedRegistry } from './optimized-registry';

// Plugin definitions
export * from './plugins/commands';
export * from './plugins/features';
export * from './plugins/typed-commands';

// Advanced features
export { HybridPluginLoader, createHybridLoader } from './hybrid-loader';
export { PluginAnalyzer, optimizePluginsForBuild } from './compiler/analyzer';
export { PluginBundleBuilder, buildBundles } from './compiler/bundle-builder';

// Error handling
export {
  PluginSystemError,
  PluginLoadError,
  PluginExecutionError,
  PluginDependencyError,
  PluginRegistrationError,
  PluginInitError,
  PluginParseError,
  ErrorCodes,
  isPluginSystemError,
  isPluginError,
  wrapError,
} from './errors';
export type { ErrorCode } from './errors';

// Integration bridges
export {
  ParserBridge,
  createParserBridge,
  tokenize,
  type ExtendedParseContext,
  type ParserBridgeConfig,
  type PluginRegistration,
} from './integration';

// Default export is the optimized registry
export default optimizedRegistry;

/**
 * Quick start function
 */

export function initializeHyperfixi(options?: {
  plugins?: Plugin[];
  autoApply?: boolean;
  enableDynamicLoading?: boolean;
}) {
  const { 
    plugins = [], 
    autoApply = true,
    enableDynamicLoading = false 
  } = options || {};

  // Load provided plugins
  if (plugins.length > 0) {
    optimizedRegistry.load(...plugins);
  }

  // Setup dynamic loading if enabled
  if (enableDynamicLoading) {
    const loader = createHybridLoader();
    loader.setupDynamicLoading();
  }

  // Auto-apply to DOM
  if (autoApply && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        optimizedRegistry.apply();
      });
    } else {
      optimizedRegistry.apply();
    }
  }

  return optimizedRegistry;
}

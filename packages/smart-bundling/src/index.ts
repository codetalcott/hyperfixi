/**
 * HyperFixi Smart Bundling
 * Intelligent bundling system based on usage patterns and performance optimization
 */

// Export main classes
export { UsageAnalyzer } from './analyzer';
export { BundleOptimizer, FileBundleCache } from './optimizer';
export { SmartBundler, quickBundle, productionBundle } from './bundler';

// Export types
export * from './types';

// Export quick start functions
export { quickStartSmartBundling, createOptimizedConfig, analyzeProjectUsage } from './quick-start';

// Version
export const version = '0.1.0';

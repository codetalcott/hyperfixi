/**
 * Plugin System for Hyperfixi
 * Main exports
 */

export * from './types';
export * from './registry';
export * from './plugins/commands';
export * from './plugins/features';

// Re-export main registry instance
export { pluginRegistry } from './registry';

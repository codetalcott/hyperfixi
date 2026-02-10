/**
 * HyperFixi Component Schema - Universal component definition and validation
 */

// Export all types
export * from './types';

// Export validation functionality
export * from './validator';

// Export registry functionality
export * from './registry';

// Export utility functions
export * from './utils';

// Export database functionality
export { SqliteComponentRegistry } from './database/sqlite-registry';
export {
  getDatabase,
  closeDatabase,
  resetConnection,
  isConnected,
  getCurrentDbPath,
  getDefaultDbPath,
} from './database/connection';
export { initializeSchema, isSchemaInitialized, dropSchema, SCHEMA } from './database/schema';

// Version information
export const VERSION = '0.2.0';

// Re-export commonly used functions for convenience
export { validateComponent, validateCollection, validator } from './validator';

export { createRegistry, FileComponentRegistry, MemoryComponentRegistry } from './registry';
export type { RegistryOptions } from './registry';

export {
  createComponent,
  createTemplatedComponent,
  createCollection,
  createExample,
  mergeComponents,
  extractTemplateVariables,
  analyzeComplexity,
  generateMetadata,
} from './utils';

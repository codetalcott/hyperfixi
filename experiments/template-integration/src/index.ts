/**
 * HyperFixi Template Integration
 *
 * Template compiler that processes embedded hyperscript with component integration
 */

// Core exports
export { TemplateParser } from './parser';
export { TemplateCompiler } from './compiler';
export {
  LokaScriptTemplateEngine,
  templateEngine,
  compileTemplate,
  renderTemplate,
  createTemplateEngine,
} from './engine';

// Type exports
export type {
  TemplateOptions,
  TemplateContext,
  TemplateNode,
  TemplateDirective,
  CompilationResult,
  CompilationWarning,
  HyperscriptBlock,
  ComponentInstance,
  TemplateBundle,
  CacheEntry,
  TemplateError,
  TemplateEngine,
  DirectiveHandler,
  SourceMap,
} from './types';

// Utility functions
export * from './utils';

// Version
export const VERSION = '0.1.0';

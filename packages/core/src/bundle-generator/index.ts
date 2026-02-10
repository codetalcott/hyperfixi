/**
 * Bundle Generator
 *
 * Public API for generating minimal HyperFixi bundles.
 *
 * NOTE: Generated bundles require HybridParser for runtime AST interpretation.
 * The parser is imported from '../parser/hybrid' by default. This is intentional -
 * bundles interpret hyperscript at runtime and need the parser to convert
 * `_="..."` attributes to AST.
 *
 * @example
 * ```typescript
 * import { generateBundle, generateBundleCode, getAvailableCommands } from '@hyperfixi/core/bundle-generator';
 *
 * // Generate bundle with metadata
 * const result = generateBundle({
 *   name: 'MyApp',
 *   commands: ['toggle', 'add', 'remove'],
 *   blocks: ['if', 'repeat'],
 *   positionalExpressions: true,
 * });
 *
 * console.log(result.code);        // Generated TypeScript code
 * console.log(result.warnings);    // Any warnings about unknown commands
 *
 * // Just generate code
 * const code = generateBundleCode({
 *   name: 'Minimal',
 *   commands: ['toggle'],
 *   parserImportPath: './parser/hybrid',
 * });
 *
 * // List available commands and blocks
 * console.log(getAvailableCommands()); // ['toggle', 'add', 'remove', ...]
 * console.log(getAvailableBlocks());   // ['if', 'repeat', 'for', 'while', 'fetch']
 * ```
 */

// Types
export type {
  BundleConfig,
  GeneratorOptions,
  GeneratedBundle,
  ValidationOptions,
  ValidationError,
} from './types';

// Generator functions
export { generateBundle, generateBundleCode } from './generator';

// Templates (for advanced use cases)
export {
  COMMAND_IMPLEMENTATIONS,
  BLOCK_IMPLEMENTATIONS,
  STYLE_COMMANDS,
  ELEMENT_ARRAY_COMMANDS,
  MORPH_COMMANDS,
  getAvailableCommands,
  getAvailableBlocks,
  getCommandImplementations,
  getBlockImplementations,
  type CodeFormat,
} from './templates';

// Parser templates (for tree-shakeable bundle generation)
export {
  LITE_PARSER_TEMPLATE,
  HYBRID_PARSER_TEMPLATE,
  getParserTemplate,
  canUseLiteParser,
  LITE_PARSER_COMMANDS,
} from './parser-templates';

// Template capabilities (what's available in lite vs full runtime)
export {
  AVAILABLE_COMMANDS,
  AVAILABLE_BLOCKS,
  FULL_RUNTIME_ONLY_COMMANDS,
  isAvailableCommand,
  isAvailableBlock,
  requiresFullRuntime,
  type AvailableCommand,
  type AvailableBlock,
  type FullRuntimeOnlyCommand,
} from './template-capabilities';

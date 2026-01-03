/**
 * Bundle Generator
 *
 * Public API for generating minimal HyperFixi bundles.
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
export type { BundleConfig, GeneratorOptions, GeneratedBundle } from './types';

// Generator functions
export { generateBundle, generateBundleCode } from './generator';

// Templates (for advanced use cases)
export {
  COMMAND_IMPLEMENTATIONS,
  BLOCK_IMPLEMENTATIONS,
  STYLE_COMMANDS,
  ELEMENT_ARRAY_COMMANDS,
  getAvailableCommands,
  getAvailableBlocks,
  getCommandImplementations,
  getBlockImplementations,
  type CodeFormat,
} from './templates';

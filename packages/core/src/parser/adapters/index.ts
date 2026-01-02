/**
 * Parser Adapters Index
 *
 * Central export point for all parser adapters.
 * Enables tree-shakeable parser selection at build time.
 *
 * Usage:
 * ```typescript
 * // Import only what you need (tree-shakeable)
 * import { createStandardParser } from './adapters';
 * const parser = createStandardParser();
 *
 * // Or use the factory for runtime selection
 * import { createParser } from './adapters';
 * const parser = createParser('standard');
 * ```
 */

// Re-export types and interfaces
export type {
  ParserAdapter,
  ParseResult,
  ParserCapabilities,
  StandardCommand,
  LiteCommand,
} from './parser-adapter';

// Re-export capability presets
export {
  STANDARD_CAPABILITIES,
  FULL_CAPABILITIES,
  LITE_CAPABILITIES,
  STANDARD_COMMANDS,
  LITE_COMMANDS,
} from './parser-adapter';

// Re-export parser implementations
export { StandardParser, createStandardParser } from './parser-standard';
export { FullParser, createFullParser } from './parser-full';

// Import for factory
import type { ParserAdapter } from './parser-adapter';
import { createStandardParser } from './parser-standard';
import { createFullParser } from './parser-full';

/**
 * Parser tier options
 */
export type ParserTier = 'standard' | 'full';

/**
 * Parser factory options
 */
export interface CreateParserOptions {
  /**
   * Parser tier to use
   * - 'standard': ~1,000 lines, 22 commands, expressions, blocks (~6-8 KB)
   * - 'full': ~3,860 lines, 43+ commands, behaviors, defs, i18n (~15-20 KB)
   */
  tier: ParserTier;
}

/**
 * Create a parser instance of the specified tier
 *
 * This factory enables runtime parser selection. For build-time
 * tree-shaking, import the specific createXxxParser function directly.
 *
 * @param tier - Parser tier: 'standard' | 'full'
 * @returns ParserAdapter instance
 *
 * @example
 * ```typescript
 * // Runtime selection (no tree-shaking)
 * const parser = createParser('standard');
 *
 * // Build-time selection (tree-shakeable)
 * import { createStandardParser } from './adapters';
 * const parser = createStandardParser();
 * ```
 */
export function createParser(tier: ParserTier): ParserAdapter {
  switch (tier) {
    case 'standard':
      return createStandardParser();
    case 'full':
      return createFullParser();
    default:
      throw new Error(`Unknown parser tier: ${tier}`);
  }
}

/**
 * Get information about available parser tiers
 */
export function getParserTierInfo(): Record<
  ParserTier,
  {
    name: string;
    commands: number;
    features: string[];
    estimatedSize: string;
  }
> {
  return {
    standard: {
      name: 'Standard Parser',
      commands: 22,
      features: [
        'Full expression parser',
        'Block commands (if/for/while/repeat/fetch)',
        'Event modifiers (.once, .prevent, .debounce, .throttle)',
        'Positional expressions (first, last, next, previous)',
        'Function calls and method chaining',
      ],
      estimatedSize: '~6-8 KB gzip',
    },
    full: {
      name: 'Full Parser',
      commands: 43,
      features: [
        'All standard features',
        'Behavior definitions',
        'Function definitions (def)',
        'Semantic i18n integration',
        'htmx-like commands (swap, morph, push, replace)',
        'Advanced async commands',
      ],
      estimatedSize: '~15-20 KB gzip',
    },
  };
}

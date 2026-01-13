/**
 * HyperFixi Semantic Complete Browser Bundle
 *
 * Single-script deployment bundle that inlines @hyperfixi/semantic.
 * No additional script tags required - everything in one file.
 *
 * This bundle provides:
 *   - Full semantic parsing (13 languages)
 *   - All 43 commands
 *   - Translation between languages
 *   - Direct semantic->AST->execute path
 *
 * Use case: Single-script deployments where loading multiple scripts is impractical.
 *
 * Input (any language) -> Semantic Parser -> AST Builder -> Runtime Execute
 *
 * Commands included (43 - all commands):
 * - DOM (7): hide, show, add, remove, toggle, put, make
 * - Async (2): wait, fetch
 * - Data (7): set, get, increment, decrement, bind, default, persist
 * - Events (2): trigger, send
 * - Navigation (1): go
 * - Control Flow (9): if, repeat, break, continue, halt, return, exit, unless, throw
 * - Execution (2): call, pseudo-command
 * - Content (1): append
 * - Animation (4): transition, measure, settle, take
 * - Advanced (2): js, async
 * - Utility (5): log, tell, copy, pick, beep
 * - Behaviors (1): install
 * - Templates (1): render
 *
 * Supported languages (13): en, ja, ar, es, ko, zh, tr, pt, fr, de, id, qu, sw
 *
 * Expected size: ~450-500 KB (runtime + semantic parser combined)
 */

import { createMinimalRuntime } from '../runtime/runtime-experimental';
import { createContext, ensureContext } from '../core/context';
import type { ASTNode } from '../types/base-types';

// Import ALL V2 commands (43 commands total)
// DOM Commands (7)
import { createHideCommand } from '../commands/dom/hide';
import { createShowCommand } from '../commands/dom/show';
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createMakeCommand } from '../commands/dom/make';

// Async Commands (2)
import { createWaitCommand } from '../commands/async/wait';
import { createFetchCommand } from '../commands/async/fetch';

// Data Commands (7)
import { createSetCommand } from '../commands/data/set';
import { createGetCommand } from '../commands/data/get';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';
import { createBindCommand } from '../commands/data/bind';
import { createDefaultCommand } from '../commands/data/default';
import { createPersistCommand } from '../commands/data/persist';

// Event Commands (2)
import { createTriggerCommand } from '../commands/events/trigger';
import { createSendCommand } from '../commands/events/send';

// Navigation Commands (1)
import { createGoCommand } from '../commands/navigation/go';

// Control Flow Commands (9)
import { createIfCommand } from '../commands/control-flow/if';
import { createRepeatCommand } from '../commands/control-flow/repeat';
import { createBreakCommand } from '../commands/control-flow/break';
import { createContinueCommand } from '../commands/control-flow/continue';
import { createHaltCommand } from '../commands/control-flow/halt';
import { createReturnCommand } from '../commands/control-flow/return';
import { createExitCommand } from '../commands/control-flow/exit';
import { createUnlessCommand } from '../commands/control-flow/unless';
import { createThrowCommand } from '../commands/control-flow/throw';

// Execution Commands (2)
import { createCallCommand } from '../commands/execution/call';
import { createPseudoCommand } from '../commands/execution/pseudo-command';

// Content Commands (1)
import { createAppendCommand } from '../commands/content/append';

// Animation Commands (4)
import { createTransitionCommand } from '../commands/animation/transition';
import { createMeasureCommand } from '../commands/animation/measure';
import { createSettleCommand } from '../commands/animation/settle';
import { createTakeCommand } from '../commands/animation/take';

// Advanced Commands (2)
import { createJsCommand } from '../commands/advanced/js';
import { createAsyncCommand } from '../commands/advanced/async';

// Utility Commands (5)
import { createLogCommand } from '../commands/utility/log';
import { createTellCommand } from '../commands/utility/tell';
import { createCopyCommand } from '../commands/utility/copy';
import { createPickCommand } from '../commands/utility/pick';
import { createBeepCommand } from '../commands/utility/beep';

// Behaviors (1)
import { createInstallCommand } from '../commands/behaviors/install';

// Templates (1)
import { createRenderCommand } from '../commands/templates/render';

// =============================================================================
// INLINE SEMANTIC MODULE (not external - bundled directly)
// =============================================================================

import {
  createSemanticAnalyzer,
  buildAST,
  translate as semanticTranslate,
  getAllTranslations as semanticGetAllTranslations,
  parse as semanticParse,
  tokenize,
  getTokenizer,
  isLanguageSupported,
  VERSION as SEMANTIC_VERSION,
  getSupportedLanguages,
} from '@hyperfixi/semantic';

// =============================================================================
// Runtime Configuration
// =============================================================================

const SUPPORTED_COMMANDS = [
  // DOM (7)
  'hide',
  'show',
  'add',
  'remove',
  'toggle',
  'put',
  'make',
  // Async (2)
  'wait',
  'fetch',
  // Data (7)
  'set',
  'get',
  'increment',
  'decrement',
  'bind',
  'default',
  'persist',
  // Events (2)
  'trigger',
  'send',
  // Navigation (1)
  'go',
  // Control Flow (9)
  'if',
  'repeat',
  'break',
  'continue',
  'halt',
  'return',
  'exit',
  'unless',
  'throw',
  // Execution (2)
  'call',
  'pseudo-command',
  // Content (1)
  'append',
  // Animation (4)
  'transition',
  'measure',
  'settle',
  'take',
  // Advanced (2)
  'js',
  'async',
  // Utility (5)
  'log',
  'tell',
  'copy',
  'pick',
  'beep',
  // Behaviors (1)
  'install',
  // Templates (1)
  'render',
] as const;

const SUPPORTED_LANGUAGES = [
  'en',
  'ja',
  'ar',
  'es',
  'ko',
  'zh',
  'tr',
  'pt',
  'fr',
  'de',
  'id',
  'qu',
  'sw',
] as const;

// Create runtime with ALL 43 commands
const runtime = createMinimalRuntime(
  [
    // DOM (7)
    createHideCommand(),
    createShowCommand(),
    createAddCommand(),
    createRemoveCommand(),
    createToggleCommand(),
    createPutCommand(),
    createMakeCommand(),
    // Async (2)
    createWaitCommand(),
    createFetchCommand(),
    // Data (7)
    createSetCommand(),
    createGetCommand(),
    createIncrementCommand(),
    createDecrementCommand(),
    createBindCommand(),
    createDefaultCommand(),
    createPersistCommand(),
    // Events (2)
    createTriggerCommand(),
    createSendCommand(),
    // Navigation (1)
    createGoCommand(),
    // Control Flow (9)
    createIfCommand(),
    createRepeatCommand(),
    createBreakCommand(),
    createContinueCommand(),
    createHaltCommand(),
    createReturnCommand(),
    createExitCommand(),
    createUnlessCommand(),
    createThrowCommand(),
    // Execution (2)
    createCallCommand(),
    createPseudoCommand(),
    // Content (1)
    createAppendCommand(),
    // Animation (4)
    createTransitionCommand(),
    createMeasureCommand(),
    createSettleCommand(),
    createTakeCommand(),
    // Advanced (2)
    createJsCommand(),
    createAsyncCommand(),
    // Utility (5)
    createLogCommand(),
    createTellCommand(),
    createCopyCommand(),
    createPickCommand(),
    createBeepCommand(),
    // Behaviors (1)
    createInstallCommand(),
    // Templates (1)
    createRenderCommand(),
  ],
  {
    expressionPreload: 'all', // Load all expressions for full compatibility
  }
);

// Pre-create analyzer for synchronous API
const analyzer = createSemanticAnalyzer();

// =============================================================================
// API
// =============================================================================

/**
 * Semantic Complete HyperFixi API
 *
 * Single-script deployment with semantic parsing inlined.
 * No external dependencies required.
 */
const api = {
  /**
   * Parse and execute hyperscript in any supported language.
   * Uses direct semantic->AST path (synchronous parsing).
   *
   * @param code - Hyperscript code in any supported language
   * @param lang - Language code (en, ja, ar, es, ko, zh, tr, pt, fr, de, id, qu, sw)
   * @param context - Optional execution context
   * @returns Promise resolving to execution result
   *
   * @example
   * // Korean
   * await hyperfixi.execute('토글 .active', 'ko');
   *
   * // Japanese
   * await hyperfixi.execute('トグル .active', 'ja');
   *
   * // Spanish
   * await hyperfixi.execute('alternar .active', 'es');
   */
  async execute(code: string, lang: string, context?: any): Promise<any> {
    const result = analyzer.analyze(code, lang);

    if (result.confidence < 0.5 || !result.node) {
      throw new Error(
        `Failed to parse "${code}" in language "${lang}" (confidence: ${result.confidence.toFixed(2)})`
      );
    }

    const buildResult = buildAST(result.node);
    const ctx = ensureContext(context);
    return runtime.execute(buildResult.ast as unknown as ASTNode, ctx);
  },

  /**
   * Parse hyperscript to AST without executing.
   * Returns null if parsing fails.
   *
   * @param code - Hyperscript code in any supported language
   * @param lang - Language code
   * @returns AST node or null (synchronous)
   */
  parse(code: string, lang: string): ASTNode | null {
    const result = analyzer.analyze(code, lang);

    if (result.confidence < 0.5 || !result.node) {
      return null;
    }

    const buildResult = buildAST(result.node);
    return buildResult.ast as unknown as ASTNode;
  },

  /**
   * Translate hyperscript between languages.
   *
   * @param code - Hyperscript code
   * @param sourceLang - Source language code
   * @param targetLang - Target language code
   * @returns Translated code (synchronous)
   */
  translate(code: string, sourceLang: string, targetLang: string): string {
    return semanticTranslate(code, sourceLang, targetLang);
  },

  /**
   * Get all translations for a piece of hyperscript.
   *
   * @param code - Hyperscript code
   * @param sourceLang - Source language code
   * @returns Object with all translations (synchronous)
   */
  getAllTranslations(code: string, sourceLang: string): Record<string, string> {
    return semanticGetAllTranslations(code, sourceLang);
  },

  /**
   * Tokenize input for a specific language.
   *
   * @param code - Input code
   * @param lang - Language code
   * @returns Array of tokens
   */
  tokenize(code: string, lang: string) {
    return tokenize(code, lang);
  },

  /**
   * Check if a language is supported.
   *
   * @param lang - Language code
   * @returns true if supported
   */
  isLanguageSupported(lang: string): boolean {
    return isLanguageSupported(lang);
  },

  /**
   * Get the tokenizer for a specific language.
   *
   * @param lang - Language code
   * @returns Language tokenizer or undefined
   */
  getTokenizer(lang: string) {
    return getTokenizer(lang);
  },

  /**
   * Create a new execution context.
   */
  createContext,

  /**
   * The underlying runtime instance.
   * Use for advanced operations.
   */
  runtime,

  /**
   * The semantic analyzer instance.
   * Use for advanced parsing operations.
   */
  analyzer,

  /**
   * Bundle version
   */
  version: '1.0.0-semantic-complete',

  /**
   * Semantic parser version (inlined)
   */
  semanticVersion: SEMANTIC_VERSION,

  /**
   * List of supported commands in this bundle.
   */
  commands: SUPPORTED_COMMANDS,

  /**
   * List of supported languages.
   */
  supportedLanguages: SUPPORTED_LANGUAGES,

  /**
   * Get list of supported languages (from semantic module).
   */
  getSupportedLanguages,

  /**
   * Bundle type identifier
   */
  bundleType: 'semantic-complete' as const,
};

// =============================================================================
// Global Export
// =============================================================================

if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;
}

export default api;
export { api as hyperfixi };

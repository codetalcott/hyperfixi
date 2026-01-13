/**
 * HyperFixi Multilingual Browser Bundle
 *
 * Parser-free bundle for developers writing hyperscript in their native language.
 * Uses @hyperfixi/semantic for parsing, bypasses core parser entirely.
 *
 * This bundle is optimized for the multilingual use case:
 *   Input (any language) → Semantic Parser → AST Builder → Runtime Execute
 *
 * The core parser (~240 KB) is completely excluded since it's only used as a
 * fallback when semantic parsing fails. For confident semantic parses (>0.5),
 * the direct path is used.
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
 * Actual size: ~251 KB (vs 663 KB full bundle) - 62% savings from parser removal
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

// NO PARSER IMPORT - uses @hyperfixi/semantic package instead

// =============================================================================
// Semantic Module Access (from browser global)
// =============================================================================

// In browser environment, use the already-loaded HyperFixiSemantic global
function getSemanticModule(): typeof import('@hyperfixi/semantic') {
  if (typeof window !== 'undefined' && (window as any).HyperFixiSemantic) {
    return (window as any).HyperFixiSemantic;
  }
  throw new Error(
    'HyperFixiSemantic not found. Load the semantic bundle before the multilingual bundle:\n' +
      '<script src="hyperfixi-semantic.browser.global.js"></script>\n' +
      '<script src="hyperfixi-multilingual.js"></script>'
  );
}

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

// =============================================================================
// API
// =============================================================================

/**
 * Multilingual HyperFixi API
 *
 * Optimized for developers writing hyperscript in their native language.
 * No core parser - uses semantic parsing with direct AST path.
 */
const api = {
  /**
   * Parse and execute hyperscript in any supported language.
   * Uses direct semantic→AST path (no core parser).
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
    const semantic = getSemanticModule();
    const analyzer = semantic.createSemanticAnalyzer();
    const result = analyzer.analyze(code, lang);

    if (result.confidence < 0.5 || !result.node) {
      throw new Error(
        `Failed to parse "${code}" in language "${lang}" (confidence: ${result.confidence.toFixed(2)})`
      );
    }

    const buildResult = semantic.buildAST(result.node);
    const ctx = ensureContext(context);
    return runtime.execute(buildResult.ast as unknown as ASTNode, ctx);
  },

  /**
   * Parse hyperscript to AST without executing.
   * Returns null if parsing fails.
   *
   * @param code - Hyperscript code in any supported language
   * @param lang - Language code
   * @returns Promise resolving to AST node or null
   */
  parse(code: string, lang: string): ASTNode | null {
    const semantic = getSemanticModule();
    const analyzer = semantic.createSemanticAnalyzer();
    const result = analyzer.analyze(code, lang);

    if (result.confidence < 0.5 || !result.node) {
      return null;
    }

    const buildResult = semantic.buildAST(result.node);
    return buildResult.ast as unknown as ASTNode;
  },

  /**
   * Translate hyperscript between languages.
   *
   * @param code - Hyperscript code
   * @param sourceLang - Source language code
   * @param targetLang - Target language code
   * @returns Promise resolving to translated code
   */
  translate(code: string, sourceLang: string, targetLang: string): string {
    const semantic = getSemanticModule();
    return semantic.translate(code, sourceLang, targetLang);
  },

  /**
   * Get all translations for a piece of hyperscript.
   *
   * @param code - Hyperscript code
   * @param sourceLang - Source language code
   * @returns Promise resolving to object with all translations
   */
  getAllTranslations(code: string, sourceLang: string): Record<string, string> {
    const semantic = getSemanticModule();
    return semantic.getAllTranslations(code, sourceLang);
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
   * Bundle version
   */
  version: '1.0.0-multilingual',

  /**
   * List of supported commands in this bundle.
   */
  commands: SUPPORTED_COMMANDS,

  /**
   * List of supported languages.
   */
  supportedLanguages: SUPPORTED_LANGUAGES,

  /**
   * Bundle type identifier
   */
  bundleType: 'multilingual' as const,
};

// =============================================================================
// Global Export
// =============================================================================

if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;
}

export default api;
export { api as hyperfixi };

/**
 * HyperFixi Classic Browser Bundle with i18n Support
 *
 * Combines the classic _hyperscript runtime (37 commands) with full
 * internationalization support including:
 * - 12 language keyword providers (es, ja, fr, de, ar, ko, zh, tr, id, pt, qu, sw)
 * - Automatic browser locale detection
 * - Runtime locale switching
 * - Grammar transformation for native word order display
 *
 * Usage:
 * ```html
 * <script src="hyperfixi-browser-classic-i18n.js"></script>
 * <script>
 *   // Auto-detects browser locale, or set manually:
 *   hyperfixi.i18n.setLocale('ja');
 *
 *   // Write hyperscript in Japanese
 *   // クリック で #count を 増加
 * </script>
 * ```
 *
 * Size: ~400 KB uncompressed (~105 KB gzipped)
 */

import { parse } from '../parser/parser';
import { createMinimalRuntime } from '../runtime/runtime-experimental';
import { createMinimalAttributeProcessor } from '../dom/minimal-attribute-processor';
import { createContext, ensureContext } from '../core/context';
import type { KeywordResolver } from '../parser/types';

// ============================================================================
// Expression Categories (for ConfigurableExpressionEvaluator)
// ============================================================================
import { ConfigurableExpressionEvaluator } from '../core/configurable-expression-evaluator';
import { referencesExpressions } from '../expressions/references/index';
import { logicalExpressions } from '../expressions/logical/index';
import { specialExpressions } from '../expressions/special/index';
import { propertiesExpressions } from '../expressions/properties/index';
import { conversionExpressions } from '../expressions/conversion/index';
import { positionalExpressions } from '../expressions/positional/index';

// ============================================================================
// DOM Commands (7)
// ============================================================================
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createHideCommand } from '../commands/dom/hide';
import { createShowCommand } from '../commands/dom/show';
import { createMakeCommand } from '../commands/dom/make';

// ============================================================================
// Control Flow Commands (9)
// ============================================================================
import { createIfCommand } from '../commands/control-flow/if';
import { createUnlessCommand } from '../commands/control-flow/unless';
import { createRepeatCommand } from '../commands/control-flow/repeat';
import { createBreakCommand } from '../commands/control-flow/break';
import { createContinueCommand } from '../commands/control-flow/continue';
import { createHaltCommand } from '../commands/control-flow/halt';
import { createReturnCommand } from '../commands/control-flow/return';
import { createExitCommand } from '../commands/control-flow/exit';
import { createThrowCommand } from '../commands/control-flow/throw';

// ============================================================================
// Data Commands (5)
// ============================================================================
import { createSetCommand } from '../commands/data/set';
import { createGetCommand } from '../commands/data/get';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';
import { createDefaultCommand } from '../commands/data/default';

// ============================================================================
// Async Commands (2)
// ============================================================================
import { createWaitCommand } from '../commands/async/wait';
import { createFetchCommand } from '../commands/async/fetch';

// ============================================================================
// Event Commands (2)
// ============================================================================
import { createTriggerCommand } from '../commands/events/trigger';
import { createSendCommand } from '../commands/events/send';

// ============================================================================
// Animation Commands (4)
// ============================================================================
import { createTransitionCommand } from '../commands/animation/transition';
import { createMeasureCommand } from '../commands/animation/measure';
import { createSettleCommand } from '../commands/animation/settle';
import { createTakeCommand } from '../commands/animation/take';

// ============================================================================
// Utility Commands (6)
// ============================================================================
import { createLogCommand } from '../commands/utility/log';
import { createTellCommand } from '../commands/utility/tell';
import { createCallCommand } from '../commands/execution/call';
import { createCopyCommand } from '../commands/utility/copy';
import { createPickCommand } from '../commands/utility/pick';
import { createBeepCommand } from '../commands/utility/beep';

// ============================================================================
// Advanced Commands (2)
// ============================================================================
import { createJsCommand } from '../commands/advanced/js';
import { createAsyncCommand } from '../commands/advanced/async';

// ============================================================================
// Navigation Commands (1)
// ============================================================================
import { createGoCommand } from '../commands/navigation/go';

// ============================================================================
// Special Commands (4)
// ============================================================================
import { createInstallCommand } from '../commands/behaviors/install';
import { createAppendCommand } from '../commands/content/append';
import { createRenderCommand } from '../commands/templates/render';
import { createPseudoCommand } from '../commands/execution/pseudo-command';

// ============================================================================
// i18n Imports
// ============================================================================

// Keyword providers for each supported locale
// Types declared in src/types.d.ts for bundler-resolved module
import {
  esKeywords,
  jaKeywords,
  frKeywords,
  deKeywords,
  arKeywords,
  koKeywords,
  zhKeywords,
  trKeywords,
  idKeywords,
  ptKeywords,
  quKeywords,
  swKeywords,
  createKeywordProvider,
  createEnglishProvider,
  LocaleManager,
  detectBrowserLocale,
  // Grammar transformation
  GrammarTransformer,
  toLocale,
  toEnglish,
  translate,
  profiles,
  getProfile,
  getSupportedLocales,
  // Dictionaries for custom providers
  es as esDictionary,
  ja as jaDictionary,
  fr as frDictionary,
  de as deDictionary,
  ar as arDictionary,
  ko as koDictionary,
  zh as zhDictionary,
  tr as trDictionary,
  id as idDictionary,
  pt as ptDictionary,
  qu as quDictionary,
  sw as swDictionary,
} from '@hyperfixi/i18n/browser';

// ============================================================================
// i18n Setup - Register all locale providers
// ============================================================================

// Register all built-in locale providers (12 languages + English)
LocaleManager.register('en', createEnglishProvider());
LocaleManager.register('es', esKeywords);
LocaleManager.register('ja', jaKeywords);
LocaleManager.register('fr', frKeywords);
LocaleManager.register('de', deKeywords);
LocaleManager.register('ar', arKeywords);
LocaleManager.register('ko', koKeywords);
LocaleManager.register('zh', zhKeywords);
LocaleManager.register('tr', trKeywords);
LocaleManager.register('id', idKeywords);
LocaleManager.register('pt', ptKeywords);
LocaleManager.register('qu', quKeywords);
LocaleManager.register('sw', swKeywords);

// Track current locale
let currentLocale = 'en';

/**
 * Get the current keyword resolver based on active locale
 */
function getCurrentKeywordResolver(): KeywordResolver | undefined {
  if (currentLocale === 'en') {
    return undefined; // No resolver needed for English
  }
  return LocaleManager.get(currentLocale);
}

// ============================================================================
// Runtime Setup
// ============================================================================

// Create ConfigurableExpressionEvaluator with all 6 expression categories
const expressionEvaluator = new ConfigurableExpressionEvaluator([
  referencesExpressions,
  logicalExpressions,
  specialExpressions,
  propertiesExpressions,
  conversionExpressions,
  positionalExpressions,
]);

// Create runtime instance with classic commands (37 total)
const runtimeExperimental = createMinimalRuntime(
  [
    // DOM (7)
    createAddCommand(),
    createRemoveCommand(),
    createToggleCommand(),
    createPutCommand(),
    createHideCommand(),
    createShowCommand(),
    createMakeCommand(),

    // Control Flow (9)
    createIfCommand(),
    createUnlessCommand(),
    createRepeatCommand(),
    createBreakCommand(),
    createContinueCommand(),
    createHaltCommand(),
    createReturnCommand(),
    createExitCommand(),
    createThrowCommand(),

    // Data (5)
    createSetCommand(),
    createGetCommand(),
    createIncrementCommand(),
    createDecrementCommand(),
    createDefaultCommand(),

    // Async (2)
    createWaitCommand(),
    createFetchCommand(),

    // Events (2)
    createTriggerCommand(),
    createSendCommand(),

    // Animation (4)
    createTransitionCommand(),
    createMeasureCommand(),
    createSettleCommand(),
    createTakeCommand(),

    // Utility (6)
    createLogCommand(),
    createTellCommand(),
    createCallCommand(),
    createCopyCommand(),
    createPickCommand(),
    createBeepCommand(),

    // Advanced (2)
    createJsCommand(),
    createAsyncCommand(),

    // Navigation (1)
    createGoCommand(),

    // Special (4)
    createInstallCommand(),
    createAppendCommand(),
    createRenderCommand(),
    createPseudoCommand(),
  ],
  { expressionEvaluator }
);

// ============================================================================
// i18n-Aware Runtime Adapter
// ============================================================================

/**
 * Parse with locale-aware keyword resolution
 */
function parseWithLocale(code: string) {
  const keywords = getCurrentKeywordResolver();
  return parse(code, keywords ? { keywords } : undefined);
}

// Create adapter for MinimalAttributeProcessor
const runtimeAdapter = {
  parse: (code: string) => parseWithLocale(code),
  execute: async (code: string, context?: any) => {
    const ctx = ensureContext(context);
    const parseResult = parseWithLocale(code);
    if (!parseResult.success || !parseResult.node) {
      throw new Error(parseResult.error?.message || 'Parse failed');
    }
    return await runtimeExperimental.execute(parseResult.node, ctx);
  },
};

// Create minimal attribute processor with adapter
const attributeProcessor = createMinimalAttributeProcessor(runtimeAdapter);

// ============================================================================
// i18n API
// ============================================================================

const i18nApi = {
  /**
   * Get current locale
   */
  getLocale(): string {
    return currentLocale;
  },

  /**
   * Set active locale for parsing
   * @param locale - Locale code (e.g., 'es', 'ja', 'zh')
   */
  setLocale(locale: string): void {
    if (!LocaleManager.has(locale)) {
      console.warn(
        `Locale '${locale}' not registered. Available: ${LocaleManager.getAvailable().join(', ')}`
      );
      return;
    }
    currentLocale = locale;
    LocaleManager.setDefault(locale);

    // Update document attributes for RTL support
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale);
      const profile = getProfile(locale);
      if (profile?.direction === 'rtl') {
        document.documentElement.setAttribute('dir', 'rtl');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
      }
    }
  },

  /**
   * Get list of available locales
   */
  getAvailableLocales(): string[] {
    return LocaleManager.getAvailable();
  },

  /**
   * Detect browser locale and set if available
   * @returns The detected locale (or 'en' if not supported)
   */
  detectAndSetLocale(): string {
    if (typeof navigator === 'undefined') {
      return 'en';
    }

    // Get browser languages in order of preference
    const languages = navigator.languages || [navigator.language];

    for (const lang of languages) {
      // Extract the base language code (e.g., 'es-MX' -> 'es')
      const baseLocale = lang.split('-')[0].toLowerCase();

      if (LocaleManager.has(baseLocale)) {
        this.setLocale(baseLocale);
        return baseLocale;
      }
    }

    return 'en';
  },

  /**
   * Register a custom locale provider
   */
  registerLocale(locale: string, provider: KeywordResolver): void {
    LocaleManager.register(locale, provider as any);
  },

  /**
   * Transform hyperscript to display in target locale's native word order
   * @param code - English hyperscript code
   * @param targetLocale - Target locale (default: current locale)
   */
  toLocale(code: string, targetLocale?: string): string {
    return toLocale(code, targetLocale || currentLocale);
  },

  /**
   * Transform localized hyperscript to English
   * @param code - Localized hyperscript code
   * @param sourceLocale - Source locale (default: current locale)
   */
  toEnglish(code: string, sourceLocale?: string): string {
    return toEnglish(code, sourceLocale || currentLocale);
  },

  /**
   * Translate hyperscript between any two locales
   */
  translate,

  /**
   * Create a grammar transformer for advanced transformations
   */
  createTransformer(sourceLocale: string, targetLocale: string): GrammarTransformer {
    return new GrammarTransformer(sourceLocale, targetLocale);
  },

  /**
   * Get language profile for a locale
   */
  getProfile,

  /**
   * Get all supported locales for grammar transformation
   */
  getSupportedGrammarLocales: getSupportedLocales,

  /**
   * All language profiles
   */
  profiles,

  /**
   * Dictionaries for creating custom providers
   */
  dictionaries: {
    en: {}, // English is canonical, no dictionary needed
    es: esDictionary,
    ja: jaDictionary,
    fr: frDictionary,
    de: deDictionary,
    ar: arDictionary,
    ko: koDictionary,
    zh: zhDictionary,
    tr: trDictionary,
    id: idDictionary,
    pt: ptDictionary,
    qu: quDictionary,
    sw: swDictionary,
  },

  /**
   * Create a keyword provider from a dictionary
   */
  createKeywordProvider,
};

// ============================================================================
// API Export
// ============================================================================

const api = {
  runtime: runtimeAdapter,

  /**
   * Parse hyperscript code into AST (low-level)
   */
  parse: (code: string) => parseWithLocale(code),

  /**
   * Compile hyperscript code - returns { success, ast, errors }
   * Compatible with official _hyperscript compile() API
   */
  compile: (code: string) => {
    const startTime = performance.now();
    try {
      const result = parseWithLocale(code);
      return {
        success: result.success,
        ast: result.node,
        errors: result.error ? [result.error] : [],
        tokens: result.tokens || [],
        compilationTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        ast: undefined,
        errors: [
          { message: error instanceof Error ? error.message : String(error), line: 1, column: 1 },
        ],
        tokens: [],
        compilationTime: performance.now() - startTime,
      };
    }
  },

  /**
   * Execute hyperscript - accepts either code string OR compiled AST
   * This provides full compatibility with both usage patterns:
   * - execute(code, context) - simple one-step execution
   * - execute(ast, context) - execute pre-compiled AST
   */
  execute: async (codeOrAst: string | any, context?: any) => {
    const ctx = ensureContext(context);

    // If it's a string, parse and execute
    if (typeof codeOrAst === 'string') {
      const parseResult = parseWithLocale(codeOrAst);
      if (!parseResult.success || !parseResult.node) {
        throw new Error(parseResult.error?.message || 'Parse failed');
      }
      return await runtimeExperimental.execute(parseResult.node, ctx);
    }

    // If it's an AST node, execute directly
    if (codeOrAst && typeof codeOrAst === 'object') {
      return await runtimeExperimental.execute(codeOrAst, ctx);
    }

    throw new Error('execute() requires a code string or compiled AST');
  },

  /**
   * Run/evaluate hyperscript code (alias for execute with string)
   */
  run: async (code: string, context?: any) => {
    const ctx = ensureContext(context);
    const parseResult = parseWithLocale(code);
    if (!parseResult.success || !parseResult.node) {
      throw new Error(parseResult.error?.message || 'Parse failed');
    }
    return await runtimeExperimental.execute(parseResult.node, ctx);
  },

  /**
   * Alias for run() - matches official _hyperscript API
   */
  evaluate: async (code: string, context?: any) => {
    return api.run(code, context);
  },

  /**
   * Process a DOM node for _="" attributes (manual trigger)
   */
  processNode: (element: Element | Document) => {
    if (element === document) {
      attributeProcessor.scanAndProcessAll();
    } else if (element instanceof HTMLElement) {
      attributeProcessor.processElement(element);
    }
  },

  /**
   * Alias for processNode
   */
  process: (element: Element | Document) => api.processNode(element),

  createContext,
  attributeProcessor,
  version: '1.1.0-classic-i18n',

  // i18n API
  i18n: i18nApi,

  // Classic commands list (37)
  commands: [
    // DOM (7)
    'add',
    'remove',
    'toggle',
    'put',
    'hide',
    'show',
    'make',
    // Control Flow (9)
    'if',
    'unless',
    'repeat',
    'break',
    'continue',
    'halt',
    'return',
    'exit',
    'throw',
    // Data (5)
    'set',
    'get',
    'increment',
    'decrement',
    'default',
    // Async (2)
    'wait',
    'fetch',
    // Events (2)
    'trigger',
    'send',
    // Animation (4)
    'transition',
    'measure',
    'settle',
    'take',
    // Utility (6)
    'log',
    'tell',
    'call',
    'copy',
    'pick',
    'beep',
    // Advanced (2)
    'js',
    'async',
    // Navigation (1)
    'go',
    // Special (4)
    'install',
    'append',
    'render',
    'pseudo-command',
  ],

  // Supported locales (13 total)
  locales: ['en', 'es', 'ja', 'fr', 'de', 'ar', 'ko', 'zh', 'tr', 'id', 'pt', 'qu', 'sw'],

  /**
   * Evaluate hyperscript code (convenience method)
   */
  eval: async (code: string, context?: any) => runtimeAdapter.execute(code, context),

  /**
   * Initialize DOM scanning for _="" attributes
   * Optionally auto-detects browser locale
   */
  init: (options?: { autoDetectLocale?: boolean }) => {
    // Auto-detect locale if requested (default: true)
    if (options?.autoDetectLocale !== false) {
      i18nApi.detectAndSetLocale();
    }
    attributeProcessor.init();
  },
};

// Expose global API
if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;

  // Auto-initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      api.init();
    });
  } else {
    // DOM already loaded
    api.init();
  }
}

// Export the API object
export default api;

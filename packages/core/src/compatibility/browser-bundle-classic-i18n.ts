/**
 * HyperFixi Classic Browser Bundle with i18n Support
 *
 * Combines the classic _hyperscript runtime (43 commands) with full
 * internationalization support including:
 * - 12 language keyword providers (es, ja, fr, de, ar, ko, zh, tr, id, pt, qu, sw)
 * - Automatic browser locale detection
 * - Runtime locale switching
 * - Grammar profiles (word order, role markers); the transformer itself is retired
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
 * Size: ~535 KB uncompressed (~131 KB gzipped)
 */

import { parse } from '../parser/parser';
import { createTreeShakeableRuntime } from '../runtime/runtime-factory';
import { createMinimalAttributeProcessor } from '../dom/minimal-attribute-processor';
import { createContext, ensureContext } from '../core/context';
import type { KeywordResolver } from '../parser/types';

// ============================================================================
// Expression Categories (assembled into an ExpressionRegistry below)
// ============================================================================
import { createExpressionRegistry } from '../core/expression-registry';
import { referencesExpressions } from '../expressions/references/index';
import { logicalExpressions } from '../expressions/logical/index';
import { specialExpressions } from '../expressions/special/index';
import { mathematicalExpressions } from '../expressions/mathematical/index';
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
import { createEmptyCommand } from '../commands/dom/empty';
import { createOpenCommand } from '../commands/dom/open';
import { createCloseCommand } from '../commands/dom/close';
import { createSelectCommand } from '../commands/dom/select';
import { createResetCommand } from '../commands/dom/reset';

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
import { createClearCommand } from '../commands/data/clear';

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
import { createFocusCommand } from '../commands/execution/focus';
import { createBlurCommand } from '../commands/execution/blur';
import { createCopyCommand } from '../commands/utility/copy';
import { createPickCommand } from '../commands/utility/pick';
import { createBeepCommand } from '../commands/utility/beep';
import { createBreakpointCommand } from '../commands/utility/breakpoint';

// ============================================================================
// Advanced Commands (2)
// ============================================================================
import { createJsCommand } from '../commands/advanced/js';

// ============================================================================
// Navigation Commands (1)
// ============================================================================
import { createGoCommand } from '../commands/navigation/go';

// ============================================================================
// Special Commands (4)
// ============================================================================
import { createInstallCommand } from '../commands/behaviors/install';
import { createAppendCommand } from '../commands/content/append';
import { createPrependCommand } from '../commands/content/prepend';
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
  // Grammar transformation — PROFILES ONLY. This bundle used to expose four
  // helpers over @lokascript/i18n's `GrammarTransformer` (`toLocale`,
  // `toEnglish`, `translate`, `createTransformer`); they are gone with the
  // transformer itself. See the note on `i18nApi` for what replaced them, and
  // why not here.
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
} from '@lokascript/i18n/browser';
// NOTE: this entry is excluded from `tsconfig.build.json` (core's declaration
// build) the way `browser-bundle.ts` and `hybrid-hx-v4` are: `@lokascript/i18n`
// depends on core, not the reverse, so CI's build job compiles core BEFORE
// i18n's `browser.d.ts` exists. The bundles job (rollup + tsconfig.json) and
// the typecheck job both run after every dist is built, so the import resolves
// to i18n's real types there — which is what the deleted `types.d.ts` shim
// used to fake with `any`.

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

// Build an ExpressionRegistry with the 6 categories the classic-i18n bundle
// ships. Tree-shaking keeps only these categories' modules in the dist.
const expressionRegistry = createExpressionRegistry(
  referencesExpressions,
  logicalExpressions,
  specialExpressions,
  mathematicalExpressions,
  propertiesExpressions,
  conversionExpressions,
  positionalExpressions
);

// Create runtime instance with classic commands (37 total)
const runtime = createTreeShakeableRuntime(
  [
    // DOM (7)
    createAddCommand(),
    createRemoveCommand(),
    createToggleCommand(),
    createPutCommand(),
    createHideCommand(),
    createShowCommand(),
    createMakeCommand(),
    createEmptyCommand(),
    createOpenCommand(),
    createCloseCommand(),
    createSelectCommand(),
    createResetCommand(),

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

    // Data (6)
    createSetCommand(),
    createGetCommand(),
    createIncrementCommand(),
    createDecrementCommand(),
    createDefaultCommand(),
    createClearCommand(),

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

    // Utility (7)
    createLogCommand(),
    createTellCommand(),
    createCallCommand(),
    createCopyCommand(),
    createPickCommand(),
    createBeepCommand(),
    createBreakpointCommand(),

    // Execution (v0.9.90 focus/blur)
    createFocusCommand(),
    createBlurCommand(),

    // Advanced (2)
    createJsCommand(),

    // Navigation (1)
    createGoCommand(),

    // Special (4)
    createInstallCommand(),
    createAppendCommand(),
    createPrependCommand(),
    createRenderCommand(),
    createPseudoCommand(),
  ],
  { expressionRegistry }
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
    return await runtime.execute(parseResult.node, ctx);
  },
};

// Create minimal attribute processor with adapter
const attributeProcessor = createMinimalAttributeProcessor(runtimeAdapter);

// ============================================================================
// i18n API
// ============================================================================

/**
 * The bundle's i18n surface.
 *
 * WHAT IS NOT HERE, AND WHY: `toLocale` / `toEnglish` / `translate` /
 * `createTransformer`. They were display helpers over @lokascript/i18n's
 * `GrammarTransformer`, which is retired — and re-implementing them on
 * @lokascript/semantic (the renderer this repo's corpus is written by) was
 * MEASURED at +173 KB gzipped on this bundle, 138.9 → 312.1 KB, because it pulls
 * the parser and twelve language datasets in to serve three helpers. Importing
 * `semantic/core` plus only the twelve locales registered below still lands at
 * 269.2 KB. A 2x bundle for a display convenience is the wrong trade for a bundle
 * whose whole proposition is "classic runtime, ~105 KB".
 *
 * Removing them instead took the bundle DOWN, 138.9 → 131.0 KB gzipped: the
 * transformer was carrying weight here for an API nothing in the bundle used.
 * Recorded in scripts/bundle-snapshots/baseline.json, whose gate is two-sided —
 * an improvement this size trips it too.
 *
 * What this bundle is FOR is untouched: writing hyperscript in twelve languages
 * and having it run. That path is the keyword providers registered above —
 * nothing here ever called the transformer internally.
 *
 * For translation, pair `hyperfixi-multilingual.js` with a semantic bundle;
 * `hyperfixi.translate(code, from, to)` there is the same renderer, correctly
 * sized for the job. See docs/BROWSER_BUNDLES.md.
 */
/**
 * The dictionary objects' declared type (`Dictionary`) lives in a private
 * chunk of `@lokascript/i18n`'s emitted `browser.d.ts`, so a type inferred
 * from them is not portable (TS2742), and naming it from the package's main
 * entry would add a front-end type import the semantic-boundary ratchet
 * refuses. `object` is what a script-tag consumer of `hyperfixi.i18n.dictionaries`
 * can rely on; it was `any` while `types.d.ts` shimmed this module. `en` is
 * `{}`: English is the canonical vocabulary and has no dictionary.
 */
const dictionaries: Record<string, object> = {
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
};

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
  dictionaries,

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
        // Prefer the accumulated `errors` over the singular `error`: a
        // resilient parse that recovered leaves `error` restored to undefined
        // while `errors` holds the diagnostics, so reading only `error` here
        // reported `{ success: true, errors: [] }` for genuinely malformed
        // input. Same defect #780 fixed in compileSync.
        errors: result.errors ?? (result.error ? [result.error] : []),
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
      return await runtime.execute(parseResult.node, ctx);
    }

    // If it's an AST node, execute directly
    if (codeOrAst && typeof codeOrAst === 'object') {
      return await runtime.execute(codeOrAst, ctx);
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
    return await runtime.execute(parseResult.node, ctx);
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
    // Advanced (1)
    'js',
    // Navigation (1)
    'go',
    // Special (4)
    'install',
    'append',
    'prepend',
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

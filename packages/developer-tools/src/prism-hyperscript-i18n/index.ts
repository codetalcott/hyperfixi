/**
 * prism-hyperfixi - Multilingual Prism.js syntax highlighting for hyperscript.
 *
 * Supports 23+ languages with automatic language detection.
 * Keywords are generated from hyperfixi's i18n dictionaries.
 *
 * @example Browser usage (auto-registering)
 * ```html
 * <script src="prism.js"></script>
 * <script src="prism-hyperfixi/browser.js"></script>
 *
 * <pre><code class="language-hyperscript">
 * on click toggle .active on me
 * </code></pre>
 * ```
 *
 * @example Node.js usage
 * ```typescript
 * import Prism from 'prismjs';
 * import { registerPrismHyperfixi } from '@hyperfixi/developer-tools/prism-hyperfixi';
 *
 * registerPrismHyperfixi(Prism, { language: 'auto' });
 * ```
 */

import type {
  PrismHyperfixiOptions,
  PrismGrammar,
  PrismLike,
  PrismEnv,
  LanguagePatterns,
} from './types';
import { generatePatterns, getSupportedLanguages } from './pattern-generator';
import { detectLanguage, getHighlightLanguage } from './language-detector';
import { UNIVERSAL_PATTERNS, TOKEN_CLASSES } from './token-definitions';

/**
 * Create a Prism grammar definition for a specific language.
 */
function createGrammar(patterns: LanguagePatterns): PrismGrammar {
  return {
    // Comments first (highest priority) - prevents keywords inside comments being matched
    comment: {
      pattern: UNIVERSAL_PATTERNS.comment,
      greedy: true,
    },

    // Strings - prevents keywords inside strings being matched
    string: {
      pattern: UNIVERSAL_PATTERNS.string,
      greedy: true,
    },

    // CSS selectors (before keywords to prevent partial matches)
    'hs-selector': [
      { pattern: UNIVERSAL_PATTERNS.selector.id, alias: 'selector' },
      { pattern: UNIVERSAL_PATTERNS.selector.class, alias: 'selector' },
      { pattern: UNIVERSAL_PATTERNS.selector.attribute, alias: 'selector' },
      { pattern: UNIVERSAL_PATTERNS.selector.element, alias: 'selector' },
    ],

    // Language-specific keywords (in priority order)
    'hs-command': {
      pattern: patterns.patterns.command,
      alias: ['keyword', 'bold'],
    },
    'hs-modifier': {
      pattern: patterns.patterns.modifier,
      alias: 'keyword',
    },
    'hs-event': {
      pattern: patterns.patterns.event,
      alias: 'function',
    },
    'hs-logical': {
      pattern: patterns.patterns.logical,
      alias: 'keyword',
    },
    'hs-temporal': {
      pattern: patterns.patterns.temporal,
      alias: 'number',
    },
    'hs-value': {
      pattern: patterns.patterns.value,
      alias: 'builtin',
    },
    'hs-attribute': {
      pattern: patterns.patterns.attribute,
      alias: 'attr-name',
    },
    'hs-expression': {
      pattern: patterns.patterns.expression,
      alias: 'function',
    },

    // Numbers (including durations)
    number: {
      pattern: UNIVERSAL_PATTERNS.number,
    },

    // Operators
    operator: {
      pattern: UNIVERSAL_PATTERNS.operator,
    },

    // Punctuation
    punctuation: {
      pattern: UNIVERSAL_PATTERNS.punctuation,
    },
  };
}

/**
 * Register the hyperfixi language with Prism.
 *
 * @param Prism The Prism instance to register with
 * @param options Configuration options
 */
export function registerPrismHyperfixi(
  Prism: PrismLike,
  options: PrismHyperfixiOptions = {}
): void {
  const { language = 'auto', preloadLanguages = ['en'] } = options;

  // Preload patterns for specified languages (performance optimization)
  for (const lang of preloadLanguages) {
    try {
      generatePatterns(lang);
    } catch {
      // Silently ignore invalid languages in preload list
    }
  }

  // Register the base hyperscript language (English)
  const englishPatterns = generatePatterns('en');
  Prism.languages.hyperscript = createGrammar(englishPatterns);

  // Register common aliases
  Prism.languages.hs = Prism.languages.hyperscript;
  Prism.languages['_hyperscript'] = Prism.languages.hyperscript;
  Prism.languages.hyperfixi = Prism.languages.hyperscript;

  // Add hook for auto-detection (if enabled)
  if (language === 'auto') {
    Prism.hooks.add('before-tokenize', (env: PrismEnv) => {
      const validLanguages = ['hyperscript', 'hs', '_hyperscript', 'hyperfixi'];
      if (validLanguages.includes(env.language)) {
        const detectedLang = getHighlightLanguage(env.code);
        if (detectedLang !== 'en') {
          // Generate and apply patterns for detected language
          try {
            const patterns = generatePatterns(detectedLang);
            env.grammar = createGrammar(patterns);
          } catch {
            // Fall back to English if pattern generation fails
          }
        }
      }
    });
  } else if (language !== 'en') {
    // Force a specific language
    try {
      const patterns = generatePatterns(language);
      Prism.languages.hyperscript = createGrammar(patterns);
      Prism.languages.hs = Prism.languages.hyperscript;
      Prism.languages['_hyperscript'] = Prism.languages.hyperscript;
      Prism.languages.hyperfixi = Prism.languages.hyperscript;
    } catch {
      // Keep English as fallback
    }
  }
}

/**
 * Highlight hyperscript code with automatic language detection.
 *
 * @param code The hyperscript code to highlight
 * @param Prism The Prism instance
 * @param forcedLanguage Optional language to force
 * @returns HTML string with highlighted code
 */
export function highlightHyperscript(
  code: string,
  Prism: PrismLike,
  forcedLanguage?: string
): string {
  const lang = getHighlightLanguage(code, forcedLanguage);
  const patterns = generatePatterns(lang);
  const grammar = createGrammar(patterns);
  return Prism.highlight(code, grammar, 'hyperscript');
}

// Re-export utilities for advanced usage
export {
  generatePatterns,
  clearPatternCache,
  getAllKeywords,
  getSupportedLanguages,
  isLanguageSupported,
} from './pattern-generator';
export { detectLanguage, isValidLanguage, getHighlightLanguage } from './language-detector';
export {
  TOKEN_CLASSES,
  UNIVERSAL_PATTERNS,
  isNonLatinLanguage,
  getTextDirection,
} from './token-definitions';
export type * from './types';

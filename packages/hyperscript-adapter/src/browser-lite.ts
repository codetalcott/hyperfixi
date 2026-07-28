/**
 * Lite Browser Bundle (~4 KB)
 *
 * Lightweight adapter that expects @lokascript/semantic to be loaded
 * separately (any regional bundle). Pair with whichever semantic bundle
 * matches your target languages.
 *
 * @example
 * <script src="_hyperscript.js"></script>
 * <script src="lokascript-semantic-es.global.js"></script>
 * <script src="hyperscript-i18n-lite.global.js"></script>
 *
 * <button _="on click alternar .active" data-lang="es">Toggle</button>
 */

import { resolveLanguage } from './language-resolver';
import type { PluginOptions } from './plugin';
import type { PreprocessorConfig } from './preprocessor';
import { installAttributeTranslator, type HyperscriptHost } from './attribute-translator';

// ---------------------------------------------------------------------------
// Detect semantic global
// ---------------------------------------------------------------------------

interface SemanticGlobal {
  parse: (input: string, lang: string) => unknown;
  render: (node: unknown, lang: string) => string;
  translate?: (input: string, src: string, tgt: string) => string;
  createSemanticAnalyzer?: () => {
    analyze: (input: string, lang: string) => { confidence: number; node?: unknown };
    supportsLanguage: (lang: string) => boolean;
  };
  getSupportedLanguages?: () => string[];
}

function findSemanticGlobal(): SemanticGlobal | null {
  if (typeof globalThis === 'undefined') return null;
  const g = globalThis as Record<string, unknown>;

  // Check known global names (full → regional → single-language)
  const candidates = [
    'LokaScriptSemantic',
    'LokaScriptSemanticPriority',
    'LokaScriptSemanticWestern',
    'LokaScriptSemanticEastAsian',
    'LokaScriptSemanticEsEn',
    'LokaScriptSemanticEn',
    'LokaScriptSemanticEs',
  ];

  for (const name of candidates) {
    const obj = g[name];
    if (obj && typeof obj === 'object' && 'parse' in obj && 'render' in obj) {
      return obj as SemanticGlobal;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Preprocessor (uses external semantic global)
// ---------------------------------------------------------------------------

function preprocessToEnglish(
  src: string,
  lang: string,
  semantic: SemanticGlobal,
  _config: Partial<PreprocessorConfig>
): string {
  try {
    // Prefer translate() if available (combines parse+render)
    if (semantic.translate) {
      return semantic.translate(src, lang, 'en');
    }

    // Fallback: parse then render
    const node = semantic.parse(src, lang);
    if (node) {
      return semantic.render(node, 'en');
    }
  } catch {
    // Fall through
  }

  return src;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export function hyperscriptI18n(options: PluginOptions = {}) {
  return function plugin(hs: unknown): void {
    const semantic = findSemanticGlobal();
    if (!semantic) {
      console.warn(
        '[hyperscript-i18n] No LokaScriptSemantic global found. ' +
          'Load a semantic bundle before the adapter: ' +
          '<script src="lokascript-semantic.browser.global.js"></script>'
      );
      return;
    }

    installAttributeTranslator(hs as HyperscriptHost, (src, elt) => {
      const lang = resolveLanguageWithOptions(elt, options);
      if (!lang || lang === 'en') return src;

      const english = preprocessToEnglish(src, lang, semantic, options);

      if (options.debug && english !== src) {
        console.log(`[hyperscript-i18n] ${lang}: "${src}" → "${english}"`);
      }

      return english;
    });

    if (options.debug) {
      const langs = semantic.getSupportedLanguages?.() ?? ['(unknown)'];
      console.log(`[hyperscript-i18n] Lite adapter loaded. Languages: ${langs.join(', ')}`);
    }
  };
}

function resolveLanguageWithOptions(elt: Element, options: PluginOptions): string | null {
  if (options.languageAttribute) {
    const custom = elt.getAttribute(options.languageAttribute);
    if (custom) return custom.split('-')[0].toLowerCase();
  }
  const resolved = resolveLanguage(elt);
  if (resolved) return resolved;
  return options.defaultLanguage ?? null;
}

export function preprocess(src: string, lang: string): string {
  if (lang === 'en') return src;
  const semantic = findSemanticGlobal();
  if (!semantic) throw new Error('No LokaScriptSemantic global found');
  return preprocessToEnglish(src, lang, semantic, {});
}

export { resolveLanguage };

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

declare const _hyperscript: { use: (plugin: unknown) => void } | undefined;

if (typeof _hyperscript !== 'undefined' && _hyperscript.use) {
  _hyperscript.use(hyperscriptI18n());
}

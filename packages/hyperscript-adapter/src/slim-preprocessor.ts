/**
 * Slim Preprocessor
 *
 * Same skeleton as preprocessor.ts (shared via preprocessor-core.ts) but
 * imports from @lokascript/semantic/core and renders through the custom
 * hyperscript renderer instead of the semantic package's render(). This
 * avoids importing English language data (tokenizer, patterns, profile),
 * saving ~35 KB per per-language bundle.
 *
 * Used by per-language browser bundles for tree-shaking. Must never
 * import from '@lokascript/semantic' (the full package) at runtime.
 */

// Import from /core — does NOT trigger all-language registration.
// Source languages are registered separately via side-effect imports in bundle
// entries; English, the language `render` writes, is registered here.
import '@lokascript/semantic/languages/en';
import {
  parseWithConfidence,
  isLanguageRegistered,
  render,
  translate,
} from '@lokascript/semantic/core';

import { createPreprocessToEnglish, type PreprocessorConfig } from './preprocessor-core';

export type { PreprocessorConfig };

/**
 * Preprocess non-English hyperscript into English (slim imports): the full
 * path's logic exactly (preprocessor.ts), on `/core`.
 *
 * It used to render through its own English writer (hyperscript-renderer.ts),
 * which saved the English language data (~35 KB gzipped) and had drifted far
 * from semantic's renderer: measured over the corpus (2026-10-05), 1,242 of
 * 3,772 translations rendered to valid but different English (every `if` lost
 * its branches, `put … before` became `put … into`, `from window` and `or
 * <event>` vanished, `in me` scopes widened) and 345 to English the engine
 * rejects. Owner decision 2026-10-05: correctness over size.
 */
export const preprocessToEnglish = createPreprocessToEnglish({
  isLanguageRegistered,
  translateSingle(src, lang, threshold) {
    const result = parseWithConfidence(src, lang);
    if (result.confidence < threshold || !result.node) {
      if (result.confidence >= threshold) return translate(src, lang, 'en');
      return null;
    }
    return render(result.node, 'en');
  },
});

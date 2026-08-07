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
// Languages are registered separately via side-effect imports in bundle entries.
import { parseWithConfidence, isLanguageRegistered } from '@lokascript/semantic/core';

import { renderToHyperscript } from './hyperscript-renderer';
import { createPreprocessToEnglish, type PreprocessorConfig } from './preprocessor-core';

export type { PreprocessorConfig };

/**
 * Preprocess non-English hyperscript into English (slim imports).
 */
export const preprocessToEnglish = createPreprocessToEnglish({
  isLanguageRegistered,
  translateSingle(src, lang, threshold) {
    const result = parseWithConfidence(src, lang);
    if (result.confidence < threshold || !result.node) return null;

    return renderToHyperscript(result.node);
  },
});

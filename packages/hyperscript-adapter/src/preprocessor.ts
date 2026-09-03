/**
 * Preprocessor (full path)
 *
 * Translates non-English hyperscript to English using the semantic parser
 * (with optional i18n fallback), so the original _hyperscript can parse it.
 *
 * The strategy/split/strip skeleton lives in preprocessor-core.ts, shared
 * with the slim path — only HOW one statement is parsed and rendered
 * differs here: semantic's parseSemantic + render('en'), plus a
 * translate() rescue when the parse is confident but yields no node.
 */

import { translate, render, parseSemantic, isLanguageRegistered } from '@lokascript/semantic';

import { createPreprocessToEnglish, type PreprocessorConfig } from './preprocessor-core';

export type { PreprocessorConfig };

/**
 * Preprocess non-English hyperscript into English.
 *
 * Uses the semantic parser to parse the input in the source language,
 * then renders back to English. Falls through to i18n if configured.
 */
export const preprocessToEnglish = createPreprocessToEnglish({
  isLanguageRegistered,
  translateSingle(src, lang, threshold) {
    const result = parseSemantic(src, lang);
    if (result.confidence < threshold || !result.node) {
      // If we got SOME confidence but no node, fall back to translate()
      if (result.confidence >= threshold) {
        return translate(src, lang, 'en');
      }
      return null;
    }

    // Render the semantic node to English
    return render(result.node, 'en');
  },
});

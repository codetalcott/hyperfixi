/**
 * R8: Latin-script tokenizers should extract diacritic identifiers as single tokens.
 *
 * The default `IdentifierExtractor` matches `[a-zA-Z0-9_]*` and stops at any
 * diacritic. Words like `añadir` split into `["a", "ñadir"]` unless the
 * tokenizer also registers `LatinExtendedIdentifierExtractor`. This rule
 * probes the behavior by tokenizing a canonical diacritic-containing string
 * for each language and warning if it doesn't come back as a single token.
 *
 * Warning (not error) because:
 *   - English tokenizers legitimately don't need the extended extractor.
 *   - A domain might deliberately split compounds for its own reasons.
 * The warning prompts the author to audit; an explicit waiver can add an
 * opt-out once we have a mechanism for it.
 */

import type { LintFinding, LintRule } from '../types';

const RULE_ID = 'extractor-coverage';

/**
 * Canonical diacritic samples per language. Each must be a single logical
 * word in the target language. Chosen to exercise the specific characters
 * that tend to split under the default ASCII extractor.
 */
const DIACRITIC_SAMPLES: Record<string, string> = {
  es: 'añadir', // ñ
  fr: 'déjà', // é, à
  pt: 'coração', // ç, ã
  de: 'größer', // ö, ß
  tr: 'değiştir', // ğ, ş
  it: 'però', // ò
  pl: 'kochać', // ć
  cs: 'příliš', // ř, í
  // Not run for en, ja, ar, ko, zh, ru, hi, etc. — either pure ASCII
  // (en) or non-Latin scripts where the Unicode extractor handles them.
};

export const extractorCoverageRule: LintRule = input => {
  const findings: LintFinding[] = [];

  for (const [lang, sample] of Object.entries(DIACRITIC_SAMPLES)) {
    const tokenizer = input.tokenizers[lang];
    if (!tokenizer) continue; // language not registered in this domain

    const stream = tokenizer.tokenize(sample);
    if (stream.tokens.length !== 1) {
      findings.push({
        rule: RULE_ID,
        severity: 'warning',
        message: `[${lang}] diacritic probe "${sample}" tokenizes as ${stream.tokens.length} tokens — tokenizer likely missing LatinExtendedIdentifierExtractor`,
        context: {
          domain: input.name,
          lang,
          sample,
          tokenCount: stream.tokens.length,
        },
      });
    }
  }

  return findings;
};

/**
 * R5: Keyword classification — profile keywords ⊆ tokenizer keyword lists.
 *
 * Every lexical item the parser must recognize as a keyword — profile
 * keyword primaries/alternatives, profile role markers, and schema
 * `markerOverride` words — must actually *classify* as `'keyword'` in that
 * language's tokenizer. This is stricter than R7 (marker-tokenization):
 * a word can tokenize as a single token yet come back as `'identifier'`
 * when the tokenizer's keyword list doesn't contain it.
 *
 * Under the bridge (`buildDomainTokenizer`) profile and tokenizer derive
 * from the same vocab file, so this rule is vacuously green there. It
 * exists for hand-authored tokenizers (e.g. domain-learn) and custom
 * tokenizer overrides, where a vocab/profile edit can silently go stale
 * against the tokenizer's keyword list.
 */

import type { LintFinding, LintRule } from '../types';
import { collectLexicalItems } from './marker-tokenization';

const RULE_ID = 'keyword-classification';

export const keywordClassificationRule: LintRule = input => {
  const findings: LintFinding[] = [];

  for (const { lang, word, source } of collectLexicalItems(input)) {
    const tokenizer = input.tokenizers[lang];
    if (!tokenizer) continue; // R6 catches unregistered languages.

    // Same opt-outs as R7: '' means "no marker in this language"; multi-word
    // items can't be a single keyword token and are out of scope.
    if (word === '' || /\s/.test(word)) continue;

    const kind = tokenizer.classifyToken(word);
    if (kind !== 'keyword' && kind !== 'particle') {
      findings.push({
        rule: RULE_ID,
        severity: 'error',
        message: `"${word}" classifies as '${kind}' (not 'keyword') in ${lang} (${source})`,
        context: {
          domain: input.name,
          lang,
          word,
          source,
          kind,
        },
      });
    }
  }

  return findings;
};

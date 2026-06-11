/**
 * Tokenizer EXTRAS injectivity guard.
 *
 * Each tokenizer passes a hand-maintained EXTRAS list (literals, positional
 * words, event names, time units) to initializeKeywordsFromProfile. The
 * combined keyword map is keyed by native word with LAST-WINS insertion, so a
 * native word listed twice with different normalized values silently shadows
 * the earlier entry — there is no error, no warning, and the loser is
 * invisible in the deduplicated map.
 *
 * This bit us in German: GERMAN_EXTRAS carried both `nächste → next` and
 * `nächste → closest`; `closest` won, `closest` is not positional-expression
 * capable, and `put X into next <sel>` failed to parse outright (fixed in
 * #338). This test makes any such intra-EXTRAS collision a hard failure.
 *
 * A word that legitimately covers two concepts must pick the one normalized
 * form that serves both readings (de `nächste` → `next`: the locative scope
 * guard accepts `next` via POSITIONAL_OR_SCOPE_KEYWORDS, so one mapping
 * serves both) — see packages/semantic/src/tokenizers/german.ts.
 */

import { describe, it, expect } from 'vitest';
import { getTokenizer, getSupportedTokenizerLanguages } from '../src';

interface KeywordEntryLike {
  native: string;
  normalized: string;
}

describe('tokenizer EXTRAS injectivity (no native word → two normalized values)', () => {
  for (const lang of getSupportedTokenizerLanguages()) {
    it(`[${lang}] extras map each native word to exactly one normalized value`, () => {
      const tokenizer = getTokenizer(lang) as unknown as {
        getExtraKeywordEntries?: () => readonly KeywordEntryLike[];
      };
      // Tokenizers predating initializeKeywordsFromProfile (or with no extras)
      // simply have nothing to check.
      const extras = tokenizer.getExtraKeywordEntries?.() ?? [];
      const byNative = new Map<string, Set<string>>();
      for (const e of extras) {
        const key = e.native.toLowerCase();
        if (!byNative.has(key)) byNative.set(key, new Set());
        byNative.get(key)!.add(e.normalized);
      }
      const collisions = [...byNative.entries()]
        .filter(([, norms]) => norms.size > 1)
        .map(([native, norms]) => `'${native}' → {${[...norms].join(', ')}}`);
      expect(
        collisions,
        `[${lang}] EXTRAS list maps one native word to multiple normalized values ` +
          `(keyword-map insertion is last-wins, so the earlier mapping is silently dead):\n  ` +
          collisions.join('\n  ')
      ).toEqual([]);
    });
  }
});

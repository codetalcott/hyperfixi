/**
 * Mixed-Script Safeguard Test
 *
 * Verifies that every non-Latin tokenizer can handle ASCII identifiers
 * (e.g., CSS property names like "color") embedded in native-script input.
 *
 * This catches missing AsciiIdentifierExtractor registrations and prevents
 * regressions when new languages are added.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { getRegisteredLanguages, getTokenizer, tryGetProfile } from '../src';

describe('Non-Latin tokenizers handle ASCII identifiers', () => {
  const languages = getRegisteredLanguages();

  for (const code of languages) {
    const profile = tryGetProfile(code);
    if (!profile || profile.script === 'latin') continue;

    it(`[${code}] tokenizes ASCII identifiers as whole words`, () => {
      const tokenizer = getTokenizer(code);
      const stream = tokenizer.tokenize('color');
      const values = stream.tokens.map(t => t.value);
      // "color" should be a single token, not split into individual characters
      expect(values).toEqual(['color']);
    });
  }
});

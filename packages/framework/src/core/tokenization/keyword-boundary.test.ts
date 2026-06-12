/**
 * Contract tests for BaseTokenizer.isKeywordStartAtBoundary().
 *
 * The keyword table injects English canonical reference words (me, it, you, …)
 * for every language. Space-delimited tokenizers that break their word-walk on
 * a raw isKeywordStart() therefore split native words around embedded English
 * fallbacks (e.g. Quechua ñit'iy contains "it"). The boundary-aware variant
 * only fires when the keyword match ends at a word boundary.
 */

import { describe, it, expect } from 'vitest';
import { BaseTokenizer } from './base-tokenizer';
import type { TokenKind } from '../types';

class ProbeTokenizer extends BaseTokenizer {
  readonly language = 'xx';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile({
      keywords: { toggle: { primary: 'tikray' } },
      // references inject the English canonical fallbacks "it" and "me" too
      references: { it: 'pay', me: 'nuqa' },
    });
  }

  classifyToken(): TokenKind {
    return 'identifier';
  }

  probeRaw(input: string, pos: number): boolean {
    return this.isKeywordStart(input, pos);
  }

  probeBoundary(input: string, pos: number, isWordChar?: (ch: string) => boolean): boolean {
    return this.isKeywordStartAtBoundary(input, pos, isWordChar);
  }
}

describe('isKeywordStartAtBoundary', () => {
  const t = new ProbeTokenizer();

  it('does not fire on an English fallback embedded mid-word', () => {
    // "it" inside "umitaq" — raw check fires, boundary check must not
    expect(t.probeRaw('umitaq', 2)).toBe(true);
    expect(t.probeBoundary('umitaq', 2)).toBe(false);
    // "me" inside "umema"
    expect(t.probeRaw('umema', 1)).toBe(true);
    expect(t.probeBoundary('umema', 1)).toBe(false);
  });

  it('fires when the keyword match ends at end of input', () => {
    expect(t.probeBoundary('umit', 2)).toBe(true);
  });

  it('fires when the keyword match is followed by a non-word char', () => {
    expect(t.probeBoundary('um it goes', 3)).toBe(true);
    expect(t.probeBoundary('xit.', 1)).toBe(true);
  });

  it('respects a language-specific word-char predicate', () => {
    // Default predicate: apostrophe is not a word char → boundary fires
    expect(t.probeBoundary("xit'y", 1)).toBe(true);
    // Quechua-style predicate counting the glottal apostrophe → no boundary
    const quechuaLike = (ch: string) => /[a-zñ'’]/i.test(ch);
    expect(t.probeBoundary("xit'y", 1, quechuaLike)).toBe(false);
  });

  it('returns false when no keyword starts at the position at all', () => {
    expect(t.probeBoundary('umitaq', 0)).toBe(false);
  });
});

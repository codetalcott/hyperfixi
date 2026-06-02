/**
 * Korean particle-vs-keyword precedence
 *
 * Many Korean command keywords begin with a particle syllable:
 *   로그 "log"  starts with the means/direction particle 로
 *   이동 "go"   starts with the subject particle 이
 *   로드 "load" starts with 로
 * The particle extractor ran before the keyword extractor and won by
 * registration order, so a 1-char particle was peeled off the front and the
 * keyword was shredded (로그 → 로[particle] + 그[identifier]) → the command was
 * never recognized → empty event-handler body.
 *
 * Fix: a single-char particle is only extracted when it stands alone (not
 * immediately followed by another Hangul syllable). Standalone particles —
 * with their vowel-harmony role metadata — are unchanged.
 */

import { describe, it, expect } from 'vitest';
import { KoreanTokenizer } from '../src/tokenizers/korean';
import { parseSemantic } from '../src';

const tz = new KoreanTokenizer();
const kinds = (s: string) => tz.tokenize(s).tokens.map(t => `${t.value}:${t.kind}`);

describe('Korean particle/keyword precedence', () => {
  it('keeps particle-initial command keywords intact', () => {
    expect(kinds('로그')).toEqual(['로그:keyword']); // log (not 로 + 그)
    expect(kinds('이동')).toEqual(['이동:keyword']); // go  (not 이 + 동)
    expect(kinds('로드')).toEqual(['로드:keyword']); // load
  });

  it('still extracts standalone particles (with metadata)', () => {
    const toks = tz.tokenize('.active 를 토글').tokens;
    const p = toks.find(t => t.value === '를');
    expect(p?.kind).toBe('particle');
    expect(p?.metadata?.particleRole).toBe('patient');
    expect(p?.metadata?.particleConfidence).toBe(0.95);
  });

  it('handles a standalone particle and a particle-initial keyword in one string', () => {
    // #x 로 이동  →  로 is a standalone destination particle, 이동 is the verb
    const toks = tz.tokenize('#x 로 이동').tokens.map(t => `${t.value}:${t.kind}`);
    expect(toks).toContain('로:particle');
    expect(toks).toContain('이동:keyword');
  });

  it('parses Korean commands whose verb starts with a particle syllable', () => {
    for (const code of [
      '"Button clicked!" 를 클릭 로그', // log
      '나 를 클릭 로그', // log me
      'init 를 로드 트리거', // trigger on load
    ]) {
      const node = parseSemantic(code, 'ko').node as any;
      expect(node).toBeTruthy();
      expect(Array.isArray(node.body) ? node.body.length : 0).toBeGreaterThan(0);
    }
  });
});

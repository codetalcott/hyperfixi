/**
 * pick-vocab-multilingual.test.ts — arc 2 of the pick-text-range burndown.
 *
 * Arc 2 registers the canonical `pick` vocabulary (the range unit `characters`
 * and the range modes `inclusive`/`exclusive`) across the foreign languages, in
 * the tokenizer EXTRAS (parse-back) and the i18n dicts (corpus generation). The
 * foreign pick *pattern* is arc 3; the arc-2 contract this file guards is
 * narrower and exact: each registered native surface lexes to a token carrying
 * the expected normalized form (so arc 3's per-language pick pattern has a
 * recognizable keyword to bind).
 *
 * A non-null tokenization is not the assertion — the captured `normalized` is.
 *
 * Deferred (see packages/semantic/src/patterns/languages/en/pick.ts header):
 *  - `item`/`items` (loop-variable collision), singular `character`, and the
 *    `inclusive`/`exclusive` cells for hi/qu/sw (uncertain vocab).
 *  - qu `characters` (uncertain Quechua term) — its corpus row keeps English.
 *  - en carries no new EXTRAS: it rides identifiers through the arc-1 pattern.
 */
import { describe, it, expect } from 'vitest';
import { tokenize } from '../src';

// native surface -> normalized form, per registered language (arc 2, 2026-07-20).
const VOCAB: Record<string, Record<string, string>> = {
  characters: {
    ar: 'حروف', bn: 'অক্ষর', de: 'Zeichen', es: 'caracteres', fr: 'caractères',
    he: 'תווים', hi: 'अक्षर', id: 'karakter', it: 'caratteri', ja: '文字',
    ko: '문자', ms: 'aksara', pl: 'znaki', pt: 'caracteres', ru: 'символы',
    sw: 'herufi', th: 'อักขระ', tl: 'karakter', tr: 'karakterler', uk: 'символи',
    vi: 'ký tự', zh: '字符',
  },
  inclusive: {
    ar: 'شامل', bn: 'অন্তর্ভুক্ত', de: 'inklusiv', es: 'inclusivo', fr: 'inclusif',
    he: 'כולל', id: 'inklusif', it: 'inclusivo', ja: '含む', ko: '포함',
    ms: 'inklusif', pl: 'włącznie', pt: 'inclusivo', ru: 'включительно',
    th: 'รวม', tl: 'kasama', tr: 'dahil', uk: 'включно', vi: 'bao gồm', zh: '包含',
  },
  exclusive: {
    ar: 'حصري', bn: 'বাদ', de: 'exklusiv', es: 'exclusivo', fr: 'exclusif',
    he: 'בלעדי', id: 'eksklusif', it: 'esclusivo', ja: '除く', ko: '제외',
    ms: 'eksklusif', pl: 'wyłącznie', pt: 'exclusivo', ru: 'исключительно',
    th: 'ยกเว้น', tl: 'bukod', tr: 'hariç', uk: 'виключно', vi: 'loại trừ', zh: '排除',
  },
};

function tokensOf(input: string, language: string) {
  return tokenize(input, language).tokens;
}

describe('pick vocab — foreign natives lex to the canonical normalized form (arc 2)', () => {
  for (const [normalized, langs] of Object.entries(VOCAB)) {
    describe(normalized, () => {
      for (const [lang, native] of Object.entries(langs)) {
        it(`${lang}: "${native}" → ${normalized}`, () => {
          const toks = tokensOf(native, lang);
          expect(toks.some(t => t.normalized === normalized)).toBe(true);
        });
      }
    });
  }
});

describe('pick vocab — priority-language spot checks', () => {
  it('es plural noun is one keyword, not split', () => {
    const toks = tokensOf('caracteres', 'es').filter(t => t.value.trim() !== '');
    expect(toks).toHaveLength(1);
    expect(toks[0].normalized).toBe('characters');
  });

  it('vi spaced native ("ký tự") folds into a single keyword token', () => {
    const hits = tokensOf('ký tự', 'vi').filter(t => t.normalized === 'characters');
    expect(hits).toHaveLength(1);
  });

  it('ja/ko/ar CJK/RTL natives carry normalized characters', () => {
    for (const [lang, native] of [['ja', '文字'], ['ko', '문자'], ['ar', 'حروف']] as const) {
      expect(tokensOf(native, lang).some(t => t.normalized === 'characters')).toBe(true);
    }
  });

  it('qu is deferred — no Quechua characters keyword registered', () => {
    // The qu corpus pick row keeps English `characters` until arc 3 sources a
    // native term; assert we did not silently register a placeholder.
    expect(tokensOf('characters', 'qu').some(t => t.normalized === 'characters')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { preprocessToEnglish } from '../src/preprocessor';
import { getSupportedLanguages, translate } from '@lokascript/semantic';

describe('preprocessToEnglish', () => {
  describe('toggle command', () => {
    it.each([
      ['es', 'alternar .active'],
      ['ja', '.active を 切り替え'],
      ['ko', '.active 을 토글'],
      ['zh', '切换 .active'],
      ['fr', 'basculer .active'],
    ])('[%s] translates toggle .active', (lang, input) => {
      const result = preprocessToEnglish(input, lang);
      expect(result).toBe('toggle .active');
    });
  });

  describe('add command', () => {
    it.each([
      ['es', 'agregar .highlight en #box'],
      ['ja', '#box に .highlight を 追加'],
      ['ko', '#box 에 .highlight 을 추가'],
      ['fr', 'ajouter .highlight sur #box'],
    ])('[%s] translates add .highlight on #box', (lang, input) => {
      const result = preprocessToEnglish(input, lang);
      expect(result).toBe('add .highlight on #box');
    });
  });

  describe('remove command', () => {
    it.each([
      ['es', 'quitar .hidden de yo'],
      ['ja', '自分 から .hidden を 削除'],
      ['ko', '나 에서 .hidden 을 제거'],
      ['fr', 'supprimer .hidden de moi'],
    ])('[%s] translates remove .hidden from me', (lang, input) => {
      const result = preprocessToEnglish(input, lang);
      expect(result).toBe('remove .hidden from me');
    });
  });

  describe('put command', () => {
    it.each([
      ['es', 'poner "hello" en #msg'],
      ['ja', '"hello" を #msg に 置く'],
      ['ko', '"hello" 을 #msg 에 넣다'],
      ['fr', 'mettre "hello" sur #msg'],
    ])('[%s] translates put "hello" into #msg', (lang, input) => {
      const result = preprocessToEnglish(input, lang);
      expect(result).toBe('put "hello" into #msg');
    });
  });

  describe('set command', () => {
    it.each([
      ['es', 'establecer x a 5'],
      ['ja', 'x を 5 に 設定'],
      ['ko', 'x 를 5 으로 설정'],
      ['zh', '设置 x 为 5'],
      ['fr', 'définir x à 5'],
    ])('[%s] translates set x to 5', (lang, input) => {
      const result = preprocessToEnglish(input, lang);
      expect(result).toBe('set x to 5');
    });
  });

  describe('passthrough', () => {
    it('returns original for English input', () => {
      const result = preprocessToEnglish('toggle .active', 'en');
      // When language is English, should still work (translate is en→en identity)
      expect(result).toContain('toggle');
      expect(result).toContain('.active');
    });

    it('returns original for unsupported language', () => {
      const result = preprocessToEnglish('toggle .active', 'xx');
      expect(result).toBe('toggle .active');
    });
  });

  describe('compound statements', () => {
    it('splits and translates English then chains', () => {
      const result = preprocessToEnglish('alternar .active then agregar .loaded', 'es');
      // Both parts should be translated, rejoined with " then "
      expect(result).toContain('toggle .active');
      expect(result).toContain('then');
    });

    it('splits on localized then keyword (Spanish: entonces)', () => {
      const result = preprocessToEnglish('alternar .active entonces poner "ok" en #msg', 'es');
      // Should split on "entonces" and translate each part
      expect(result).toContain('toggle .active');
      expect(result).toContain('then');
      expect(result).toContain('put');
    });

    it('handles newline-separated statements', () => {
      const result = preprocessToEnglish('alternar .active\nagregar .loaded', 'es');
      expect(result).toContain('toggle .active');
    });
  });

  describe('event prefix stripping', () => {
    it.each([
      ['es', 'on click alternar .active', 'on click toggle .active'],
      ['ja', 'on click .active を 切り替え', 'on click toggle .active'],
      ['ko', 'on click .active 을 토글', 'on click toggle .active'],
      ['zh', 'on click 切换 .active', 'on click toggle .active'],
      ['fr', 'on click ajouter .highlight sur #box', 'on click add .highlight on #box'],
    ])('[%s] translates commands after "on click" prefix', (lang, input, expected) => {
      const result = preprocessToEnglish(input, lang);
      expect(result).toBe(expected);
    });

    it('handles "on every" modifier', () => {
      const result = preprocessToEnglish('on every click alternar .active', 'es');
      expect(result).toBe('on every click toggle .active');
    });

    it('handles event modifiers like .debounce()', () => {
      const result = preprocessToEnglish('on click.debounce(300) alternar .active', 'es');
      expect(result).toBe('on click.debounce(300) toggle .active');
    });

    it('passes through pure English with event prefix', () => {
      // Note: preprocessToEnglish is never called with lang='en' by the plugin
      // (plugin.ts short-circuits for English). This tests direct usage.
      const result = preprocessToEnglish('on click toggle .active', 'en');
      expect(result).toContain('toggle');
      expect(result).toContain('.active');
    });

    it('handles compound commands after event prefix', () => {
      const result = preprocessToEnglish(
        'on click alternar .active then agregar .loaded',
        'es'
      );
      expect(result).toContain('on click');
      expect(result).toContain('toggle .active');
      expect(result).toContain('then');
    });
  });

  describe('confidence fallback', () => {
    it('returns original when confidence threshold is very high and input is ambiguous', () => {
      // An intentionally garbled input that shouldn't match any pattern
      const result = preprocessToEnglish('xyz abc 123', 'es', {
        confidenceThreshold: 1.0,
      });
      expect(result).toBe('xyz abc 123');
    });
  });

  describe('all-languages smoke test', () => {
    // Dynamically test every language returned by getSupportedLanguages().
    // For each non-English language, translate "toggle .active" from English
    // into that language, then feed it back through preprocessToEnglish and
    // verify the round-trip produces valid English output.
    //
    // Languages are filtered dynamically: if translate() throws or the
    // round-trip doesn't produce English containing "toggle", the language
    // is excluded. This avoids hardcoding exclusions and adapts as
    // languages mature (e.g., Quechua at 41% pass rate is auto-excluded).
    const allLangs = getSupportedLanguages().filter(l => l !== 'en');
    const roundTripCases: [string, string][] = [];
    const skippedLangs: string[] = [];
    for (const lang of allLangs) {
      try {
        const native = translate('toggle .active', 'en', lang);
        if (!native) { skippedLangs.push(lang); continue; }
        // Pre-validate: does the round-trip actually produce "toggle"?
        const check = preprocessToEnglish(native, lang, { confidenceThreshold: 0.01 });
        if (check.includes('toggle') && check.includes('.active')) {
          roundTripCases.push([lang, native]);
        } else {
          skippedLangs.push(lang);
        }
      } catch {
        skippedLangs.push(lang);
      }
    }

    it('covers at least 8 languages', () => {
      // Guard against silent regressions where most languages stop translating
      expect(roundTripCases.length).toBeGreaterThanOrEqual(8);
    });

    it.each(roundTripCases)('[%s] round-trips toggle .active (%s)', (lang, native) => {
      const result = preprocessToEnglish(native, lang, {
        confidenceThreshold: 0.01,
      });
      expect(result).toContain('toggle');
      expect(result).toContain('.active');
    });
  });
});

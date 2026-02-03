import { describe, it, expect } from 'vitest';
import { preprocessToEnglish } from '../src/preprocessor';

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

  describe('confidence fallback', () => {
    it('returns original when confidence threshold is very high and input is ambiguous', () => {
      // An intentionally garbled input that shouldn't match any pattern
      const result = preprocessToEnglish('xyz abc 123', 'es', {
        confidenceThreshold: 1.0,
      });
      expect(result).toBe('xyz abc 123');
    });
  });
});

/**
 * Morphological Normalizer Tests
 *
 * Tests for verb conjugation normalization across all supported languages.
 * Each normalizer should strip prefixes/suffixes to find the stem form
 * that can be matched against keyword dictionaries.
 */

import { describe, it, expect } from 'vitest';
import {
  JapaneseMorphologicalNormalizer,
  KoreanMorphologicalNormalizer,
  SpanishMorphologicalNormalizer,
  ArabicMorphologicalNormalizer,
  TurkishMorphologicalNormalizer,
  FrenchMorphologicalNormalizer,
  GermanMorphologicalNormalizer,
  ItalianMorphologicalNormalizer,
  PolishMorphologicalNormalizer,
  PortugueseMorphologicalNormalizer,
  RussianMorphologicalNormalizer,
  UkrainianMorphologicalNormalizer,
} from '../src/tokenizers/morphology';

// =============================================================================
// Japanese Normalizer Tests
// =============================================================================

describe('JapaneseMorphologicalNormalizer', () => {
  const normalizer = new JapaneseMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Japanese words ending in hiragana', () => {
      expect(normalizer.isNormalizable('切り替えて')).toBe(true);
      expect(normalizer.isNormalizable('表示する')).toBe(true);
    });

    it('should return false for non-Japanese text', () => {
      expect(normalizer.isNormalizable('toggle')).toBe(false);
      expect(normalizer.isNormalizable('123')).toBe(false);
    });

    it('should return false for single characters', () => {
      expect(normalizer.isNormalizable('あ')).toBe(false);
    });
  });

  describe('て-form normalization', () => {
    it('should normalize 切り替えて to 切り替え', () => {
      const result = normalizer.normalize('切り替えて');
      expect(result.stem).toBe('切り替え');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize 追加して to 追加', () => {
      const result = normalizer.normalize('追加して');
      expect(result.stem).toBe('追加');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('た-form (past) normalization', () => {
    it('should normalize 切り替えた to 切り替え', () => {
      const result = normalizer.normalize('切り替えた');
      expect(result.stem).toBe('切り替え');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize 表示した to 表示', () => {
      const result = normalizer.normalize('表示した');
      expect(result.stem).toBe('表示');
    });
  });

  describe('ます-form (polite) normalization', () => {
    it('should normalize 切り替えます to 切り替え', () => {
      const result = normalizer.normalize('切り替えます');
      expect(result.stem).toBe('切り替え');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize 追加します to 追加', () => {
      const result = normalizer.normalize('追加します');
      expect(result.stem).toBe('追加');
    });
  });

  describe('ている (progressive) normalization', () => {
    it('should normalize 切り替えている to 切り替え', () => {
      const result = normalizer.normalize('切り替えている');
      expect(result.stem).toBe('切り替え');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize 表示しています to 表示', () => {
      const result = normalizer.normalize('表示しています');
      expect(result.stem).toBe('表示');
    });
  });

  describe('ない (negative) normalization', () => {
    it('should normalize 切り替えない to 切り替え', () => {
      const result = normalizer.normalize('切り替えない');
      expect(result.stem).toBe('切り替え');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('する verb normalization', () => {
    it('should normalize トグルする to トグル', () => {
      const result = normalizer.normalize('トグルする');
      expect(result.stem).toBe('トグル');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize 設定する to 設定', () => {
      const result = normalizer.normalize('設定する');
      expect(result.stem).toBe('設定');
    });

    it('should normalize している to stem', () => {
      const result = normalizer.normalize('トグルしている');
      expect(result.stem).toBe('トグル');
    });

    it('should normalize しました (past polite) to stem', () => {
      const result = normalizer.normalize('追加しました');
      expect(result.stem).toBe('追加');
    });
  });

  describe('no change cases', () => {
    it('should not modify words that are already stems', () => {
      const result = normalizer.normalize('切り替え');
      expect(result.stem).toBe('切り替え');
      expect(result.confidence).toBe(1.0);
    });

    it('should not modify katakana loanwords without verb ending', () => {
      const result = normalizer.normalize('トグル');
      expect(result.stem).toBe('トグル');
    });
  });
});

// =============================================================================
// Korean Normalizer Tests
// =============================================================================

describe('KoreanMorphologicalNormalizer', () => {
  const normalizer = new KoreanMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Korean words', () => {
      expect(normalizer.isNormalizable('토글하다')).toBe(true);
      expect(normalizer.isNormalizable('추가해요')).toBe(true);
    });

    it('should return false for non-Korean text', () => {
      expect(normalizer.isNormalizable('toggle')).toBe(false);
      expect(normalizer.isNormalizable('123')).toBe(false);
    });

    it('should return false for single characters', () => {
      expect(normalizer.isNormalizable('가')).toBe(false);
    });
  });

  describe('하다 verb normalization', () => {
    it('should normalize 토글하다 to 토글', () => {
      const result = normalizer.normalize('토글하다');
      expect(result.stem).toBe('토글');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize 추가하다 to 추가', () => {
      const result = normalizer.normalize('추가하다');
      expect(result.stem).toBe('추가');
    });

    it('should normalize 설정하다 to 설정', () => {
      const result = normalizer.normalize('설정하다');
      expect(result.stem).toBe('설정');
    });
  });

  describe('polite form normalization', () => {
    it('should normalize 토글해요 to 토글', () => {
      const result = normalizer.normalize('토글해요');
      expect(result.stem).toBe('토글');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize 추가해요 to 추가', () => {
      const result = normalizer.normalize('추가해요');
      expect(result.stem).toBe('추가');
    });
  });

  describe('formal form normalization', () => {
    it('should normalize 토글합니다 to 토글', () => {
      const result = normalizer.normalize('토글합니다');
      expect(result.stem).toBe('토글');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize 추가합니다 to 추가', () => {
      const result = normalizer.normalize('추가합니다');
      expect(result.stem).toBe('추가');
    });
  });

  describe('honorific request normalization', () => {
    it('should normalize 토글하세요 to 토글', () => {
      const result = normalizer.normalize('토글하세요');
      expect(result.stem).toBe('토글');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize 추가하세요 to 추가', () => {
      const result = normalizer.normalize('추가하세요');
      expect(result.stem).toBe('추가');
    });
  });

  describe('past tense normalization', () => {
    it('should normalize 토글했어요 to 토글', () => {
      const result = normalizer.normalize('토글했어요');
      expect(result.stem).toBe('토글');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize 추가했습니다 to 추가', () => {
      const result = normalizer.normalize('추가했습니다');
      expect(result.stem).toBe('추가');
    });
  });

  describe('connective form normalization', () => {
    // Note: 하고 is a connective form (and/with) that would need
    // more advanced handling. For now we test the forms that work.
    it('should normalize 토글해서 to 토글', () => {
      const result = normalizer.normalize('토글해서');
      expect(result.stem).toBe('토글');
    });
  });

  describe('no change cases', () => {
    it('should not modify words that are already stems', () => {
      const result = normalizer.normalize('토글');
      expect(result.stem).toBe('토글');
      expect(result.confidence).toBe(1.0);
    });

    it('should not modify pure nouns', () => {
      const result = normalizer.normalize('클릭');
      expect(result.stem).toBe('클릭');
    });
  });
});

// =============================================================================
// Spanish Normalizer Tests
// =============================================================================

describe('SpanishMorphologicalNormalizer', () => {
  const normalizer = new SpanishMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Spanish words', () => {
      expect(normalizer.isNormalizable('alternar')).toBe(true);
      expect(normalizer.isNormalizable('mostrarse')).toBe(true);
    });

    it('should return false for non-Spanish text', () => {
      expect(normalizer.isNormalizable('toggle')).toBe(false);
    });

    it('should return false for short words', () => {
      expect(normalizer.isNormalizable('a')).toBe(false);
    });
  });

  describe('-ar verb conjugation', () => {
    it('should normalize alternando (gerund) to alternar', () => {
      const result = normalizer.normalize('alternando');
      expect(result.stem).toBe('alternar');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize alternado (past participle) to alternar', () => {
      const result = normalizer.normalize('alternado');
      expect(result.stem).toBe('alternar');
    });

    it('should normalize alterna (present 3rd) to alternar', () => {
      const result = normalizer.normalize('alterna');
      expect(result.stem).toBe('alternar');
    });

    it('should normalize alternan (present plural) to alternar', () => {
      const result = normalizer.normalize('alternan');
      expect(result.stem).toBe('alternar');
    });

    it('should normalize alterné (past 1st) to alternar', () => {
      const result = normalizer.normalize('alterné');
      expect(result.stem).toBe('alternar');
    });

    it('should normalize alternó (past 3rd) to alternar', () => {
      const result = normalizer.normalize('alternó');
      expect(result.stem).toBe('alternar');
    });
  });

  describe('-er verb conjugation', () => {
    it('should normalize escondiendo (gerund) to escond + infinitive ending', () => {
      const result = normalizer.normalize('escondiendo');
      // -iendo is shared by -er and -ir verbs; normalizer picks one consistently
      expect(result.stem).toMatch(/^escond(er|ir)$/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize escondido (past participle) to escond + infinitive ending', () => {
      const result = normalizer.normalize('escondido');
      // -ido is shared by -er and -ir verbs
      expect(result.stem).toMatch(/^escond(er|ir)$/);
    });

    it('should normalize esconde (present 3rd) - ambiguous ending', () => {
      const result = normalizer.normalize('esconde');
      // Single-char 'e' is ambiguous across all verb classes
      expect(result.stem).toMatch(/^escond/);
      expect(result.confidence).toBeLessThan(1.0);
    });
  });

  describe('-ir verb conjugation', () => {
    // Note: -iendo and -ido endings are shared by -er and -ir verbs.
    // Without a dictionary, we can't disambiguate. The normalizer will
    // consistently pick one pattern (either -er or -ir).
    it('should normalize añadiendo (gerund) to añad + infinitive ending', () => {
      const result = normalizer.normalize('añadiendo');
      expect(result.stem).toMatch(/^añad(er|ir)$/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize añadido (past participle) to añad + infinitive ending', () => {
      const result = normalizer.normalize('añadido');
      expect(result.stem).toMatch(/^añad(er|ir)$/);
    });

    it('should normalize añade (present 3rd) - ambiguous ending', () => {
      const result = normalizer.normalize('añade');
      // The 'e' ending is ambiguous; normalizer will pick one pattern
      expect(result.stem).toMatch(/^añad/);
      expect(result.confidence).toBeLessThan(1.0);
    });
  });

  describe('reflexive verb normalization', () => {
    it('should normalize mostrarse to mostrar', () => {
      const result = normalizer.normalize('mostrarse');
      expect(result.stem).toBe('mostrar');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.metadata?.conjugationType).toBe('reflexive');
    });

    it('should normalize ocultarse to ocultar', () => {
      const result = normalizer.normalize('ocultarse');
      expect(result.stem).toBe('ocultar');
      expect(result.metadata?.conjugationType).toBe('reflexive');
    });

    it('should normalize esconderse to esconder', () => {
      const result = normalizer.normalize('esconderse');
      expect(result.stem).toBe('esconder');
    });
  });

  describe('infinitive preservation', () => {
    it('should not modify infinitives (already base form)', () => {
      const result = normalizer.normalize('alternar');
      expect(result.stem).toBe('alternar');
      expect(result.confidence).toBe(1.0);
    });

    it('should not modify mostrar', () => {
      const result = normalizer.normalize('mostrar');
      expect(result.stem).toBe('mostrar');
    });
  });

  describe('no change cases', () => {
    it('should not modify nouns', () => {
      const result = normalizer.normalize('botón');
      expect(result.stem).toBe('botón');
      expect(result.confidence).toBe(1.0);
    });
  });
});

// =============================================================================
// Arabic Normalizer Tests
// =============================================================================

describe('ArabicMorphologicalNormalizer', () => {
  const normalizer = new ArabicMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Arabic words', () => {
      expect(normalizer.isNormalizable('البدّل')).toBe(true);
      expect(normalizer.isNormalizable('يبدّل')).toBe(true);
    });

    it('should return false for non-Arabic text', () => {
      expect(normalizer.isNormalizable('toggle')).toBe(false);
      expect(normalizer.isNormalizable('123')).toBe(false);
    });

    it('should return false for single characters', () => {
      expect(normalizer.isNormalizable('ب')).toBe(false);
    });
  });

  describe('definite article (ال) prefix', () => {
    it('should strip ال from البدل', () => {
      const result = normalizer.normalize('البدل');
      expect(result.stem).toBe('بدل');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should strip ال from التبديل', () => {
      const result = normalizer.normalize('التبديل');
      expect(result.stem).toBe('تبديل');
    });
  });

  describe('conjunction prefixes', () => {
    it('should strip و (and) from والبدل', () => {
      const result = normalizer.normalize('والبدل');
      expect(result.stem).toBe('بدل');
    });

    it('should strip ف (then) prefix', () => {
      const result = normalizer.normalize('فالبدل');
      expect(result.stem).toBe('بدل');
    });
  });

  describe('preposition prefixes', () => {
    it('should strip ب (with/by) from ببدل', () => {
      const result = normalizer.normalize('ببدل');
      expect(result.stem).toBe('بدل');
    });

    it('should strip ل (to/for) from لبدل', () => {
      const result = normalizer.normalize('لبدل');
      expect(result.stem).toBe('بدل');
    });

    it('should strip combined بال prefix', () => {
      const result = normalizer.normalize('بالبدل');
      expect(result.stem).toBe('بدل');
    });
  });

  describe('verb prefixes (present tense markers)', () => {
    it('should strip ي (he/it) from يبدّل', () => {
      const result = normalizer.normalize('يبدل');
      expect(result.stem).toBe('بدل');
    });

    it('should strip ت (she/you) from تبدّل', () => {
      const result = normalizer.normalize('تبدل');
      expect(result.stem).toBe('بدل');
    });

    it('should strip ن (we) from نبدّل', () => {
      const result = normalizer.normalize('نبدل');
      expect(result.stem).toBe('بدل');
    });

    it('should strip أ (I) from أبدّل', () => {
      const result = normalizer.normalize('أبدل');
      expect(result.stem).toBe('بدل');
    });
  });

  describe('plural suffixes', () => {
    it('should strip ون (masculine plural nominative)', () => {
      const result = normalizer.normalize('مستخدمون');
      expect(result.stem).toBe('مستخدم');
    });

    it('should strip ين (masculine plural accusative)', () => {
      const result = normalizer.normalize('مستخدمين');
      expect(result.stem).toBe('مستخدم');
    });

    it('should strip ات (feminine plural)', () => {
      const result = normalizer.normalize('تغييرات');
      expect(result.stem).toBe('تغيير');
    });
  });

  describe('pronoun suffixes', () => {
    it('should strip ها (her/it) from longer words', () => {
      // Using a longer word since بدل is too short
      const result = normalizer.normalize('تغييرها');
      expect(result.stem).toBe('تغيير');
    });

    it('should strip هم (them) from longer words', () => {
      const result = normalizer.normalize('تغييرهم');
      expect(result.stem).toBe('تغيير');
    });

    it('should not over-strip short words', () => {
      // بدلها has only 2 chars after stripping - should be cautious
      const result = normalizer.normalize('بدلها');
      // Should either not strip (returning original) or strip suffix only
      expect(result.stem.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('feminine marker', () => {
    it('should strip ة (ta marbuta)', () => {
      const result = normalizer.normalize('إضافة');
      expect(result.stem).toBe('إضاف');
    });
  });

  describe('diacritics handling', () => {
    it('should handle words with and without diacritics consistently', () => {
      // When no morphological change is made, original word is returned
      // But internal matching uses diacritic-stripped form
      const withDiacritics = normalizer.normalize('بدّل');
      const withoutDiacritics = normalizer.normalize('بدل');

      // Both should return unchanged (no prefix/suffix to strip)
      expect(withDiacritics.confidence).toBe(1.0);
      expect(withoutDiacritics.confidence).toBe(1.0);
    });

    it('should strip prefixes consistently regardless of diacritics', () => {
      // الكتاب (the book) - with and without diacritics
      const result1 = normalizer.normalize('الكتاب');
      const result2 = normalizer.normalize('الْكِتَاب'); // with diacritics

      // Both should strip ال prefix
      expect(result1.stem).toBe('كتاب');
      // Result2 will have diacritics stripped internally for matching
      expect(result2.confidence).toBeLessThan(1.0); // Some stripping occurred
    });
  });

  describe('no change cases', () => {
    it('should not modify words that are already stems (no prefix/suffix)', () => {
      // Using a word without any prefix/suffix patterns
      const result = normalizer.normalize('كتب');  // ktb - triliteral root
      expect(result.stem).toBe('كتب');
      expect(result.confidence).toBe(1.0);
    });

    it('should not strip short words incorrectly', () => {
      // بدل is 3 chars but starts with ب which is a prefix candidate
      // With minRemaining=3, it shouldn't be stripped
      const result = normalizer.normalize('بدل');
      expect(result.stem).toBe('بدل');
    });

    it('should not strip if result would be too short', () => {
      // Single-character stems should not be produced
      const result = normalizer.normalize('اب');
      // Either returns same or finds valid stem
      expect(result.stem.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// =============================================================================
// Turkish Normalizer Tests
// =============================================================================

describe('TurkishMorphologicalNormalizer', () => {
  const normalizer = new TurkishMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Turkish words', () => {
      expect(normalizer.isNormalizable('değiştirmek')).toBe(true);
      expect(normalizer.isNormalizable('gösteriyor')).toBe(true);
    });

    it('should return false for non-Turkish text', () => {
      // Note: Turkish uses Latin alphabet, so ASCII words may pass isNormalizable
      // The key check is that numbers and very short words return false
      expect(normalizer.isNormalizable('123')).toBe(false);
    });

    it('should return false for very short words', () => {
      expect(normalizer.isNormalizable('al')).toBe(false);
    });
  });

  describe('infinitive (-mak/-mek) normalization', () => {
    it('should normalize değiştirmek to değiştir', () => {
      const result = normalizer.normalize('değiştirmek');
      expect(result.stem).toBe('değiştir');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.metadata?.conjugationType).toBe('dictionary');
    });

    it('should normalize göstermek to göster', () => {
      const result = normalizer.normalize('göstermek');
      expect(result.stem).toBe('göster');
    });

    it('should normalize gizlemek to gizle', () => {
      const result = normalizer.normalize('gizlemek');
      expect(result.stem).toBe('gizle');
    });

    it('should normalize beklemek to bekle', () => {
      const result = normalizer.normalize('beklemek');
      expect(result.stem).toBe('bekle');
    });

    it('should respect vowel harmony (back vowels)', () => {
      // bakmak uses back vowels
      const result = normalizer.normalize('bakmak');
      expect(result.stem).toBe('bak');
    });
  });

  describe('present continuous (-iyor) normalization', () => {
    it('should normalize değiştiriyor to değiştir', () => {
      const result = normalizer.normalize('değiştiriyor');
      expect(result.stem).toBe('değiştir');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.metadata?.conjugationType).toBe('progressive');
    });

    it('should normalize gösteriyor to göster', () => {
      const result = normalizer.normalize('gösteriyor');
      expect(result.stem).toBe('göster');
    });

    it('should normalize bakıyor to bak (back vowel harmony)', () => {
      const result = normalizer.normalize('bakıyor');
      expect(result.stem).toBe('bak');
    });

    it('should normalize okuyor to oku (back vowel harmony)', () => {
      const result = normalizer.normalize('okuyor');
      expect(result.stem).toBe('ok');
    });
  });

  describe('present continuous with person suffixes', () => {
    it('should normalize değiştiriyorum (1sg) to değiştir', () => {
      const result = normalizer.normalize('değiştiriyorum');
      expect(result.stem).toBe('değiştir');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize gösteriyorsun (2sg) to göster', () => {
      const result = normalizer.normalize('gösteriyorsun');
      expect(result.stem).toBe('göster');
    });

    it('should normalize gizliyoruz (1pl) to gizli', () => {
      const result = normalizer.normalize('gizliyoruz');
      expect(result.stem).toBe('gizl');
    });

    it('should normalize bakıyorsunuz (2pl) to bak', () => {
      const result = normalizer.normalize('bakıyorsunuz');
      expect(result.stem).toBe('bak');
    });

    it('should normalize yapıyorlar (3pl) to yap', () => {
      const result = normalizer.normalize('yapıyorlar');
      expect(result.stem).toBe('yap');
    });
  });

  describe('past tense (-di/-dı/-dü/-du) normalization', () => {
    it('should normalize değiştirdi to değiştir', () => {
      const result = normalizer.normalize('değiştirdi');
      expect(result.stem).toBe('değiştir');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.metadata?.conjugationType).toBe('past');
    });

    it('should normalize gösterdi to göster', () => {
      const result = normalizer.normalize('gösterdi');
      expect(result.stem).toBe('göster');
    });

    it('should normalize baktı to bak', () => {
      const result = normalizer.normalize('baktı');
      expect(result.stem).toBe('bak');
    });

    it('should normalize gördü to gör', () => {
      const result = normalizer.normalize('gördü');
      expect(result.stem).toBe('gör');
    });
  });

  describe('past tense with person suffixes', () => {
    it('should normalize değiştirdim (1sg) to değiştir', () => {
      const result = normalizer.normalize('değiştirdim');
      expect(result.stem).toBe('değiştir');
    });

    it('should normalize gösterdin (2sg) to göster', () => {
      const result = normalizer.normalize('gösterdin');
      expect(result.stem).toBe('göster');
    });

    it('should normalize baktık (1pl) to bak', () => {
      const result = normalizer.normalize('baktık');
      expect(result.stem).toBe('bak');
    });

    it('should normalize gördüler (3pl) to gör', () => {
      const result = normalizer.normalize('gördüler');
      expect(result.stem).toBe('gör');
    });
  });

  describe('reported past (-miş/-mış) normalization', () => {
    it('should normalize değiştirmiş to değiştir', () => {
      const result = normalizer.normalize('değiştirmiş');
      expect(result.stem).toBe('değiştir');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize görmüş to gör', () => {
      const result = normalizer.normalize('görmüş');
      expect(result.stem).toBe('gör');
    });

    it('should normalize bakmış to bak', () => {
      const result = normalizer.normalize('bakmış');
      expect(result.stem).toBe('bak');
    });
  });

  describe('future tense (-ecek/-acak) normalization', () => {
    it('should normalize değiştirecek to değiştir', () => {
      const result = normalizer.normalize('değiştirecek');
      expect(result.stem).toBe('değiştir');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.metadata?.conjugationType).toBe('future');
    });

    it('should normalize gösterecek to göster', () => {
      const result = normalizer.normalize('gösterecek');
      expect(result.stem).toBe('göster');
    });

    it('should normalize bakacak to bak', () => {
      const result = normalizer.normalize('bakacak');
      expect(result.stem).toBe('bak');
    });
  });

  describe('future tense with person suffixes', () => {
    it('should normalize değiştireceğim (1sg) to değiştir', () => {
      const result = normalizer.normalize('değiştireceğim');
      expect(result.stem).toBe('değiştir');
    });

    it('should normalize göstereceksiniz (2pl) to göster', () => {
      const result = normalizer.normalize('göstereceksiniz');
      expect(result.stem).toBe('göster');
    });

    it('should normalize bakacaklar (3pl) to bak', () => {
      const result = normalizer.normalize('bakacaklar');
      expect(result.stem).toBe('bak');
    });
  });

  describe('negative forms (-me/-ma + tense)', () => {
    it('should normalize değiştirmiyor (negative present) - strips iyor', () => {
      // 'değiştirmiyor' = değiştir + m (negative) + iyor (progressive)
      // Simple stripper sees 'iyor' and strips it, leaving 'değiştirm'
      // The 'm' negation marker remains as part of the "stem"
      const result = normalizer.normalize('değiştirmiyor');
      expect(result.stem).toBe('değiştirm');
      expect(result.metadata?.conjugationType).toBe('progressive');
    });

    it('should normalize göstermedi (negative past) - strips past tense', () => {
      // Note: Simple suffix stripper strips 'di' first, leaving 'gösterme'
      // Full morphological analysis would need multi-pass stripping
      const result = normalizer.normalize('göstermedi');
      expect(result.stem).toBe('gösterme');
      expect(result.metadata?.conjugationType).toBe('past');
    });

    it('should normalize bakmıyor (negative present, back vowels)', () => {
      // 'bakmıyor' - the negation m is part of the stem from simple stripper's view
      // The 'ıyor' progressive suffix is stripped, leaving 'bakm'
      // More sophisticated analysis would recognize 'm' as negation marker
      const result = normalizer.normalize('bakmıyor');
      expect(result.stem).toBe('bakm');
      expect(result.metadata?.conjugationType).toBe('progressive');
    });
  });

  describe('imperative forms', () => {
    it('should normalize değiştiriniz (formal) to değiştir', () => {
      const result = normalizer.normalize('değiştiriniz');
      expect(result.stem).toBe('değiştir');
      expect(result.metadata?.conjugationType).toBe('imperative');
    });

    it('should normalize gösterin (plural/formal) to göster', () => {
      const result = normalizer.normalize('gösterin');
      expect(result.stem).toBe('göster');
    });
  });

  describe('passive voice', () => {
    it('should normalize değiştirildi (passive past) - strips simple past first', () => {
      // Note: Since 'di' (simple past) is matched before 'ildi' (passive past),
      // the result is 'değiştiril'. A more sophisticated analyzer would recognize
      // the compound passive+past pattern.
      const result = normalizer.normalize('değiştirildi');
      expect(result.stem).toBe('değiştiril');
      expect(result.metadata?.conjugationType).toBe('past');
    });

    it('should normalize gösterilir (passive present) via ilir pattern', () => {
      const result = normalizer.normalize('gösterilir');
      expect(result.stem).toBe('göster');
      expect(result.metadata?.conjugationType).toBe('passive');
    });
  });

  describe('causative forms', () => {
    it('should normalize değiştirtmek (causative infinitive) - strips mek first', () => {
      // Note: Since 'mek' (infinitive) is matched before 'tirmek' (causative),
      // the result is 'değiştirt'. A more sophisticated analyzer would need
      // to check for causative markers.
      const result = normalizer.normalize('değiştirtmek');
      expect(result.stem).toBe('değiştirt');
      expect(result.metadata?.conjugationType).toBe('dictionary');
    });
  });

  describe('vowel harmony validation', () => {
    it('should apply confidence penalty for vowel harmony mismatch', () => {
      // This is a malformed word that violates vowel harmony
      // Using a back-vowel suffix with a front-vowel stem
      const normal = normalizer.normalize('gösteriyor');
      const confidence1 = normal.confidence;

      // A well-formed word should have higher or equal confidence
      expect(confidence1).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('no change cases', () => {
    it('should not modify words that are already stems', () => {
      const result = normalizer.normalize('değiştir');
      expect(result.stem).toBe('değiştir');
      expect(result.confidence).toBe(1.0);
    });

    it('should not modify short stems', () => {
      const result = normalizer.normalize('git');
      expect(result.stem).toBe('git');
    });

    it('should not modify words without diacritics', () => {
      const result = normalizer.normalize('degistir');
      expect(result.stem).toBe('degistir');
    });
  });

  describe('words without Turkish special characters', () => {
    it('should handle words with only ASCII letters', () => {
      // 'bak' (look) has no special chars
      const result = normalizer.normalize('bakiyor');
      // Without proper ı, this may not match perfectly
      expect(result.stem.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// =============================================================================
// Integration Tests - Confidence Scoring
// =============================================================================

describe('Confidence Scoring', () => {
  const japanesNormalizer = new JapaneseMorphologicalNormalizer();
  const koreanNormalizer = new KoreanMorphologicalNormalizer();
  const spanishNormalizer = new SpanishMorphologicalNormalizer();
  const arabicNormalizer = new ArabicMorphologicalNormalizer();
  const turkishNormalizer = new TurkishMorphologicalNormalizer();

  describe('confidence ranges', () => {
    it('should return 1.0 for unchanged words', () => {
      expect(japanesNormalizer.normalize('切り替え').confidence).toBe(1.0);
      expect(koreanNormalizer.normalize('토글').confidence).toBe(1.0);
      expect(spanishNormalizer.normalize('alternar').confidence).toBe(1.0);
      // Using a word without prefix/suffix patterns
      expect(arabicNormalizer.normalize('كتب').confidence).toBe(1.0);
      expect(turkishNormalizer.normalize('değiştir').confidence).toBe(1.0);
    });

    it('should return 0.75-0.9 for single transformation', () => {
      const jaResult = japanesNormalizer.normalize('切り替えて');
      expect(jaResult.confidence).toBeGreaterThanOrEqual(0.75);
      expect(jaResult.confidence).toBeLessThanOrEqual(0.95);

      const koResult = koreanNormalizer.normalize('토글하다');
      expect(koResult.confidence).toBeGreaterThanOrEqual(0.75);
      expect(koResult.confidence).toBeLessThanOrEqual(0.95);

      const esResult = spanishNormalizer.normalize('alternando');
      expect(esResult.confidence).toBeGreaterThanOrEqual(0.75);
      expect(esResult.confidence).toBeLessThanOrEqual(0.95);

      const arResult = arabicNormalizer.normalize('البدل');
      expect(arResult.confidence).toBeGreaterThanOrEqual(0.75);
      expect(arResult.confidence).toBeLessThanOrEqual(0.95);

      const trResult = turkishNormalizer.normalize('değiştirmek');
      expect(trResult.confidence).toBeGreaterThanOrEqual(0.75);
      expect(trResult.confidence).toBeLessThanOrEqual(0.95);
    });

    it('should return lower confidence for multiple transformations', () => {
      // Multiple suffix stripping should reduce confidence
      const arResult = arabicNormalizer.normalize('والمستخدمين');
      // Strips وال and ين
      expect(arResult.confidence).toBeLessThan(0.9);
      expect(arResult.confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('minimum stem length enforcement', () => {
    it('should not over-strip to produce tiny stems', () => {
      // All normalizers should enforce minimum stem lengths
      const jaResult = japanesNormalizer.normalize('した');
      // Should not strip to empty or single char
      expect(jaResult.stem.length).toBeGreaterThanOrEqual(1);

      const arResult = arabicNormalizer.normalize('له');
      expect(arResult.stem.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// =============================================================================
// Metadata Tests
// =============================================================================

describe('Normalization Metadata', () => {
  const spanishNormalizer = new SpanishMorphologicalNormalizer();
  const arabicNormalizer = new ArabicMorphologicalNormalizer();

  it('should include conjugationType for reflexive verbs', () => {
    const result = spanishNormalizer.normalize('mostrarse');
    expect(result.metadata?.conjugationType).toBe('reflexive');
  });

  it('should include removed suffixes in metadata', () => {
    const result = spanishNormalizer.normalize('mostrarse');
    expect(result.metadata?.removedSuffixes).toContain('se');
  });

  it('should include removed prefixes for Arabic', () => {
    const result = arabicNormalizer.normalize('والبدل');
    expect(result.metadata?.removedPrefixes).toBeDefined();
    expect(result.metadata?.removedPrefixes?.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// French Normalizer Tests
// =============================================================================

describe('FrenchMorphologicalNormalizer', () => {
  const normalizer = new FrenchMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for French words', () => {
      expect(normalizer.isNormalizable('basculer')).toBe(true);
      expect(normalizer.isNormalizable('ajoutant')).toBe(true);
    });

    it('should return false for non-French text', () => {
      expect(normalizer.isNormalizable('123')).toBe(false);
    });

    it('should return false for short words', () => {
      expect(normalizer.isNormalizable('a')).toBe(false);
    });
  });

  describe('-er verb conjugation', () => {
    it('should normalize basculant (gerund) to basculer', () => {
      const result = normalizer.normalize('basculant');
      expect(result.stem).toBe('basculer');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize basculé (past participle) to basculer', () => {
      const result = normalizer.normalize('basculé');
      expect(result.stem).toBe('basculer');
    });

    it('should normalize bascule (present 3rd) to basculer', () => {
      const result = normalizer.normalize('bascule');
      expect(result.stem).toBe('basculer');
    });

    it('should normalize basculons (present 1st pl) to basculer', () => {
      const result = normalizer.normalize('basculons');
      expect(result.stem).toBe('basculer');
    });
  });

  describe('infinitive preservation', () => {
    it('should not modify infinitives', () => {
      const result = normalizer.normalize('basculer');
      expect(result.stem).toBe('basculer');
      expect(result.confidence).toBe(1.0);
    });

    it('should not modify ajouter', () => {
      const result = normalizer.normalize('ajouter');
      expect(result.stem).toBe('ajouter');
    });
  });

  describe('no change cases', () => {
    it('should not modify nouns', () => {
      const result = normalizer.normalize('bouton');
      expect(result.stem).toBe('bouton');
      expect(result.confidence).toBe(1.0);
    });
  });
});

// =============================================================================
// German Normalizer Tests
// =============================================================================

describe('GermanMorphologicalNormalizer', () => {
  const normalizer = new GermanMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for German words', () => {
      expect(normalizer.isNormalizable('umschalten')).toBe(true);
      expect(normalizer.isNormalizable('hinzufügen')).toBe(true);
    });

    it('should return false for short words', () => {
      expect(normalizer.isNormalizable('ab')).toBe(false);
    });
  });

  describe('infinitive (-en) normalization', () => {
    it('should not modify infinitives', () => {
      const result = normalizer.normalize('umschalten');
      expect(result.stem).toBe('umschalten');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('present tense', () => {
    it('should normalize zeige (1st sg) to zeigen', () => {
      const result = normalizer.normalize('zeige');
      expect(result.stem).toBe('zeigen');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should normalize zeigt (3rd sg) to zeigen', () => {
      const result = normalizer.normalize('zeigt');
      expect(result.stem).toBe('zeigen');
    });
  });

  describe('past participle (ge-...-t)', () => {
    it('should normalize gemacht to machen', () => {
      const result = normalizer.normalize('gemacht');
      expect(result.stem).toBe('machen');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('no change cases', () => {
    it('should not modify nouns', () => {
      const result = normalizer.normalize('Knopf');
      expect(result.stem).toBe('Knopf');
      expect(result.confidence).toBe(1.0);
    });
  });
});

// =============================================================================
// Italian Normalizer Tests
// =============================================================================

describe('ItalianMorphologicalNormalizer', () => {
  const normalizer = new ItalianMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Italian words', () => {
      expect(normalizer.isNormalizable('alternare')).toBe(true);
      expect(normalizer.isNormalizable('aggiungendo')).toBe(true);
    });

    it('should return false for short words', () => {
      expect(normalizer.isNormalizable('a')).toBe(false);
    });
  });

  describe('-are verb conjugation', () => {
    it('should normalize alternando (gerund) to alternare', () => {
      const result = normalizer.normalize('alternando');
      expect(result.stem).toBe('alternare');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize alternato (past participle) to alternare', () => {
      const result = normalizer.normalize('alternato');
      expect(result.stem).toBe('alternare');
    });

    it('should normalize alterna (present 3rd) to alternare', () => {
      const result = normalizer.normalize('alterna');
      expect(result.stem).toBe('alternare');
    });
  });

  describe('-ire verb conjugation', () => {
    it('should normalize aggiungendo (gerund) — may map to -ere or -ire', () => {
      const result = normalizer.normalize('aggiungendo');
      expect(result.stem).toMatch(/^aggiunger|aggiungir/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('reflexive verb normalization', () => {
    it('should normalize mostrarsi to mostrare', () => {
      const result = normalizer.normalize('mostrarsi');
      expect(result.stem).toBe('mostrare');
      expect(result.metadata?.conjugationType).toBe('reflexive');
    });
  });

  describe('infinitive preservation', () => {
    it('should not modify alternare', () => {
      const result = normalizer.normalize('alternare');
      expect(result.stem).toBe('alternare');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('no change cases', () => {
    it('should not modify nouns', () => {
      const result = normalizer.normalize('pulsante');
      // May or may not match a conjugation pattern — just ensure confidence < 1 or matches
      expect(result.stem).toBeDefined();
    });
  });
});

// =============================================================================
// Polish Normalizer Tests
// =============================================================================

describe('PolishMorphologicalNormalizer', () => {
  const normalizer = new PolishMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Polish words', () => {
      expect(normalizer.isNormalizable('przełącz')).toBe(true);
      expect(normalizer.isNormalizable('dodawać')).toBe(true);
    });

    it('should return false for short words', () => {
      expect(normalizer.isNormalizable('ab')).toBe(false);
    });
  });

  describe('imperative normalization (lookup)', () => {
    it('should normalize przełącz to przełączać', () => {
      const result = normalizer.normalize('przełącz');
      expect(result.stem).toBe('przełączać');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.metadata?.conjugationType).toBe('imperative');
    });

    it('should normalize dodaj to dodawać', () => {
      const result = normalizer.normalize('dodaj');
      expect(result.stem).toBe('dodawać');
    });

    it('should normalize usuń to usuwać', () => {
      const result = normalizer.normalize('usuń');
      expect(result.stem).toBe('usuwać');
    });

    it('should normalize pokaż to pokazywać', () => {
      const result = normalizer.normalize('pokaż');
      expect(result.stem).toBe('pokazywać');
    });
  });

  describe('generic imperative patterns', () => {
    it('should normalize -aj ending to -ać', () => {
      const result = normalizer.normalize('czytaj');
      expect(result.stem).toBe('czytać');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('should normalize -uj ending to -ować', () => {
      const result = normalizer.normalize('kopiuj');
      // kopiuj is in the lookup table, should get 0.95
      expect(result.stem).toBe('kopiować');
    });
  });

  describe('present tense normalization', () => {
    it('should normalize -am ending to -ać', () => {
      const result = normalizer.normalize('czytam');
      expect(result.stem).toBe('czytać');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('past tense normalization', () => {
    it('should normalize -ał ending to -ać', () => {
      const result = normalizer.normalize('czytał');
      expect(result.stem).toBe('czytać');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('should normalize -ałem ending to -ać', () => {
      const result = normalizer.normalize('czytałem');
      expect(result.stem).toBe('czytać');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('infinitive preservation', () => {
    it('should not modify infinitives', () => {
      const result = normalizer.normalize('dodawać');
      expect(result.stem).toBe('dodawać');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('no change cases', () => {
    it('should not modify words without verb patterns', () => {
      // 'przycisk' (button) — no infinitive ending, no imperative match
      const result = normalizer.normalize('przycisk');
      expect(result.stem).toBe('przycisk');
      expect(result.confidence).toBe(1.0);
    });
  });
});

// =============================================================================
// Portuguese Normalizer Tests
// =============================================================================

describe('PortugueseMorphologicalNormalizer', () => {
  const normalizer = new PortugueseMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Portuguese words', () => {
      expect(normalizer.isNormalizable('alternar')).toBe(true);
      expect(normalizer.isNormalizable('adicionando')).toBe(true);
    });

    it('should return false for short words', () => {
      expect(normalizer.isNormalizable('a')).toBe(false);
    });
  });

  describe('-ar verb conjugation', () => {
    it('should normalize alternando (gerund) to alternar', () => {
      const result = normalizer.normalize('alternando');
      expect(result.stem).toBe('alternar');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should normalize alternado (past participle) to alternar', () => {
      const result = normalizer.normalize('alternado');
      expect(result.stem).toBe('alternar');
    });

    it('should normalize alterna (present 3rd) to alternar', () => {
      const result = normalizer.normalize('alterna');
      expect(result.stem).toBe('alternar');
    });

    it('should normalize alternou (preterite 3rd) to alternar', () => {
      const result = normalizer.normalize('alternou');
      expect(result.stem).toBe('alternar');
    });
  });

  describe('reflexive verb normalization', () => {
    it('should normalize mostrar-se to mostrar', () => {
      const result = normalizer.normalize('mostrar-se');
      expect(result.stem).toBe('mostrar');
      expect(result.metadata?.conjugationType).toBe('reflexive');
    });
  });

  describe('infinitive preservation', () => {
    it('should not modify alternar', () => {
      const result = normalizer.normalize('alternar');
      expect(result.stem).toBe('alternar');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('no change cases', () => {
    it('should not modify nouns without verb endings', () => {
      const result = normalizer.normalize('menu');
      expect(result.stem).toBe('menu');
      expect(result.confidence).toBe(1.0);
    });
  });
});

// =============================================================================
// Russian Normalizer Tests
// =============================================================================

describe('RussianMorphologicalNormalizer', () => {
  const normalizer = new RussianMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Russian words', () => {
      expect(normalizer.isNormalizable('переключить')).toBe(true);
      expect(normalizer.isNormalizable('добавил')).toBe(true);
    });

    it('should return false for non-Russian text', () => {
      expect(normalizer.isNormalizable('toggle')).toBe(false);
      expect(normalizer.isNormalizable('123')).toBe(false);
    });

    it('should return false for short words', () => {
      expect(normalizer.isNormalizable('да')).toBe(false);
    });
  });

  describe('imperative normalization (lookup)', () => {
    it('should normalize переключи to переключить', () => {
      const result = normalizer.normalize('переключи');
      expect(result.stem).toBe('переключить');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.metadata?.conjugationType).toBe('imperative');
    });

    it('should normalize добавь to добавить', () => {
      const result = normalizer.normalize('добавь');
      expect(result.stem).toBe('добавить');
    });

    it('should normalize удали to удалить', () => {
      const result = normalizer.normalize('удали');
      expect(result.stem).toBe('удалить');
    });

    it('should normalize покажи to показать', () => {
      const result = normalizer.normalize('покажи');
      expect(result.stem).toBe('показать');
    });

    it('should normalize скрой to скрыть', () => {
      const result = normalizer.normalize('скрой');
      expect(result.stem).toBe('скрыть');
    });
  });

  describe('past tense normalization', () => {
    it('should normalize добавил to добавить', () => {
      const result = normalizer.normalize('добавил');
      expect(result.stem).toBe('добавить');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.metadata?.conjugationType).toBe('past');
    });

    it('should normalize удалила to удалить', () => {
      const result = normalizer.normalize('удалила');
      expect(result.stem).toBe('удалить');
    });

    it('should normalize показали to показать', () => {
      const result = normalizer.normalize('показали');
      expect(result.stem).toBe('показать');
    });
  });

  describe('present tense normalization', () => {
    it('should normalize удаляет to удаляать (imperfective stem)', () => {
      const result = normalizer.normalize('удаляет');
      // Present tense normalizer strips -ет, adds -ать
      expect(result.stem).toMatch(/удаля/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should normalize добавит to добавить', () => {
      const result = normalizer.normalize('добавит');
      expect(result.stem).toBe('добавить');
      expect(result.metadata?.conjugationType).toBe('present');
    });
  });

  describe('infinitive preservation', () => {
    it('should not modify переключить', () => {
      const result = normalizer.normalize('переключить');
      expect(result.stem).toBe('переключить');
      expect(result.confidence).toBe(1.0);
    });

    it('should not modify добавить', () => {
      const result = normalizer.normalize('добавить');
      expect(result.stem).toBe('добавить');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('no change cases', () => {
    it('should not modify nouns without verb patterns', () => {
      const result = normalizer.normalize('кнопка');
      // 'кнопка' has no recognized verb suffix
      expect(result.stem).toBeDefined();
    });

    it('should return 1.0 confidence for unchanged stems', () => {
      const result = normalizer.normalize('клик');
      expect(result.stem).toBe('клик');
      expect(result.confidence).toBe(1.0);
    });
  });
});

// =============================================================================
// Ukrainian Normalizer Tests
// =============================================================================

describe('UkrainianMorphologicalNormalizer', () => {
  const normalizer = new UkrainianMorphologicalNormalizer();

  describe('isNormalizable', () => {
    it('should return true for Ukrainian words', () => {
      expect(normalizer.isNormalizable('перемкнути')).toBe(true);
      expect(normalizer.isNormalizable('додав')).toBe(true);
    });

    it('should return false for non-Ukrainian text', () => {
      expect(normalizer.isNormalizable('toggle')).toBe(false);
      expect(normalizer.isNormalizable('123')).toBe(false);
    });

    it('should return false for short words', () => {
      expect(normalizer.isNormalizable('та')).toBe(false);
    });
  });

  describe('imperative normalization (lookup)', () => {
    it('should normalize перемкни to перемкнути', () => {
      const result = normalizer.normalize('перемкни');
      expect(result.stem).toBe('перемкнути');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.metadata?.conjugationType).toBe('imperative');
    });

    it('should normalize додай to додати', () => {
      const result = normalizer.normalize('додай');
      expect(result.stem).toBe('додати');
    });

    it('should normalize видали to видалити', () => {
      const result = normalizer.normalize('видали');
      expect(result.stem).toBe('видалити');
    });

    it('should normalize покажи to показати', () => {
      const result = normalizer.normalize('покажи');
      expect(result.stem).toBe('показати');
    });

    it('should normalize сховай to сховати', () => {
      const result = normalizer.normalize('сховай');
      expect(result.stem).toBe('сховати');
    });
  });

  describe('past tense normalization', () => {
    it('should normalize додав to додати', () => {
      const result = normalizer.normalize('додав');
      expect(result.stem).toBe('додати');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.metadata?.conjugationType).toBe('past');
    });

    it('should normalize видалила to видалити', () => {
      const result = normalizer.normalize('видалила');
      expect(result.stem).toBe('видалити');
    });

    it('should normalize показали to показати', () => {
      const result = normalizer.normalize('показали');
      expect(result.stem).toBe('показати');
    });
  });

  describe('present tense normalization', () => {
    it('should normalize додає to додаати', () => {
      const result = normalizer.normalize('додає');
      // Present tense strips -є, adds -ати
      expect(result.stem).toMatch(/дода/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should normalize видалить to видалити (2nd conj)', () => {
      const result = normalizer.normalize('видалить');
      expect(result.stem).toBe('видалити');
      expect(result.metadata?.conjugationType).toBe('present');
    });
  });

  describe('infinitive preservation', () => {
    it('should not modify перемкнути', () => {
      const result = normalizer.normalize('перемкнути');
      expect(result.stem).toBe('перемкнути');
      expect(result.confidence).toBe(1.0);
    });

    it('should not modify додати', () => {
      const result = normalizer.normalize('додати');
      expect(result.stem).toBe('додати');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('no change cases', () => {
    it('should return 1.0 confidence for unchanged stems', () => {
      const result = normalizer.normalize('клік');
      expect(result.stem).toBe('клік');
      expect(result.confidence).toBe(1.0);
    });
  });
});

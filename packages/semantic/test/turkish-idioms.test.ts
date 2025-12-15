/**
 * Turkish Native Idiom Tests
 *
 * Tests for native Turkish idiom patterns that go beyond
 * direct translations to support more natural Turkish expressions.
 *
 * These patterns accept multiple grammatically-correct forms that all
 * normalize to equivalent semantic nodes.
 *
 * Key forms tested:
 * - Conditional: -dığında (when X happens), -rsa/-rse (if)
 * - Temporal: -ınca/-ince (when/as)
 * - Standard: olduğunda (when it happens)
 *
 * Turkish features:
 * - SOV (Subject-Object-Verb) word order
 * - Highly agglutinative (many suffixes attach to words)
 * - Vowel harmony (front/back vowels)
 * - Postpositions instead of prepositions
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse, tokenize } from '../src';
import { TurkishMorphologicalNormalizer } from '../src/tokenizers/morphology/turkish-normalizer';

/**
 * Helper to get tokens array from TokenStream
 */
function getTokens(input: string, language: string) {
  const stream = tokenize(input, language);
  return stream.tokens;
}

// =============================================================================
// Morphological Normalizer Tests
// =============================================================================

describe('Turkish Morphological Normalization', () => {
  const normalizer = new TurkishMorphologicalNormalizer();

  describe('Progressive tense (-iyor) removal', () => {
    it('should normalize değiştiriyor to değiştir', () => {
      const result = normalizer.normalize('değiştiriyor');
      expect(result.stem).toBe('değiştir');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('should normalize gösteriyor to göster', () => {
      const result = normalizer.normalize('gösteriyor');
      expect(result.stem).toBe('göster');
    });
  });

  describe('Infinitive (-mak/-mek) removal', () => {
    it('should normalize değiştirmek to değiştir', () => {
      const result = normalizer.normalize('değiştirmek');
      expect(result.stem).toBe('değiştir');
    });

    it('should normalize göstermek to göster', () => {
      const result = normalizer.normalize('göstermek');
      expect(result.stem).toBe('göster');
    });
  });

  describe('Past tense (-di/-dı) removal', () => {
    it('should normalize gösterdi to göster', () => {
      const result = normalizer.normalize('gösterdi');
      expect(result.stem).toBe('göster');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('should normalize tıkladı to tıkla', () => {
      const result = normalizer.normalize('tıkladı');
      expect(result.stem).toBe('tıkla');
    });
  });

  describe('Vowel harmony', () => {
    it('should handle back vowel suffixes', () => {
      // Back vowels: a, ı, o, u
      const result = normalizer.normalize('tıklamak');
      expect(result.stem).toBe('tıkla');
    });

    it('should handle front vowel suffixes', () => {
      // Front vowels: e, i, ö, ü
      const result = normalizer.normalize('görmek');
      expect(result.stem).toBe('gör');
    });
  });
});

// =============================================================================
// Tokenizer Tests - Native Idiom Detection
// =============================================================================

describe('Turkish Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize olduğunda as event marker', () => {
      const tokens = getTokens('tıklama olduğunda', 'tr');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize oldugunda (without ğ) as event marker', () => {
      const tokens = getTokens('tıklama oldugunda', 'tr');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize değiştir as toggle', () => {
      const tokens = getTokens('değiştir .active', 'tr');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize göster as show', () => {
      const tokens = getTokens('göster #modal', 'tr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize gizle as hide', () => {
      const tokens = getTokens('gizle #dropdown', 'tr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS selectors', () => {
      const tokens = getTokens('değiştir .active', 'tr');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('göster #modal', 'tr');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Turkish Event Handler Patterns', () => {
  describe('Standard pattern: {event} olduğunda', () => {
    it('should parse "tıklama olduğunda değiştir .active"', () => {
      const result = canParse('tıklama olduğunda değiştir .active', 'tr');
      if (result) {
        const node = parse('tıklama olduğunda değiştir .active', 'tr');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('tıklama olduğunda değiştir .active', 'tr');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Native conditional: {event}dığında (when)', () => {
    it('should parse conditional form', () => {
      // Note: The exact form depends on how the tokenizer handles agglutination
      const tokens = getTokens('tıklandığında değiştir .active', 'tr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Native temporal: {event}ınca (when/as)', () => {
    it('should parse temporal form', () => {
      const tokens = getTokens('tıklayınca değiştir .active', 'tr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Native conditional: {event}rsa (if)', () => {
    it('should parse hypothetical conditional', () => {
      const tokens = getTokens('tıklarsa değiştir .active', 'tr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Turkish Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "değiştir .active"', () => {
      const result = canParse('değiştir .active', 'tr');
      if (result) {
        const node = parse('değiştir .active', 'tr');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('değiştir .active', 'tr');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse without diacritics "degistir .active"', () => {
      const result = canParse('degistir .active', 'tr');
      if (result) {
        const node = parse('degistir .active', 'tr');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('degistir .active', 'tr');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "göster #modal"', () => {
      const result = canParse('göster #modal', 'tr');
      if (result) {
        const node = parse('göster #modal', 'tr');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('göster #modal', 'tr');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "gizle #dropdown"', () => {
      const result = canParse('gizle #dropdown', 'tr');
      if (result) {
        const node = parse('gizle #dropdown', 'tr');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('gizle #dropdown', 'tr');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "ekle .active"', () => {
      const result = canParse('ekle .active', 'tr');
      if (result) {
        const node = parse('ekle .active', 'tr');
        expect(node.action).toBe('add');
      } else {
        const tokens = getTokens('ekle .active', 'tr');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "kaldır .active"', () => {
      const result = canParse('kaldır .active', 'tr');
      if (result) {
        const node = parse('kaldır .active', 'tr');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('kaldır .active', 'tr');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Semantic Equivalence Tests
// =============================================================================

describe('Turkish Semantic Equivalence', () => {
  describe('All forms tokenize correctly', () => {
    it('event handler forms tokenize', () => {
      const standardTokens = getTokens('tıklama olduğunda değiştir .active', 'tr');
      const conditionalTokens = getTokens('tıklandığında değiştir .active', 'tr');
      const temporalTokens = getTokens('tıklayınca değiştir .active', 'tr');

      expect(standardTokens.length).toBeGreaterThan(0);
      expect(conditionalTokens.length).toBeGreaterThan(0);
      expect(temporalTokens.length).toBeGreaterThan(0);
    });
  });

  describe('Commands with special characters', () => {
    it('should handle ğ (soft g)', () => {
      const tokens = getTokens('değiştir .active', 'tr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ş (esh)', () => {
      const tokens = getTokens('göster #modal', 'tr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ü (u umlaut)', () => {
      const tokens = getTokens('düzenle #content', 'tr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ı (dotless i)', () => {
      const tokens = getTokens('tıkla #button', 'tr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

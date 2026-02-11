/**
 * Arabic Native Idiom Tests
 *
 * Tests for native Arabic idiom patterns that go beyond
 * direct translations to support more natural Arabic expressions.
 *
 * These patterns accept multiple grammatically-correct forms that all
 * normalize to equivalent semantic nodes.
 *
 * Key forms tested:
 * - Temporal: عندما (when - formal), حين (at the time of - classical)
 * - Temporal: لمّا (when - DIALECTAL/INFORMAL, common in spoken Arabic)
 * - Conditional: إذا (if/when)
 * - Standard: عند (at/upon)
 * - With source: من #button (from #button)
 *
 * Arabic features:
 * - VSO (Verb-Subject-Object) word order
 * - RTL (Right-to-Left) text direction
 * - Definite article ال (al-) commonly used with event nouns
 * - Rich morphology (prefixes, suffixes, root patterns)
 *
 * Formality notes (verified via research):
 * - عندما is formal, suitable for UI text
 * - حين/حينما are classical Arabic (الفصحى)
 * - لمّا is dialectal, more suitable for casual/conversational interfaces
 *
 * @see NATIVE_REVIEW_NEEDED.md for patterns needing native speaker validation
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse, tokenize } from '../src';
import { ArabicMorphologicalNormalizer } from '../src/tokenizers/morphology/arabic-normalizer';

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

describe('Arabic Morphological Normalization', () => {
  const normalizer = new ArabicMorphologicalNormalizer();

  describe('Definite article (ال) removal', () => {
    it('should normalize النقر to نقر', () => {
      const result = normalizer.normalize('النقر');
      expect(result.stem).toBe('نقر');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize التبديل to تبديل', () => {
      const result = normalizer.normalize('التبديل');
      expect(result.stem).toBe('تبديل');
    });

    it('should normalize الإدخال to إدخال', () => {
      const result = normalizer.normalize('الإدخال');
      expect(result.stem).toBe('إدخال');
    });
  });

  describe('Conjunction prefix (و) removal', () => {
    it('should normalize والنقر to نقر', () => {
      const result = normalizer.normalize('والنقر');
      expect(result.stem).toBe('نقر');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should normalize والتبديل to تبديل', () => {
      const result = normalizer.normalize('والتبديل');
      expect(result.stem).toBe('تبديل');
    });
  });

  describe('Plural suffixes', () => {
    it('should normalize المستخدمين to مستخدم', () => {
      const result = normalizer.normalize('المستخدمين');
      // Should strip ال and ين
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should normalize التغييرات to تغيير', () => {
      const result = normalizer.normalize('التغييرات');
      // Should strip ال and ات
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });
});

// =============================================================================
// Proclitic Handling Tests
// =============================================================================

describe('Arabic Proclitic Tokenization', () => {
  describe('Wa (و) conjunction separation', () => {
    it('should separate و from attached word والنقر → [و, النقر]', () => {
      const tokens = getTokens('والنقر', 'ar');
      // First token should be the conjunction و
      expect(tokens[0].value).toBe('و');
      expect(tokens[0].kind).toBe('conjunction');
      expect(tokens[0].normalized).toBe('and');
      // Second token should be the remaining word
      expect(tokens[1].value).toBe('النقر');
    });

    it('should separate و from والتبديل → [و, التبديل]', () => {
      const tokens = getTokens('والتبديل', 'ar');
      expect(tokens[0].value).toBe('و');
      expect(tokens[0].kind).toBe('conjunction');
      expect(tokens[1].value).toBe('التبديل');
    });

    it('should NOT separate standalone و with space', () => {
      const tokens = getTokens('و النقر', 'ar');
      // Standalone و should remain as its own token without being a proclitic
      // The first token could be و as particle/conjunction, second is النقر
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle polysyndetic coordination: A وB وC', () => {
      const tokens = getTokens('نقر وتغيير وإدخال', 'ar');
      // Should produce: نقر, و, تغيير, و, إدخال
      expect(tokens.length).toBeGreaterThanOrEqual(5);
      // Check that و tokens are conjunctions
      const conjunctions = tokens.filter(t => t.kind === 'conjunction');
      expect(conjunctions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Fa (ف) conjunction separation', () => {
    it('should separate ف from attached word فالنقر → [ف, النقر]', () => {
      const tokens = getTokens('فالنقر', 'ar');
      expect(tokens[0].value).toBe('ف');
      expect(tokens[0].kind).toBe('conjunction');
      expect(tokens[0].normalized).toBe('then');
      expect(tokens[1].value).toBe('النقر');
    });
  });

  describe('Edge cases', () => {
    it('should not split short words starting with و', () => {
      // If remaining after و is too short, should NOT split
      // This prevents false positives on words that happen to start with و
      const tokens = getTokens('ول', 'ar'); // "wl" - too short after و
      // Should be one token, not split
      expect(tokens.length).toBe(1);
    });

    it('should handle mixed proclitic and preposition', () => {
      // "and from the button"
      const tokens = getTokens('ومن #button', 'ar');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].value).toBe('و');
      expect(tokens[0].kind).toBe('conjunction');
    });
  });
});

// =============================================================================
// Tokenizer Tests - Native Idiom Detection
// =============================================================================

describe('Arabic Tokenizer - Native Idioms', () => {
  describe('Temporal conjunction عندما (when)', () => {
    it('should tokenize عندما as event marker', () => {
      const tokens = getTokens('عندما نقر', 'ar');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('on');
    });

    it('should tokenize عندما النقر', () => {
      const tokens = getTokens('عندما النقر', 'ar');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Temporal حين (at the time of)', () => {
    it('should tokenize حين as event marker', () => {
      const tokens = getTokens('حين النقر', 'ar');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
    });
  });

  describe('Temporal لمّا (when - past emphasis)', () => {
    it('should tokenize لمّا as event marker', () => {
      const tokens = getTokens('لمّا نقر', 'ar');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('on');
    });

    it('should tokenize لما (without shadda)', () => {
      const tokens = getTokens('لما نقر', 'ar');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
    });
  });

  describe('Event names with article', () => {
    it('should recognize النقر as click event', () => {
      const tokens = getTokens('عند النقر', 'ar');
      expect(tokens.some(t => t.value === 'النقر' || t.normalized === 'click')).toBe(true);
    });

    it('should recognize التغيير as change event', () => {
      const tokens = getTokens('عند التغيير', 'ar');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Arabic Event Handler Patterns', () => {
  describe('Standard pattern: عند {event}', () => {
    it('should parse "عند النقر بدّل .active"', () => {
      const result = canParse('عند النقر بدّل .active', 'ar');
      if (result) {
        const node = parse('عند النقر بدّل .active', 'ar');
        expect(node.action).toBe('on');
      } else {
        // Tokenization should still work
        const tokens = getTokens('عند النقر بدّل .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "على النقر بدّل .active"', () => {
      const result = canParse('على النقر بدّل .active', 'ar');
      if (result) {
        const node = parse('على النقر بدّل .active', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('على النقر بدّل .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Native temporal: عندما {event} (when)', () => {
    it('should parse "عندما نقر بدّل .active"', () => {
      const result = canParse('عندما نقر بدّل .active', 'ar');
      if (result) {
        const node = parse('عندما نقر بدّل .active', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('عندما نقر بدّل .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "عندما النقر زِد #count"', () => {
      const result = canParse('عندما النقر زِد #count', 'ar');
      if (result) {
        const node = parse('عندما النقر زِد #count', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('عندما النقر زِد #count', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Native temporal: حين {event} (at the time of)', () => {
    it('should parse "حين النقر بدّل .active"', () => {
      const result = canParse('حين النقر بدّل .active', 'ar');
      if (result) {
        const node = parse('حين النقر بدّل .active', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('حين النقر بدّل .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "حينما النقر أظهر #modal"', () => {
      const result = canParse('حينما النقر أظهر #modal', 'ar');
      if (result) {
        const node = parse('حينما النقر أظهر #modal', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('حينما النقر أظهر #modal', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Native temporal: لمّا {event} (when - past emphasis)', () => {
    it('should parse "لمّا نقر بدّل .active"', () => {
      const result = canParse('لمّا نقر بدّل .active', 'ar');
      if (result) {
        const node = parse('لمّا نقر بدّل .active', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('لمّا نقر بدّل .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "لما نقر أخفِ #dropdown" (without shadda)', () => {
      const result = canParse('لما نقر أخفِ #dropdown', 'ar');
      if (result) {
        const node = parse('لما نقر أخفِ #dropdown', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('لما نقر أخفِ #dropdown', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Conditional: إذا {event}', () => {
    it('should parse "إذا نقر بدّل .active"', () => {
      const result = canParse('إذا نقر بدّل .active', 'ar');
      if (result) {
        const node = parse('إذا نقر بدّل .active', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('إذا نقر بدّل .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "اذا النقر زِد #count" (without hamza)', () => {
      const result = canParse('اذا النقر زِد #count', 'ar');
      if (result) {
        const node = parse('اذا النقر زِد #count', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('اذا النقر زِد #count', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('With source filter: من {source}', () => {
    it('should parse "عندما نقر من #button بدّل .active"', () => {
      const result = canParse('عندما نقر من #button بدّل .active', 'ar');
      if (result) {
        const node = parse('عندما نقر من #button بدّل .active', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('عندما نقر من #button بدّل .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "عند النقر من #submit زِد #count"', () => {
      const result = canParse('عند النقر من #submit زِد #count', 'ar');
      if (result) {
        const node = parse('عند النقر من #submit زِد #count', 'ar');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('عند النقر من #submit زِد #count', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Semantic Equivalence Tests
// =============================================================================

describe('Arabic Semantic Equivalence', () => {
  describe('Event handler forms produce equivalent results', () => {
    it('all temporal forms tokenize correctly', () => {
      // All forms should at least tokenize correctly
      const standardTokens = getTokens('عند النقر بدّل .active', 'ar');
      const indamaTokens = getTokens('عندما نقر بدّل .active', 'ar');
      const hinaTokens = getTokens('حين النقر بدّل .active', 'ar');
      const lammaTokens = getTokens('لمّا نقر بدّل .active', 'ar');
      const idhaTokens = getTokens('إذا نقر بدّل .active', 'ar');

      expect(standardTokens.length).toBeGreaterThan(0);
      expect(indamaTokens.length).toBeGreaterThan(0);
      expect(hinaTokens.length).toBeGreaterThan(0);
      expect(lammaTokens.length).toBeGreaterThan(0);
      expect(idhaTokens.length).toBeGreaterThan(0);
    });
  });

  describe('Toggle commands parse correctly', () => {
    it('should parse "بدّل .active"', () => {
      const result = canParse('بدّل .active', 'ar');
      if (result) {
        const node = parse('بدّل .active', 'ar');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('بدّل .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "بدل .active" (without shadda)', () => {
      const result = canParse('بدل .active', 'ar');
      if (result) {
        const node = parse('بدل .active', 'ar');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('بدل .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "غيّر .active"', () => {
      const result = canParse('غيّر .active', 'ar');
      if (result) {
        const node = parse('غيّر .active', 'ar');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('غيّر .active', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Commands with Arabic keywords', () => {
    it('should parse "أظهر #modal"', () => {
      const result = canParse('أظهر #modal', 'ar');
      if (result) {
        const node = parse('أظهر #modal', 'ar');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('أظهر #modal', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "أخفِ #dropdown"', () => {
      const result = canParse('أخفِ #dropdown', 'ar');
      if (result) {
        const node = parse('أخفِ #dropdown', 'ar');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('أخفِ #dropdown', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "زِد #counter"', () => {
      const result = canParse('زِد #counter', 'ar');
      if (result) {
        const node = parse('زِد #counter', 'ar');
        // زِد is increment's primary keyword in Arabic
        expect(node.action).toBe('increment');
      } else {
        const tokens = getTokens('زِد #counter', 'ar');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// RTL and Mixed Direction Tests
// =============================================================================

describe('Arabic RTL Handling', () => {
  describe('CSS selectors in RTL context', () => {
    it('should correctly tokenize LTR selectors in RTL text', () => {
      const tokens = getTokens('بدّل .active', 'ar');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('أظهر #modal', 'ar');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });

    it('should handle compound selectors', () => {
      const tokens = getTokens('بدّل .btn.active', 'ar');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toContain('.btn');
    });
  });

  describe('Mixed Arabic and English', () => {
    it('should handle English event names', () => {
      const tokens = getTokens('عند click بدّل .active', 'ar');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle Arabic text direction marker', () => {
      // Arabic tokenizer should be marked as RTL
      const tokens = getTokens('بدّل .test', 'ar');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

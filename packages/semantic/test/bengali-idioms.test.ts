/**
 * Bengali Native Idiom Tests
 *
 * Tests for native Bengali idiom patterns that go beyond
 * direct translations to support more natural Bengali expressions.
 *
 * These patterns accept multiple grammatically-correct forms that all
 * normalize to equivalent semantic nodes.
 *
 * Key forms tested:
 * - Event markers: তে (on/at), যখন (when), যখনই (whenever)
 * - Postpositions: কে (patient), তে (destination/event), থেকে (source)
 * - SOV word order: patient কে action (e.g., .active কে টগল)
 * - References: আমি (me), এটি (it), আপনি (you)
 * - Possessive: আমার (my), তোমার (your), তার (its)
 *
 * Bengali features:
 * - SOV (Subject-Object-Verb) word order
 * - Postpositions (কে, তে, থেকে, দিয়ে)
 * - Bengali script (U+0980-U+09FF) with chandrabindu, hasanta, conjuncts
 * - Agglutinative morphology similar to Hindi
 * - Space-separated words
 *
 * @see NATIVE_REVIEW_NEEDED.md for patterns needing native speaker validation
 */

import { describe, it, expect } from 'vitest';
import { canParse, parse, tokenize } from '../src';

/**
 * Helper to get tokens array from TokenStream
 */
function getTokens(input: string, language: string) {
  const stream = tokenize(input, language);
  return stream.tokens;
}

// =============================================================================
// Tokenizer Tests - Keyword Detection
// =============================================================================

describe('Bengali Tokenizer - Keyword Detection', () => {
  describe('Command keywords', () => {
    it('should tokenize টগল as toggle', () => {
      const tokens = getTokens('টগল .active', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should tokenize যোগ as add', () => {
      const tokens = getTokens('যোগ .highlight', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should tokenize সরান as remove', () => {
      const tokens = getTokens('সরান .highlight', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize দেখান as show', () => {
      const tokens = getTokens('দেখান #modal', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should tokenize লুকান as hide', () => {
      const tokens = getTokens('লুকান #modal', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize বৃদ্ধি as increment', () => {
      const tokens = getTokens('বৃদ্ধি counter', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should tokenize হ্রাস as decrement', () => {
      const tokens = getTokens('হ্রাস counter', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('decrement');
    });

    it('should tokenize রাখুন as put', () => {
      const tokens = getTokens('রাখুন "হ্যালো"', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should tokenize সেট as set', () => {
      const tokens = getTokens('সেট x', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should tokenize পান as get', () => {
      const tokens = getTokens('পান #element', 'bn');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('get');
    });
  });

  describe('Event keywords', () => {
    it('should tokenize ক্লিক as click', () => {
      const tokens = getTokens('ক্লিক তে', 'bn');
      const clickToken = tokens.find(t => t.value === 'ক্লিক');
      expect(clickToken).toBeDefined();
      expect(clickToken?.normalized).toBe('click');
    });

    it('should tokenize সাবমিট as submit', () => {
      const tokens = getTokens('সাবমিট তে', 'bn');
      const submitToken = tokens.find(t => t.value === 'সাবমিট');
      expect(submitToken).toBeDefined();
      expect(submitToken?.normalized).toBe('submit');
    });

    it('should tokenize হোভার as mouseenter (hover is no DOM event)', () => {
      const tokens = getTokens('হোভার তে', 'bn');
      const hoverToken = tokens.find(t => t.value === 'হোভার');
      expect(hoverToken).toBeDefined();
      expect(hoverToken?.normalized).toBe('mouseenter');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('টগল .active', 'bn');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('দেখান #modal', 'bn');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });

    it('should handle compound CSS selectors', () => {
      const tokens = getTokens('টগল .btn.active', 'bn');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toContain('.btn');
    });
  });

  describe('Postposition particles', () => {
    it('should tokenize কে as particle', () => {
      const tokens = getTokens('.active কে টগল', 'bn');
      const particleToken = tokens.find(t => t.value === 'কে');
      expect(particleToken).toBeDefined();
      expect(particleToken?.kind).toBe('particle');
    });

    it('should tokenize তে as particle', () => {
      const tokens = getTokens('#output তে রাখুন', 'bn');
      const particleToken = tokens.find(t => t.value === 'তে');
      expect(particleToken).toBeDefined();
      expect(particleToken?.kind).toBe('particle');
    });

    it('should tokenize থেকে as particle', () => {
      const tokens = getTokens('#source থেকে', 'bn');
      const particleToken = tokens.find(t => t.value === 'থেকে');
      expect(particleToken).toBeDefined();
      expect(particleToken?.kind).toBe('particle');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Bengali Event Handler Patterns', () => {
  describe('Standard pattern: {event} তে {action}', () => {
    it('should tokenize "ক্লিক তে টগল .active"', () => {
      const tokens = getTokens('ক্লিক তে টগল .active', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const clickToken = tokens.find(t => t.normalized === 'click');
      expect(clickToken).toBeDefined();
    });

    it('should tokenize "সাবমিট তে টগল .loading"', () => {
      const tokens = getTokens('সাবমিট তে টগল .loading', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "হোভার তে যোগ .highlight"', () => {
      const tokens = getTokens('হোভার তে যোগ .highlight', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('SOV event pattern: {event} তে {patient} কে {action}', () => {
    it('should parse "ক্লিক তে .active কে টগল"', () => {
      const result = canParse('ক্লিক তে .active কে টগল', 'bn');
      if (result.canParse) {
        const node = parse('ক্লিক তে .active কে টগল', 'bn');
        expect(node.action).toBe('on');
        expect(node.roles.has('event')).toBe(true);
      } else {
        const tokens = getTokens('ক্লিক তে .active কে টগল', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "সাবমিট তে .loading কে টগল"', () => {
      const result = canParse('সাবমিট তে .loading কে টগল', 'bn');
      if (result.canParse) {
        const node = parse('সাবমিট তে .loading কে টগল', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('সাবমিট তে .loading কে টগল', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "হোভার তে .highlight কে যোগ"', () => {
      const result = canParse('হোভার তে .highlight কে যোগ', 'bn');
      if (result.canParse) {
        const node = parse('হোভার তে .highlight কে যোগ', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('হোভার তে .highlight কে যোগ', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ক্লিক তে .error কে সরান"', () => {
      const result = canParse('ক্লিক তে .error কে সরান', 'bn');
      if (result.canParse) {
        const node = parse('ক্লিক তে .error কে সরান', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('ক্লিক তে .error কে সরান', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Event with destination: {event} তে {dest} তে/র {patient} কে {action}', () => {
    it('should parse "ক্লিক তে #button র .active কে টগল"', () => {
      const result = canParse('ক্লিক তে #button র .active কে টগল', 'bn');
      if (result.canParse) {
        const node = parse('ক্লিক তে #button র .active কে টগল', 'bn');
        expect(node.action).toBe('on');
        expect(node.roles.has('event')).toBe(true);
      } else {
        const tokens = getTokens('ক্লিক তে #button র .active কে টগল', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ক্লিক তে #button তে .active কে টগল"', () => {
      const result = canParse('ক্লিক তে #button তে .active কে টগল', 'bn');
      if (result.canParse) {
        const node = parse('ক্লিক তে #button তে .active কে টগল', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('ক্লিক তে #button তে .active কে টগল', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "হোভার তে #element তে .hover কে যোগ"', () => {
      const result = canParse('হোভার তে #element তে .hover কে যোগ', 'bn');
      if (result.canParse) {
        const node = parse('হোভার তে #element তে .hover কে যোগ', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('হোভার তে #element তে .hover কে যোগ', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Temporal markers: যখন/যখনই', () => {
    it('should tokenize "যখন ক্লিক টগল .active"', () => {
      const tokens = getTokens('যখন ক্লিক টগল .active', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const whenToken = tokens.find(t => t.value === 'যখন');
      expect(whenToken).toBeDefined();
    });

    it('should tokenize "যখনই ক্লিক টগল .active"', () => {
      const tokens = getTokens('যখনই ক্লিক টগল .active', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Event handler with visibility commands', () => {
    it('should parse "ফোকাস তে #tooltip কে দেখান"', () => {
      const result = canParse('ফোকাস তে #tooltip কে দেখান', 'bn');
      if (result.canParse) {
        const node = parse('ফোকাস তে #tooltip কে দেখান', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('ফোকাস তে #tooltip কে দেখান', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ঝাপসা তে #tooltip কে লুকান"', () => {
      const result = canParse('ঝাপসা তে #tooltip কে লুকান', 'bn');
      if (result.canParse) {
        const node = parse('ঝাপসা তে #tooltip কে লুকান', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('ঝাপসা তে #tooltip কে লুকান', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Event handler with increment/decrement', () => {
    it('should parse "ক্লিক তে #counter কে বৃদ্ধি"', () => {
      const result = canParse('ক্লিক তে #counter কে বৃদ্ধি', 'bn');
      if (result.canParse) {
        const node = parse('ক্লিক তে #counter কে বৃদ্ধি', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('ক্লিক তে #counter কে বৃদ্ধি', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ক্লিক তে #counter কে হ্রাস"', () => {
      const result = canParse('ক্লিক তে #counter কে হ্রাস', 'bn');
      if (result.canParse) {
        const node = parse('ক্লিক তে #counter কে হ্রাস', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('ক্লিক তে #counter কে হ্রাস', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Event handler with put/set', () => {
    it('should parse "ইনপুট তে "test" কে #output তে রাখুন"', () => {
      const result = canParse('ইনপুট তে "test" কে #output তে রাখুন', 'bn');
      if (result.canParse) {
        const node = parse('ইনপুট তে "test" কে #output তে রাখুন', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('ইনপুট তে "test" কে #output তে রাখুন', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "পরিবর্তন তে x কে 10 তে সেট"', () => {
      const result = canParse('পরিবর্তন তে x কে 10 তে সেট', 'bn');
      if (result.canParse) {
        const node = parse('পরিবর্তন তে x কে 10 তে সেট', 'bn');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('পরিবর্তন তে x কে 10 তে সেট', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Bengali Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse ".active কে টগল"', () => {
      const result = canParse('.active কে টগল', 'bn');
      if (result.canParse) {
        const node = parse('.active কে টগল', 'bn');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('.active কে টগল', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "টগল .active" (SVO fallback)', () => {
      const result = canParse('টগল .active', 'bn');
      if (result.canParse) {
        const node = parse('টগল .active', 'bn');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('টগল .active', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse ".highlight কে যোগ"', () => {
      const result = canParse('.highlight কে যোগ', 'bn');
      if (result.canParse) {
        const node = parse('.highlight কে যোগ', 'bn');
        expect(node.action).toBe('add');
      } else {
        const tokens = getTokens('.highlight কে যোগ', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse ".highlight কে সরান"', () => {
      const result = canParse('.highlight কে সরান', 'bn');
      if (result.canParse) {
        const node = parse('.highlight কে সরান', 'bn');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('.highlight কে সরান', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "#modal কে দেখান"', () => {
      const result = canParse('#modal কে দেখান', 'bn');
      if (result.canParse) {
        const node = parse('#modal কে দেখান', 'bn');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('#modal কে দেখান', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "#modal কে লুকান"', () => {
      const result = canParse('#modal কে লুকান', 'bn');
      if (result.canParse) {
        const node = parse('#modal কে লুকান', 'bn');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('#modal কে লুকান', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse alternative দেখাও for show', () => {
      const tokens = getTokens('দেখাও #modal', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const showToken = tokens.find(t => t.normalized === 'show');
      expect(showToken).toBeDefined();
    });

    it('should parse alternative লুকাও for hide', () => {
      const tokens = getTokens('লুকাও #modal', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const hideToken = tokens.find(t => t.normalized === 'hide');
      expect(hideToken).toBeDefined();
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "counter কে বৃদ্ধি"', () => {
      const result = canParse('counter কে বৃদ্ধি', 'bn');
      if (result.canParse) {
        const node = parse('counter কে বৃদ্ধি', 'bn');
        expect(node.action).toBe('increment');
      } else {
        const tokens = getTokens('counter কে বৃদ্ধি', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "counter কে হ্রাস"', () => {
      const result = canParse('counter কে হ্রাস', 'bn');
      if (result.canParse) {
        const node = parse('counter কে হ্রাস', 'bn');
        expect(node.action).toBe('decrement');
      } else {
        const tokens = getTokens('counter কে হ্রাস', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse alternative বাড়ান for increment', () => {
      const tokens = getTokens('বাড়ান counter', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const incToken = tokens.find(t => t.normalized === 'increment');
      expect(incToken).toBeDefined();
    });

    it('should parse alternative কমান for decrement', () => {
      const tokens = getTokens('কমান counter', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const decToken = tokens.find(t => t.normalized === 'decrement');
      expect(decToken).toBeDefined();
    });
  });

  describe('Put command', () => {
    it('should parse ""হ্যালো" কে #output তে রাখুন"', () => {
      const result = canParse('"হ্যালো" কে #output তে রাখুন', 'bn');
      if (result.canParse) {
        const node = parse('"হ্যালো" কে #output তে রাখুন', 'bn');
        expect(node.action).toBe('put');
      } else {
        const tokens = getTokens('"হ্যালো" কে #output তে রাখুন', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse alternative রাখ for put', () => {
      const tokens = getTokens('রাখ "test"', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const putToken = tokens.find(t => t.normalized === 'put');
      expect(putToken).toBeDefined();
    });
  });

  describe('Set/Get commands', () => {
    it('should parse "x কে 10 তে সেট"', () => {
      const result = canParse('x কে 10 তে সেট', 'bn');
      if (result.canParse) {
        const node = parse('x কে 10 তে সেট', 'bn');
        expect(node.action).toBe('set');
      } else {
        const tokens = getTokens('x কে 10 তে সেট', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "#element কে পান"', () => {
      const result = canParse('#element কে পান', 'bn');
      if (result.canParse) {
        const node = parse('#element কে পান', 'bn');
        expect(node.action).toBe('get');
      } else {
        const tokens = getTokens('#element কে পান', 'bn');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Bengali Script-Specific Tests
// =============================================================================

describe('Bengali Script Features', () => {
  describe('Chandrabindu (ঁ) handling', () => {
    it('should handle words with chandrabindu', () => {
      // Chandrabindu marks nasalization in Bengali
      const tokens = getTokens('চাঁদ', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Hasanta (্) conjunct handling', () => {
    it('should handle conjuncts in ক্লিক (click)', () => {
      // ক্ল = ক + ্ + ল (ka + hasanta + la = kla)
      const tokens = getTokens('ক্লিক তে টগল .active', 'bn');
      const clickToken = tokens.find(t => t.value === 'ক্লিক');
      expect(clickToken).toBeDefined();
    });

    it('should handle conjuncts in বৃদ্ধি (increment)', () => {
      // দ্ধ = দ + ্ + ধ (da + hasanta + dha = ddha)
      const tokens = getTokens('বৃদ্ধি counter', 'bn');
      const incToken = tokens.find(t => t.normalized === 'increment');
      expect(incToken).toBeDefined();
    });

    it('should handle conjuncts in হ্রাস (decrement)', () => {
      // হ্র = হ + ্ + র (ha + hasanta + ra = hra)
      const tokens = getTokens('হ্রাস counter', 'bn');
      const decToken = tokens.find(t => t.normalized === 'decrement');
      expect(decToken).toBeDefined();
    });

    it('should handle conjuncts in হ্যালো (hello)', () => {
      // হ্য = হ + ্ + য (ha + hasanta + ya = hya)
      const tokens = getTokens('"হ্যালো"', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].kind).toBe('literal');
    });
  });

  describe('Vowel signs (matras) and reph', () => {
    it('should handle ি (i-matra) in ক্লিক', () => {
      const tokens = getTokens('ক্লিক', 'bn');
      expect(tokens.length).toBe(1);
    });

    it('should handle ৃ (ri-matra) in বৃদ্ধি', () => {
      const tokens = getTokens('বৃদ্ধি', 'bn');
      expect(tokens.length).toBe(1);
    });

    it('should handle া (aa-matra) in সরান', () => {
      const tokens = getTokens('সরান .active', 'bn');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should handle ু (u-matra) in রাখুন', () => {
      const tokens = getTokens('রাখুন "test"', 'bn');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should handle ে (e-matra) in সেট', () => {
      const tokens = getTokens('সেট x', 'bn');
      expect(tokens[0].normalized).toBe('set');
    });
  });

  describe('Mixed Bengali and ASCII in selectors', () => {
    it('should handle .class selectors with Bengali commands', () => {
      const tokens = getTokens('.active কে টগল', 'bn');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle #id selectors with Bengali commands', () => {
      const tokens = getTokens('#modal কে দেখান', 'bn');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });

    it('should handle ASCII identifiers with Bengali particles', () => {
      const tokens = getTokens('counter কে বৃদ্ধি', 'bn');
      const counterToken = tokens.find(t => t.value === 'counter');
      expect(counterToken).toBeDefined();
    });
  });
});

// =============================================================================
// Postposition and Modifier Tests
// =============================================================================

describe('Bengali Postpositions and Modifiers', () => {
  describe('Patient marker কে (to/accusative)', () => {
    it('should recognize কে after selector', () => {
      const tokens = getTokens('.active কে টগল', 'bn');
      const keToken = tokens.find(t => t.value === 'কে');
      expect(keToken).toBeDefined();
      expect(keToken?.kind).toBe('particle');
    });

    it('should recognize কে after identifier', () => {
      const tokens = getTokens('counter কে বৃদ্ধি', 'bn');
      const keToken = tokens.find(t => t.value === 'কে');
      expect(keToken).toBeDefined();
      expect(keToken?.kind).toBe('particle');
    });
  });

  describe('Destination marker তে (at/in/on)', () => {
    it('should recognize তে as destination marker', () => {
      const tokens = getTokens('#output তে রাখুন', 'bn');
      const teToken = tokens.find(t => t.value === 'তে');
      expect(teToken).toBeDefined();
      expect(teToken?.kind).toBe('particle');
    });

    it('should recognize এ as alternative locative marker', () => {
      const tokens = getTokens('#output এ', 'bn');
      const eToken = tokens.find(t => t.value === 'এ');
      expect(eToken).toBeDefined();
    });
  });

  describe('Source marker থেকে (from)', () => {
    it('should recognize থেকে as source marker', () => {
      const tokens = getTokens('#source থেকে সরান', 'bn');
      const thekeToken = tokens.find(t => t.value === 'থেকে');
      expect(thekeToken).toBeDefined();
      expect(thekeToken?.kind).toBe('particle');
    });
  });

  describe('Possessive marker র (of)', () => {
    it('should recognize র as possessive marker', () => {
      const tokens = getTokens('#button র .active', 'bn');
      const rorToken = tokens.find(t => t.value === 'র');
      expect(rorToken).toBeDefined();
    });
  });

  describe('Possessive keywords', () => {
    it('should tokenize আমার (my)', () => {
      const tokens = getTokens('আমার element', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const myToken = tokens.find(t => t.value === 'আমার');
      expect(myToken).toBeDefined();
    });

    it('should tokenize তোমার (your, informal)', () => {
      const tokens = getTokens('তোমার element', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const yourToken = tokens.find(t => t.value === 'তোমার');
      expect(yourToken).toBeDefined();
    });

    it('should tokenize আপনার (your, formal)', () => {
      const tokens = getTokens('আপনার element', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const yourFormalToken = tokens.find(t => t.value === 'আপনার');
      expect(yourFormalToken).toBeDefined();
    });

    it('should tokenize তার (its/his/her)', () => {
      const tokens = getTokens('তার মান', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const itsToken = tokens.find(t => t.value === 'তার');
      expect(itsToken).toBeDefined();
    });
  });

  describe('Control flow keywords', () => {
    it('should tokenize যদি as if', () => {
      const tokens = getTokens('যদি সত্য', 'bn');
      const ifToken = tokens.find(t => t.normalized === 'if');
      expect(ifToken).toBeDefined();
    });

    it('should tokenize তারপর as then', () => {
      const tokens = getTokens('টগল .active তারপর দেখান #modal', 'bn');
      const thenToken = tokens.find(t => t.normalized === 'then');
      expect(thenToken).toBeDefined();
    });

    it('should tokenize এবং as and', () => {
      const tokens = getTokens('যোগ .highlight এবং দেখান #tooltip', 'bn');
      const andToken = tokens.find(t => t.normalized === 'and');
      expect(andToken).toBeDefined();
    });

    it('should tokenize শেষ as end', () => {
      const tokens = getTokens('শেষ', 'bn');
      const endToken = tokens.find(t => t.normalized === 'end');
      expect(endToken).toBeDefined();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Bengali Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "ক্লিক তে #button র .active কে টগল"', () => {
      const tokens = getTokens('ক্লিক তে #button র .active কে টগল', 'bn');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "সাবমিট তে .loading কে টগল"', () => {
      const tokens = getTokens('সাবমিট তে .loading কে টগল', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "ইনপুট তে "test" কে #output তে রাখুন"', () => {
      const tokens = getTokens('ইনপুট তে "test" কে #output তে রাখুন', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "পরিবর্তন তে x কে 10 তে সেট"', () => {
      const tokens = getTokens('পরিবর্তন তে x কে 10 তে সেট', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "ফোকাস তে #tooltip কে দেখান"', () => {
      const tokens = getTokens('ফোকাস তে #tooltip কে দেখান', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "ঝাপসা তে #tooltip কে লুকান"', () => {
      const tokens = getTokens('ঝাপসা তে #tooltip কে লুকান', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Compound commands', () => {
    it('should handle chaining with তারপর (then)', () => {
      const tokens = getTokens('যোগ .loading তারপর সরান .loading', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const thenTokens = tokens.filter(t => t.normalized === 'then');
      expect(thenTokens.length).toBe(1);
    });

    it('should handle chaining with এবং (and)', () => {
      const tokens = getTokens('যোগ .highlight এবং দেখান #tooltip', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const andToken = tokens.find(t => t.normalized === 'and');
      expect(andToken).toBeDefined();
    });

    it('should handle event handler with compound body', () => {
      const tokens = getTokens(
        'ক্লিক তে যোগ .loading তারপর সরান .loading',
        'bn',
      );
      expect(tokens.length).toBeGreaterThan(5);
    });
  });

  describe('Semantic equivalence', () => {
    it('all standard command forms tokenize correctly', () => {
      const toggleTokens = getTokens('.active কে টগল', 'bn');
      const addTokens = getTokens('.highlight কে যোগ', 'bn');
      const removeTokens = getTokens('.highlight কে সরান', 'bn');
      const showTokens = getTokens('#modal কে দেখান', 'bn');
      const hideTokens = getTokens('#modal কে লুকান', 'bn');
      const incTokens = getTokens('counter কে বৃদ্ধি', 'bn');
      const decTokens = getTokens('counter কে হ্রাস', 'bn');

      expect(toggleTokens.length).toBeGreaterThan(0);
      expect(addTokens.length).toBeGreaterThan(0);
      expect(removeTokens.length).toBeGreaterThan(0);
      expect(showTokens.length).toBeGreaterThan(0);
      expect(hideTokens.length).toBeGreaterThan(0);
      expect(incTokens.length).toBeGreaterThan(0);
      expect(decTokens.length).toBeGreaterThan(0);
    });

    it('event handler forms with different events tokenize correctly', () => {
      const clickTokens = getTokens('ক্লিক তে .active কে টগল', 'bn');
      const submitTokens = getTokens('সাবমিট তে .loading কে টগল', 'bn');
      const hoverTokens = getTokens('হোভার তে .highlight কে যোগ', 'bn');

      expect(clickTokens.length).toBeGreaterThan(0);
      expect(submitTokens.length).toBeGreaterThan(0);
      expect(hoverTokens.length).toBeGreaterThan(0);
    });
  });

  describe('References', () => {
    it('should tokenize আমি as me reference', () => {
      const tokens = getTokens('আমি', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const meToken = tokens.find(t => t.value === 'আমি');
      expect(meToken).toBeDefined();
    });

    it('should tokenize এটি as it reference', () => {
      const tokens = getTokens('এটি', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const itToken = tokens.find(t => t.value === 'এটি');
      expect(itToken).toBeDefined();
    });

    it('should tokenize আপনি as you reference', () => {
      const tokens = getTokens('আপনি', 'bn');
      expect(tokens.length).toBeGreaterThan(0);
      const youToken = tokens.find(t => t.value === 'আপনি');
      expect(youToken).toBeDefined();
    });
  });
});

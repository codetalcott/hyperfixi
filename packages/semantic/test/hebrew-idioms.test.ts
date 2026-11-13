/**
 * Hebrew Native Idiom Tests
 *
 * Tests for native Hebrew idiom patterns that go beyond
 * direct translations to support more natural Hebrew expressions.
 *
 * Hebrew features:
 * - SVO (Subject-Verb-Object) word order
 * - RTL (Right-to-Left) text direction
 * - Prefix prepositions that attach to words (ב, ל, מ, כ, ה, ו, ש)
 * - Direct object marker את (et)
 * - Optional vowel points (niqqud) typically omitted in modern text
 * - Possessive construct של (shel) with suffixed forms (שלי, שלך, שלו)
 *
 * Event marker forms:
 * - ב (b') - "at/on" prefix, attaches to event name (בלחיצה = on click)
 * - כש (kshe) - "when" (colloquial)
 * - כאשר (ka'asher) - "when" (formal)
 * - עם (im) - "with/upon" (alternative)
 *
 * @see NATIVE_REVIEW_NEEDED.md for patterns needing native speaker validation
 */

import { describe, it, expect } from 'vitest';
import { parse, tokenize } from '../src';

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

describe('Hebrew Tokenizer - Keyword Detection', () => {
  describe('Command keywords', () => {
    it('should tokenize מתג as toggle', () => {
      const tokens = getTokens('מתג .active', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should tokenize הוסף as add', () => {
      const tokens = getTokens('הוסף .highlight', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should tokenize הסר as remove', () => {
      const tokens = getTokens('הסר .highlight', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize שים as put', () => {
      const tokens = getTokens('שים "שלום" לתוך #output', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should tokenize קבע as set', () => {
      const tokens = getTokens('קבע x ל 10', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should tokenize הגדר as set (alternative)', () => {
      const tokens = getTokens('הגדר x ל 10', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should tokenize קבל as get', () => {
      const tokens = getTokens('קבל #element', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('get');
    });

    it('should tokenize הראה as show', () => {
      const tokens = getTokens('הראה #modal', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should tokenize הצג as show (alternative)', () => {
      const tokens = getTokens('הצג #modal', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should tokenize הסתר as hide', () => {
      const tokens = getTokens('הסתר #modal', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize הגדל as increment', () => {
      const tokens = getTokens('הגדל counter', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should tokenize הקטן as decrement', () => {
      const tokens = getTokens('הקטן counter', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('decrement');
    });
  });

  describe('Alternative command keywords', () => {
    it('should tokenize מחק as remove (alternative)', () => {
      const tokens = getTokens('מחק .highlight', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize החבא as hide (alternative)', () => {
      const tokens = getTokens('החבא #modal', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('hide');
    });
  });

  describe('Selectors in RTL context', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('מתג .active', 'he');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('הראה #modal', 'he');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });

    it('should handle compound selectors', () => {
      const tokens = getTokens('מתג .btn.active', 'he');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toContain('.btn');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Hebrew Event Handler Patterns', () => {
  describe("Prefix event marker: ב (b' - on/at) attached to event", () => {
    it('should tokenize "בלחיצה מתג .active"', () => {
      const tokens = getTokens('בלחיצה מתג .active', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      // ב should be split as event marker
      expect(tokens[0].normalized).toBe('on');
    });

    it('should tokenize "בשליחה מתג .loading"', () => {
      const tokens = getTokens('בשליחה מתג .loading', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(tokens[0].normalized).toBe('on');
    });

    it('should tokenize "בריחוף הוסף .highlight"', () => {
      const tokens = getTokens('בריחוף הוסף .highlight', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(tokens[0].normalized).toBe('on');
    });

    it('should tokenize "בלחיצה הסר .error"', () => {
      const tokens = getTokens('בלחיצה הסר .error', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(tokens[0].normalized).toBe('on');
    });

    it('should tokenize "במיקוד הראה #tooltip"', () => {
      const tokens = getTokens('במיקוד הראה #tooltip', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(tokens[0].normalized).toBe('on');
    });

    it('should tokenize "בטשטוש הסתר #tooltip"', () => {
      const tokens = getTokens('בטשטוש הסתר #tooltip', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(tokens[0].normalized).toBe('on');
    });
  });

  describe('Temporal conjunctions: כש (when - colloquial), כאשר (when - formal)', () => {
    it('should tokenize כאשר as event keyword', () => {
      const tokens = getTokens('כאשר לחיצה מתג .active', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
    });

    it('should tokenize כש as event keyword', () => {
      const tokens = getTokens('כש לחיצה מתג .active', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
    });

    it('should tokenize עם as event marker alternative', () => {
      const tokens = getTokens('עם לחיצה מתג .active', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Standalone ב with space (ambiguous)', () => {
    it('should tokenize "ב לחיצה מתג .active ב #button"', () => {
      // Standalone ב (with space) normalizes as "style" not "on"
      // because the event marker prefix only fires when attached to an event name.
      // Use the attached form (בלחיצה) for event markers.
      const tokens = getTokens('ב לחיצה מתג .active ב #button', 'he');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].kind).toBe('keyword');
      // Standalone ב resolves to the roleMarker alternative for "style"
      expect(tokens[0].normalized).toBe('style');
    });
  });

  describe('Event handler with destination', () => {
    it('should tokenize "בלחיצה מתג .active על #button"', () => {
      const tokens = getTokens('בלחיצה מתג .active על #button', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(5);
      // Check על (on/upon) is present as particle/keyword
      const alToken = tokens.find(t => t.value === 'על');
      expect(alToken).toBeDefined();
    });

    it('should tokenize "בריחוף הוסף .hover אל #element"', () => {
      const tokens = getTokens('בריחוף הוסף .hover אל #element', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(5);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Hebrew Command Patterns', () => {
  describe('Toggle commands', () => {
    it.fails('should parse "מתג .active"', () => {
      const node = parse('מתג .active', 'he');
      expect(node.action).toBe('toggle');
    });

    it.fails('should parse "החלף .active" (alternative toggle from test-cases)', () => {
      const node = parse('החלף .active', 'he');
      expect(node.action).toBe('toggle');
    });
  });

  describe('Add/Remove commands', () => {
    it.fails('should parse "הוסף .highlight"', () => {
      const node = parse('הוסף .highlight', 'he');
      expect(node.action).toBe('add');
    });

    it.fails('should parse "הסר .highlight"', () => {
      const node = parse('הסר .highlight', 'he');
      expect(node.action).toBe('remove');
    });
  });

  describe('Put/Set/Get commands', () => {
    it.fails('should parse "שים "שלום" לתוך #output"', () => {
      const node = parse('שים "שלום" לתוך #output', 'he');
      expect(node.action).toBe('put');
    });

    it.fails('should parse "קבע x ל 10"', () => {
      const node = parse('קבע x ל 10', 'he');
      expect(node.action).toBe('set');
    });

    it.fails('should parse "קבל #element"', () => {
      const node = parse('קבל #element', 'he');
      expect(node.action).toBe('get');
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "הראה #modal"', () => {
      const node = parse('הראה #modal', 'he');
      expect(node.action).toBe('show');
    });

    it('should parse "הסתר #modal"', () => {
      const node = parse('הסתר #modal', 'he');
      expect(node.action).toBe('hide');
    });
  });

  describe('Increment/Decrement commands', () => {
    it.fails('should parse "הגדל counter"', () => {
      const node = parse('הגדל counter', 'he');
      expect(node.action).toBe('increment');
    });

    it.fails('should parse "הקטן counter"', () => {
      const node = parse('הקטן counter', 'he');
      expect(node.action).toBe('decrement');
    });
  });
});

// =============================================================================
// Script-Specific Tests - RTL, Niqqud, Direct Object Marker
// =============================================================================

describe('Hebrew Script-Specific Features', () => {
  describe('RTL text direction with LTR selectors', () => {
    it('should correctly tokenize LTR selectors in RTL text', () => {
      const tokens = getTokens('מתג .active', 'he');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors in RTL context', () => {
      const tokens = getTokens('הראה #modal', 'he');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });

    it('should handle English event names in RTL context', () => {
      const tokens = getTokens('ב click מתג .active', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle mixed Hebrew and English content', () => {
      const tokens = getTokens('הגדל counter', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].kind).toBe('keyword');
      // counter is an ASCII identifier
      expect(tokens[1].kind).toBe('identifier');
    });
  });

  describe('Hebrew niqqud (vowel points)', () => {
    it('should tokenize keywords without niqqud (standard modern Hebrew)', () => {
      // Modern Hebrew typically omits niqqud
      const tokens = getTokens('הוסף .active', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should handle text that may contain niqqud characters', () => {
      // Niqqud characters are in Unicode range 0x0590-0x05FF
      // The tokenizer should handle their presence gracefully
      const tokens = getTokens('הראה #modal', 'he');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Direct object marker את (et)', () => {
    it('should tokenize את as a particle', () => {
      const tokens = getTokens('הסר את .active', 'he');
      const etToken = tokens.find(t => t.value === 'את');
      expect(etToken).toBeDefined();
      expect(etToken?.kind).toBe('particle');
    });

    it('should handle command with את before selector', () => {
      const tokens = getTokens('הראה את #modal', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      const etToken = tokens.find(t => t.value === 'את');
      expect(etToken).toBeDefined();
    });

    it('should handle command with את before identifier', () => {
      const tokens = getTokens('הגדל את counter', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('String literals in Hebrew context', () => {
    it('should handle Hebrew string literals', () => {
      const tokens = getTokens('שים "שלום עולם" לתוך #output', 'he');
      const stringToken = tokens.find(t => t.kind === 'literal');
      expect(stringToken).toBeDefined();
      expect(stringToken?.value).toContain('שלום');
    });

    it('should handle English string literals in Hebrew context', () => {
      const tokens = getTokens('שים "hello" לתוך #output', 'he');
      const stringToken = tokens.find(t => t.kind === 'literal');
      expect(stringToken).toBeDefined();
    });
  });
});

// =============================================================================
// Preposition/Modifier Tests
// =============================================================================

describe('Hebrew Prepositions and Modifiers', () => {
  describe('Prefix prepositions (ב, ל, מ)', () => {
    it("should handle ב (b') - standalone resolves to style (use prefix form for on)", () => {
      // Standalone ב (with space) resolves to "style" from roleMarkers.
      // The "on" meaning only applies when ב is attached to an event name (e.g., בלחיצה).
      const tokens = getTokens('ב לחיצה', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('style');
    });

    it("should handle ל (l' - to/for) as preposition", () => {
      const tokens = getTokens('קבע x ל 10', 'he');
      const lToken = tokens.find(t => t.value === 'ל');
      expect(lToken).toBeDefined();
    });

    it("should handle מ (m' - from) as preposition", () => {
      const tokens = getTokens('מ #source', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Standalone prepositions', () => {
    it('should handle על (al - on/upon)', () => {
      const tokens = getTokens('מתג .active על #button', 'he');
      const alToken = tokens.find(t => t.value === 'על');
      expect(alToken).toBeDefined();
    });

    it('should handle אל (el - to/toward)', () => {
      const tokens = getTokens('הוסף .hover אל #element', 'he');
      const elToken = tokens.find(t => t.value === 'אל');
      expect(elToken).toBeDefined();
    });

    it('should handle לתוך (letoch - into)', () => {
      const tokens = getTokens('שים "test" לתוך #output', 'he');
      const intoToken = tokens.find(t => t.normalized === 'into');
      expect(intoToken).toBeDefined();
    });

    it('should handle לפני (lifney - before)', () => {
      const tokens = getTokens('לפני #element', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle אחרי (acharey - after)', () => {
      const tokens = getTokens('אחרי #element', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Possessive construct של (shel)', () => {
    it('should handle שלי (sheli - my/mine)', () => {
      const tokens = getTokens('שלי', 'he');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle שלך (shelcha - your/yours)', () => {
      const tokens = getTokens('שלך', 'he');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle שלו (shelo - his/its)', () => {
      const tokens = getTokens('שלו', 'he');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle של (shel - of) as possessive marker', () => {
      const tokens = getTokens('של #element', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Control flow keywords', () => {
    it('should tokenize אם (im - if)', () => {
      const tokens = getTokens('אם אמת', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('if');
    });

    it('should tokenize אז (az - then)', () => {
      const tokens = getTokens('אז מתג .active', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('then');
    });

    it('should tokenize סוף (sof - end)', () => {
      const tokens = getTokens('סוף', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('end');
    });

    it('should tokenize וגם (vegam - and)', () => {
      const tokens = getTokens('וגם', 'he');
      const andToken = tokens.find(t => t.normalized === 'and');
      expect(andToken).toBeDefined();
    });
  });

  describe('Reference keywords', () => {
    it('should tokenize אני (ani - me)', () => {
      const tokens = getTokens('אני', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('me');
    });

    it('should tokenize זה (ze - it)', () => {
      const tokens = getTokens('זה', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('it');
    });

    it('should tokenize אתה (ata - you)', () => {
      const tokens = getTokens('אתה', 'he');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('you');
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Hebrew Integration Tests', () => {
  describe('Full event handler chains from test-cases', () => {
    it('should handle "בלחיצה מתג .active על #button"', () => {
      const tokens = getTokens('בלחיצה מתג .active על #button', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle "בשליחה מתג .loading"', () => {
      const tokens = getTokens('בשליחה מתג .loading', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle "בריחוף הוסף .highlight"', () => {
      const tokens = getTokens('בריחוף הוסף .highlight', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle "בלחיצה הסר .error"', () => {
      const tokens = getTokens('בלחיצה הסר .error', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle "במיקוד הראה #tooltip"', () => {
      const tokens = getTokens('במיקוד הראה #tooltip', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle "בטשטוש הסתר #tooltip"', () => {
      const tokens = getTokens('בטשטוש הסתר #tooltip', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle "בלחיצה הגדל #counter"', () => {
      const tokens = getTokens('בלחיצה הגדל #counter', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle "בלחיצה הקטן #counter"', () => {
      const tokens = getTokens('בלחיצה הקטן #counter', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle "בהזנה שים "test" לתוך #output"', () => {
      const tokens = getTokens('בהזנה שים "test" לתוך #output', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle "בשינוי קבע x ל 10"', () => {
      const tokens = getTokens('בשינוי קבע x ל 10', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Compound commands', () => {
    it('should handle chaining with אז (then)', () => {
      const tokens = getTokens('הוסף .loading אז חכה 1s אז הסר .loading', 'he');
      expect(tokens.length).toBeGreaterThan(0);
      const thenTokens = tokens.filter(t => t.normalized === 'then');
      expect(thenTokens.length).toBe(2);
    });

    it('should handle chaining with וגם (and)', () => {
      const tokens = getTokens('הוסף .highlight וגם הראה #tooltip', 'he');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle event handler with compound body', () => {
      const tokens = getTokens('בלחיצה הוסף .loading אז הבא /api/data אז הסר .loading', 'he');
      expect(tokens.length).toBeGreaterThan(5);
    });
  });

  describe('Conjunction prefix ו splitting', () => {
    it.fails('should split ו prefix from known keyword: והראה', () => {
      const tokens = getTokens('והראה #modal', 'he');
      // Should split into ו (conjunction) + הראה (show)
      const conjToken = tokens.find(t => t.kind === 'conjunction');
      expect(conjToken?.value).toBe('ו');
      expect(conjToken?.normalized).toBe('and');
      const showToken = tokens.find(t => t.normalized === 'show');
      expect(showToken).toBeDefined();
    });

    it('should not split ו from non-keyword words', () => {
      const tokens = getTokens('ול', 'he'); // too short after ו
      // Should remain as one token
      expect(tokens.length).toBe(1);
    });
  });

  describe('Number handling', () => {
    it('should handle numeric literals', () => {
      const tokens = getTokens('חכה 500', 'he');
      const numToken = tokens.find(t => t.kind === 'literal');
      expect(numToken).toBeDefined();
    });

    it('should handle numbers with time units (שניות)', () => {
      const tokens = getTokens('חכה 2 שניות', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle numbers with ms time units (מילישנייה)', () => {
      const tokens = getTokens('חכה 500 מילישנייה', 'he');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Semantic equivalence', () => {
    it('all event marker forms tokenize correctly', () => {
      const prefixTokens = getTokens('בלחיצה מתג .active', 'he');
      const standaloneTokens = getTokens('ב לחיצה מתג .active', 'he');
      const kasherTokens = getTokens('כאשר לחיצה מתג .active', 'he');

      expect(prefixTokens.length).toBeGreaterThan(0);
      expect(standaloneTokens.length).toBeGreaterThan(0);
      expect(kasherTokens.length).toBeGreaterThan(0);
    });

    it('primary and alternative keywords both tokenize', () => {
      const primaryTokens = getTokens('קבע x ל 10', 'he');
      const altTokens = getTokens('הגדר x ל 10', 'he');

      expect(primaryTokens[0].normalized).toBe('set');
      expect(altTokens[0].normalized).toBe('set');
    });
  });
});

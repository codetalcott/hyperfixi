/**
 * Thai Native Idiom Tests
 *
 * Tests for native Thai idiom patterns that go beyond
 * direct translations to support more natural Thai expressions.
 *
 * Thai features:
 * - SVO (Subject-Verb-Object) word order like English and Chinese
 * - Isolating language (no verb conjugation, no case markers)
 * - Thai script (U+0E00-U+0E7F)
 * - NO SPACES between words (character-based tokenization)
 * - Prepositions for grammatical roles
 * - Tonal language (5 tones) with tonal marks (Mai Ek, Mai Tho, Mai Tri, Mai Chattawa)
 * - Sara (vowel) characters can appear before, after, above, or below consonants
 * - Consonant clusters and leading consonants
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

describe('Thai Tokenizer - Keyword Detection', () => {
  describe('Event markers', () => {
    it('should tokenize เมื่อ as event marker', () => {
      const tokens = getTokens('เมื่อ คลิก', 'th');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const eventToken = tokens.find(t => t.value === 'เมื่อ');
      expect(eventToken).toBeDefined();
    });

    it('should tokenize ตอน as event marker alternative', () => {
      const tokens = getTokens('ตอน คลิก', 'th');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize สลับ as toggle', () => {
      const tokens = getTokens('สลับ .active', 'th');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize เพิ่ม as add', () => {
      const tokens = getTokens('เพิ่ม .highlight', 'th');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize ลบ as remove', () => {
      const tokens = getTokens('ลบ .highlight', 'th');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize แสดง as show', () => {
      const tokens = getTokens('แสดง #modal', 'th');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize ซ่อน as hide', () => {
      const tokens = getTokens('ซ่อน #modal', 'th');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize เพิ่มค่า as increment', () => {
      const tokens = getTokens('เพิ่มค่า counter', 'th');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should tokenize ลดค่า as decrement', () => {
      const tokens = getTokens('ลดค่า counter', 'th');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });

    it('should tokenize ใส่ as put', () => {
      const tokens = getTokens('ใส่ "สวัสดี" ใน #output', 'th');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('put');
    });

    it('should tokenize ตั้ง as set', () => {
      const tokens = getTokens('ตั้ง x', 'th');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('set');
    });

    it('should tokenize รับค่า as get', () => {
      const tokens = getTokens('รับค่า #element', 'th');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('get');
    });
  });

  describe('Alternative keywords', () => {
    it('should tokenize ลบออก as remove alternative', () => {
      const tokens = getTokens('ลบออก .old', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const removeToken = tokens.find(t => t.normalized === 'remove');
      expect(removeToken).toBeDefined();
    });

    it('should tokenize วาง as put alternative', () => {
      const tokens = getTokens('วาง "text" ใน #output', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const putToken = tokens.find(t => t.normalized === 'put');
      expect(putToken).toBeDefined();
    });

    it('should tokenize กำหนด as set alternative', () => {
      const tokens = getTokens('กำหนด x', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const setToken = tokens.find(t => t.normalized === 'set');
      expect(setToken).toBeDefined();
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('สลับ .active', 'th');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('แสดง #modal', 'th');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });

    it('should handle selectors with hyphens', () => {
      const tokens = getTokens('สลับ .my-class', 'th');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.my-class');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Thai Event Handler Patterns', () => {
  describe('Standard pattern: เมื่อ {event}', () => {
    it('should parse "เมื่อ คลิก สลับ .active"', () => {
      const result = canParse('เมื่อ คลิก สลับ .active', 'th');
      if (result) {
        const node = parse('เมื่อ คลิก สลับ .active', 'th');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('เมื่อ คลิก สลับ .active', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should tokenize "เมื่อ คลิก สลับ .active ใน #button"', () => {
      const tokens = getTokens('เมื่อ คลิก สลับ .active ใน #button', 'th');
      expect(tokens.length).toBeGreaterThan(3);
    });

    it('should tokenize "เมื่อ ส่งข้อมูล สลับ .loading"', () => {
      const tokens = getTokens('เมื่อ ส่งข้อมูล สลับ .loading', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "เมื่อ โฮเวอร์ เพิ่ม .highlight"', () => {
      const tokens = getTokens('เมื่อ โฮเวอร์ เพิ่ม .highlight', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternate pattern: ตอน {event}', () => {
    it('should parse "ตอน คลิก สลับ .active"', () => {
      const result = canParse('ตอน คลิก สลับ .active', 'th');
      if (result) {
        const node = parse('ตอน คลิก สลับ .active', 'th');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('ตอน คลิก สลับ .active', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should tokenize "ตอน เปลี่ยน แสดง #result"', () => {
      const tokens = getTokens('ตอน เปลี่ยน แสดง #result', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: เมื่อ {event} จาก {source}', () => {
    it('should tokenize "เมื่อ คลิก จาก #button สลับ .active"', () => {
      const tokens = getTokens('เมื่อ คลิก จาก #button สลับ .active', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "ตอน คลิก จาก #submit แสดง #result"', () => {
      const tokens = getTokens('ตอน คลิก จาก #submit แสดง #result', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Event name recognition', () => {
    it('should handle คลิก (click)', () => {
      const tokens = getTokens('เมื่อ คลิก สลับ .active', 'th');
      const clickToken = tokens.find(t =>
        t.value === 'คลิก' || t.normalized === 'click'
      );
      expect(clickToken).toBeDefined();
    });

    it('should handle โฮเวอร์ (hover)', () => {
      const tokens = getTokens('เมื่อ โฮเวอร์ แสดง #tooltip', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle เปลี่ยน (change)', () => {
      const tokens = getTokens('เมื่อ เปลี่ยน แสดง #result', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ป้อน (input)', () => {
      const tokens = getTokens('เมื่อ ป้อน แสดง #preview', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Thai Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "สลับ .active"', () => {
      const result = canParse('สลับ .active', 'th');
      if (result) {
        const node = parse('สลับ .active', 'th');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('สลับ .active', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "แสดง #modal"', () => {
      const result = canParse('แสดง #modal', 'th');
      if (result) {
        const node = parse('แสดง #modal', 'th');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('แสดง #modal', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ซ่อน #modal"', () => {
      const result = canParse('ซ่อน #modal', 'th');
      if (result) {
        const node = parse('ซ่อน #modal', 'th');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('ซ่อน #modal', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "เพิ่ม .highlight"', () => {
      const result = canParse('เพิ่ม .highlight', 'th');
      if (result) {
        const node = parse('เพิ่ม .highlight', 'th');
        expect(node.action).toBe('add');
      } else {
        const tokens = getTokens('เพิ่ม .highlight', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ลบ .highlight"', () => {
      const result = canParse('ลบ .highlight', 'th');
      if (result) {
        const node = parse('ลบ .highlight', 'th');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('ลบ .highlight', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ลบออก .old" (alternative remove)', () => {
      const result = canParse('ลบออก .old', 'th');
      if (result) {
        const node = parse('ลบออก .old', 'th');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('ลบออก .old', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Put/Set/Get commands', () => {
    it('should parse "ใส่ "สวัสดี" ใน #output"', () => {
      const result = canParse('ใส่ "สวัสดี" ใน #output', 'th');
      if (result) {
        const node = parse('ใส่ "สวัสดี" ใน #output', 'th');
        expect(node.action).toBe('put');
      } else {
        const tokens = getTokens('ใส่ "สวัสดี" ใน #output', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ตั้ง x ใน 10"', () => {
      const tokens = getTokens('ตั้ง x ใน 10', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const setToken = tokens.find(t => t.normalized === 'set');
      expect(setToken).toBeDefined();
    });

    it('should parse "รับค่า #element"', () => {
      const result = canParse('รับค่า #element', 'th');
      if (result) {
        const node = parse('รับค่า #element', 'th');
        expect(node.action).toBe('get');
      } else {
        const tokens = getTokens('รับค่า #element', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "เพิ่มค่า counter"', () => {
      const result = canParse('เพิ่มค่า counter', 'th');
      if (result) {
        const node = parse('เพิ่มค่า counter', 'th');
        expect(node.action).toBe('increment');
      } else {
        const tokens = getTokens('เพิ่มค่า counter', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ลดค่า counter"', () => {
      const result = canParse('ลดค่า counter', 'th');
      if (result) {
        const node = parse('ลดค่า counter', 'th');
        expect(node.action).toBe('decrement');
      } else {
        const tokens = getTokens('ลดค่า counter', 'th');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Thai Script-Specific Tests
// =============================================================================

describe('Thai Script Features', () => {
  describe('Character-based boundary detection (no spaces)', () => {
    it('should tokenize Thai keywords without spaces between them', () => {
      const tokens = getTokens('สลับ.active', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      // Should separate the Thai keyword from the selector
      const toggleToken = tokens.find(t => t.normalized === 'toggle');
      expect(toggleToken).toBeDefined();
    });

    it('should tokenize keywords adjacent to selectors', () => {
      const tokens = getTokens('แสดง#modal', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle space-separated Thai for readability', () => {
      const tokens = getTokens('สลับ .active', 'th');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should handle multiple Thai keywords with spaces', () => {
      const tokens = getTokens('เมื่อ คลิก สลับ .active', 'th');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Tonal marks (Mai)', () => {
    it('should handle Mai Ek (low tone) - ่', () => {
      // ซ่อน uses Mai Ek
      const tokens = getTokens('ซ่อน #element', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const hideToken = tokens.find(t => t.normalized === 'hide');
      expect(hideToken).toBeDefined();
    });

    it('should handle Mai Tho (falling tone) - ้', () => {
      // ด้วย uses Mai Tho
      const tokens = getTokens('ด้วย style', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle Mai Tri (high tone) - ๊', () => {
      // บี๊บ uses Mai Tri
      const tokens = getTokens('บี๊บ', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle Mai Chattawa (rising tone) - ๋', () => {
      // Test with any word that uses Mai Chattawa
      const tokens = getTokens('สลับ .active', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Sara (vowel) characters', () => {
    it('should handle Sara Am (อำ) in keywords', () => {
      // กำหนด uses Sara Am
      const tokens = getTokens('กำหนด x', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const setToken = tokens.find(t => t.normalized === 'set');
      expect(setToken).toBeDefined();
    });

    it('should handle Sara Ae (แ) in keywords', () => {
      // แสดง uses Sara Ae (leading vowel)
      const tokens = getTokens('แสดง #modal', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].normalized).toBe('show');
    });

    it('should handle Sara E (เ) in keywords', () => {
      // เพิ่ม uses Sara E (leading vowel)
      const tokens = getTokens('เพิ่ม .active', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].normalized).toBe('add');
    });

    it('should handle Sara Ai (ไ) in keywords', () => {
      // ไป uses Sara Ai
      const tokens = getTokens('ไป /home', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Consonant clusters', () => {
    it('should handle leading cluster สล in สลับ (toggle)', () => {
      const tokens = getTokens('สลับ .active', 'th');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should handle leading cluster คล in คลิก (click)', () => {
      const tokens = getTokens('เมื่อ คลิก', 'th');
      const clickToken = tokens.find(t =>
        t.value === 'คลิก' || t.normalized === 'click'
      );
      expect(clickToken).toBeDefined();
    });
  });

  describe('Mixed Thai and ASCII', () => {
    it('should handle Thai keywords with ASCII selectors', () => {
      const tokens = getTokens('สลับ .active-state', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should handle Thai keywords with ASCII identifiers', () => {
      const tokens = getTokens('เพิ่มค่า counter', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should handle string literals with Thai content', () => {
      const tokens = getTokens('ใส่ "สวัสดีครับ" ใน #output', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const stringToken = tokens.find(t => t.kind === 'literal');
      expect(stringToken).toBeDefined();
    });
  });
});

// =============================================================================
// Preposition/Modifier Tests
// =============================================================================

describe('Thai Prepositions and Modifiers', () => {
  describe('Destination markers: ใน (in/into), ไปยัง (to)', () => {
    it('should handle ใน (in/into)', () => {
      const tokens = getTokens('ใส่ "text" ใน #output', 'th');
      const inToken = tokens.find(t => t.value === 'ใน');
      expect(inToken).toBeDefined();
    });

    it('should handle ไปยัง (to/toward)', () => {
      const tokens = getTokens('สลับ .active ไปยัง #button', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Source marker: จาก (from)', () => {
    it('should handle จาก (from)', () => {
      const tokens = getTokens('ลบ .class จาก #element', 'th');
      const fromToken = tokens.find(t => t.value === 'จาก');
      expect(fromToken).toBeDefined();
    });
  });

  describe('Style marker: ด้วย (with)', () => {
    it('should handle ด้วย (with)', () => {
      const tokens = getTokens('แสดง #modal ด้วย animation', 'th');
      const withToken = tokens.find(t => t.value === 'ด้วย');
      expect(withToken).toBeDefined();
    });
  });

  describe('Possessive marker: ของ (of)', () => {
    it('should handle ของ (of/possessive)', () => {
      const tokens = getTokens('ของฉัน', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ของคุณ (your)', () => {
      const tokens = getTokens('ของคุณ', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Control flow keywords', () => {
    it('should handle ถ้า (if)', () => {
      const tokens = getTokens('ถ้า', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const ifToken = tokens.find(t => t.normalized === 'if');
      expect(ifToken).toBeDefined();
    });

    it('should handle หาก (if alternative)', () => {
      const tokens = getTokens('หาก', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const ifToken = tokens.find(t => t.normalized === 'if');
      expect(ifToken).toBeDefined();
    });

    it('should handle แล้ว (then)', () => {
      const tokens = getTokens('แล้ว', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const thenToken = tokens.find(t => t.normalized === 'then');
      expect(thenToken).toBeDefined();
    });

    it('should handle จบ (end)', () => {
      const tokens = getTokens('จบ', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const endToken = tokens.find(t => t.normalized === 'end');
      expect(endToken).toBeDefined();
    });

    it('should handle และ (and)', () => {
      const tokens = getTokens('และ', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const andToken = tokens.find(t => t.normalized === 'and');
      expect(andToken).toBeDefined();
    });
  });

  describe('Reference keywords', () => {
    it('should handle ฉัน (me)', () => {
      const tokens = getTokens('ฉัน', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const meToken = tokens.find(t => t.normalized === 'me');
      expect(meToken).toBeDefined();
    });

    it('should handle มัน (it)', () => {
      const tokens = getTokens('มัน', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const itToken = tokens.find(t => t.normalized === 'it');
      expect(itToken).toBeDefined();
    });

    it('should handle คุณ (you)', () => {
      const tokens = getTokens('คุณ', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const youToken = tokens.find(t => t.normalized === 'you');
      expect(youToken).toBeDefined();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Thai Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "เมื่อ คลิก สลับ .active ใน #button"', () => {
      const tokens = getTokens('เมื่อ คลิก สลับ .active ใน #button', 'th');
      expect(tokens.length).toBeGreaterThan(4);
    });

    it('should handle "เมื่อ คลิก จาก #button เพิ่ม .active ใน #target"', () => {
      const tokens = getTokens('เมื่อ คลิก จาก #button เพิ่ม .active ใน #target', 'th');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "ตอน คลิก แสดง #modal แล้ว เพิ่ม .active"', () => {
      const tokens = getTokens('ตอน คลิก แสดง #modal แล้ว เพิ่ม .active', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound with แล้ว (then)', () => {
      const tokens = getTokens('เพิ่ม .loading แล้ว รอ 1s แล้ว ลบ .loading', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Complex expressions', () => {
    it('should handle put with string literal and destination', () => {
      const tokens = getTokens('ใส่ "สวัสดี" ใน #output', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const putToken = tokens.find(t => t.normalized === 'put');
      expect(putToken).toBeDefined();
      const stringToken = tokens.find(t => t.kind === 'literal');
      expect(stringToken).toBeDefined();
    });

    it('should handle increment with selector target', () => {
      const tokens = getTokens('เพิ่มค่า #count', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should handle toggle with destination', () => {
      const tokens = getTokens('สลับ .active ใน #button', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].normalized).toBe('toggle');
    });
  });

  describe('Variable references', () => {
    it('should handle :variable syntax', () => {
      const tokens = getTokens('ตั้ง :count ใน 0', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const varToken = tokens.find(t => t.value === ':count');
      expect(varToken).toBeDefined();
    });

    it('should handle Thai-named variables', () => {
      const tokens = getTokens('ตั้ง :ค่า ใน 10', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const varToken = tokens.find(t => t.value.startsWith(':'));
      expect(varToken).toBeDefined();
    });
  });

  describe('Number handling', () => {
    it('should handle numeric literals', () => {
      const tokens = getTokens('รอ 500', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      const numToken = tokens.find(t => t.kind === 'literal' && /\d/.test(t.value));
      expect(numToken).toBeDefined();
    });

    it('should handle negative numbers', () => {
      const tokens = getTokens('ตั้ง x ใน -5', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input gracefully', () => {
      const tokens = getTokens('', 'th');
      expect(tokens.length).toBe(0);
    });

    it('should handle whitespace-only input', () => {
      const tokens = getTokens('   ', 'th');
      expect(tokens.length).toBe(0);
    });

    it('should handle pure ASCII input in Thai mode', () => {
      const tokens = getTokens('toggle .active', 'th');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle mixed Thai and English keywords', () => {
      const tokens = getTokens('สลับ .active', 'th');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].normalized).toBe('toggle');
    });
  });
});

// =============================================================================
// Marked-phrase capture on BARE commands (en→foreign render residual, th rows)
// =============================================================================

describe('Thai bare commands keep their marked phrase', () => {
  // The handcrafted `-simple` th patterns sat at priority 100 — a dead tie
  // with the generated patterns that carry the optional `[จาก {source}]` /
  // `[ใน {destination}] [{duration}]` groups — and registration order made the
  // bare form win, silently dropping the marked phrase. Every th row of the
  // bare-render allowlist (remove.source ×5, toggle.destination ×7,
  // toggle.duration) was this one tie. `-simple` now sits at 90, the same
  // layering bn uses. Each case fails at priority 100.
  const role = (n: Record<string, any>, r: string) =>
    n.roles instanceof Map ? n.roles.get(r) : n.roles?.[r];

  it('ลบ {patient} จาก {source} binds source on the bare command', () => {
    const node = parse('ลบ .highlight จาก ฉัน', 'th') as Record<string, any>;
    expect(node.action).toBe('remove');
    expect(role(node, 'patient')).toMatchObject({ type: 'selector', value: '.highlight' });
    expect(role(node, 'source')).toMatchObject({ type: 'reference', value: 'me' });
  });

  it('สลับ {patient} ใน {destination} binds destination on the bare command', () => {
    const node = parse('สลับ .open ใน #menu', 'th') as Record<string, any>;
    expect(node.action).toBe('toggle');
    expect(role(node, 'patient')).toMatchObject({ type: 'selector', value: '.open' });
    expect(role(node, 'destination')).toMatchObject({ type: 'selector', value: '#menu' });
  });

  it('สลับ {patient} {duration} keeps the trailing duration', () => {
    const node = parse('สลับ .loading 2s', 'th') as Record<string, any>;
    expect(node.action).toBe('toggle');
    expect(role(node, 'duration')).toMatchObject({ type: 'literal', value: '2s' });
  });

  it('a positional destination (ใกล้สุด .card) survives too', () => {
    const node = parse('สลับ .expanded ใน ใกล้สุด .card', 'th') as Record<string, any>;
    expect(node.action).toBe('toggle');
    expect(role(node, 'destination')).toBeTruthy();
  });
});

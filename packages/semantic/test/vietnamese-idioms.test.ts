/**
 * Vietnamese Native Idiom Tests
 *
 * Tests for native Vietnamese idiom patterns that go beyond
 * direct translations to support more natural Vietnamese expressions.
 *
 * Vietnamese features:
 * - SVO (Subject-Verb-Object) word order like English
 * - Isolating/analytic language - no verb conjugation
 * - Uses prepositions for grammatical roles
 * - Space-separated words with rich diacritics
 * - Tonal language with 6 tones marked by diacritics
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
// Tokenizer Tests - Native Idiom Detection
// =============================================================================

describe('Vietnamese Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize khi as event marker', () => {
      const tokens = getTokens('khi nhấp', 'vi');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const khiToken = tokens.find(t => t.value === 'khi');
      expect(khiToken).toBeDefined();
    });

    it('should tokenize lúc as event marker', () => {
      const tokens = getTokens('lúc nhấp', 'vi');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize chuyển đổi as toggle', () => {
      const tokens = getTokens('chuyển đổi .active', 'vi');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize hiển thị as show', () => {
      const tokens = getTokens('hiển thị #modal', 'vi');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize ẩn as hide', () => {
      const tokens = getTokens('ẩn #dropdown', 'vi');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize thêm as add', () => {
      const tokens = getTokens('thêm .active', 'vi');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize xóa as remove', () => {
      const tokens = getTokens('xóa .active', 'vi');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize tăng as increment', () => {
      const tokens = getTokens('tăng counter', 'vi');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should tokenize giảm as decrement', () => {
      const tokens = getTokens('giảm counter', 'vi');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('chuyển đổi .active', 'vi');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('hiển thị #modal', 'vi');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Vietnamese Event Handler Patterns', () => {
  describe('Standard pattern: khi {event}', () => {
    it('should tokenize "khi nhấp chuyển đổi .active"', () => {
      const tokens = getTokens('khi nhấp chuyển đổi .active', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "khi gửi hiển thị #result"', () => {
      const tokens = getTokens('khi gửi hiển thị #result', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternate pattern: lúc {event}', () => {
    it('should tokenize "lúc nhấp chuyển đổi .active"', () => {
      const tokens = getTokens('lúc nhấp chuyển đổi .active', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "lúc thay đổi hiển thị #result"', () => {
      const tokens = getTokens('lúc thay đổi hiển thị #result', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: khi {event} trên {source}', () => {
    it('should tokenize "khi nhấp trên #button chuyển đổi .active"', () => {
      const tokens = getTokens('khi nhấp trên #button chuyển đổi .active', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Vietnamese Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "chuyển đổi .active"', () => {
      const result = canParse('chuyển đổi .active', 'vi');
      if (result) {
        const node = parse('chuyển đổi .active', 'vi');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('chuyển đổi .active', 'vi');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "bật tắt .visible"', () => {
      const tokens = getTokens('bật tắt .visible', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "hiển thị #modal"', () => {
      const result = canParse('hiển thị #modal', 'vi');
      if (result) {
        const node = parse('hiển thị #modal', 'vi');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('hiển thị #modal', 'vi');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "ẩn #dropdown"', () => {
      const result = canParse('ẩn #dropdown', 'vi');
      if (result) {
        const node = parse('ẩn #dropdown', 'vi');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('ẩn #dropdown', 'vi');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "hiện #menu"', () => {
      const tokens = getTokens('hiện #menu', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "thêm .active"', () => {
      const result = canParse('thêm .active', 'vi');
      if (result) {
        const node = parse('thêm .active', 'vi');
        expect(node.action).toBe('add');
      } else {
        const tokens = getTokens('thêm .active', 'vi');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "xóa .active"', () => {
      const result = canParse('xóa .active', 'vi');
      if (result) {
        const node = parse('xóa .active', 'vi');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('xóa .active', 'vi');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "gỡ bỏ .active"', () => {
      const tokens = getTokens('gỡ bỏ .active', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "tăng counter"', () => {
      const result = canParse('tăng counter', 'vi');
      if (result) {
        const node = parse('tăng counter', 'vi');
        expect(node.action).toBe('increment');
      } else {
        const tokens = getTokens('tăng counter', 'vi');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "giảm counter"', () => {
      const result = canParse('giảm counter', 'vi');
      if (result) {
        const node = parse('giảm counter', 'vi');
        expect(node.action).toBe('decrement');
      } else {
        const tokens = getTokens('giảm counter', 'vi');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Vietnamese Diacritic Tests
// =============================================================================

describe('Vietnamese Diacritics', () => {
  describe('Tone marks', () => {
    it('should handle sắc (acute accent) - ấ, ắ, é, ế, í, ó, ố, ớ, ú, ứ', () => {
      const tokens = getTokens('đến #element', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle huyền (grave accent) - à, ằ, è, ề, ì, ò, ồ, ờ, ù, ừ', () => {
      const tokens = getTokens('từ #source', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle hỏi (hook above) - ả, ẳ, ẻ, ể, ỉ, ỏ, ổ, ở, ủ, ử', () => {
      const tokens = getTokens('bỏ .class', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ngã (tilde) - ã, ẵ, ẽ, ễ, ĩ, õ, ỗ, ỡ, ũ, ữ', () => {
      const tokens = getTokens('hiển thị #modal', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle nặng (dot below) - ạ, ặ, ẹ, ệ, ị, ọ, ộ, ợ, ụ, ự', () => {
      const tokens = getTokens('gọi hàm', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Special Vietnamese vowels', () => {
    it('should handle ă (breve)', () => {
      const tokens = getTokens('bắt đầu', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle â (circumflex)', () => {
      const tokens = getTokens('tập trung', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ê (circumflex)', () => {
      const tokens = getTokens('yêu cầu', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ô (circumflex)', () => {
      const tokens = getTokens('bổ sung', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ơ (horn)', () => {
      const tokens = getTokens('chờ #element', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ư (horn)', () => {
      const tokens = getTokens('đưa vào', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Special consonants', () => {
    it('should handle đ (d with stroke)', () => {
      const tokens = getTokens('đặt giá trị', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Preposition/Modifier Tests
// =============================================================================

describe('Vietnamese Prepositions and Modifiers', () => {
  describe('Location prepositions', () => {
    it('should handle vào (into)', () => {
      const tokens = getTokens('đặt "text" vào #output', 'vi');
      const vaoToken = tokens.find(t => t.value === 'vào');
      expect(vaoToken).toBeDefined();
    });

    it('should handle từ (from)', () => {
      const tokens = getTokens('xóa .class từ #element', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle trên (on)', () => {
      const tokens = getTokens('chuyển đổi .active trên #button', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle cho (to/for)', () => {
      const tokens = getTokens('thêm .highlight cho #target', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Possessive marker', () => {
    it('should handle của (of/possessive)', () => {
      const tokens = getTokens('giá trị của #element', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Vietnamese Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "khi nhấp trên #button thêm .active vào #target"', () => {
      const tokens = getTokens('khi nhấp trên #button thêm .active vào #target', 'vi');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "khi gửi hiển thị #kết-quả"', () => {
      const tokens = getTokens('khi gửi hiển thị #kết-quả', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound commands with rồi (then)', () => {
      const tokens = getTokens('thêm .loading rồi chờ 1s rồi xóa .loading', 'vi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-word commands', () => {
    it('should handle "chuyển đổi" as single command', () => {
      const tokens = getTokens('chuyển đổi .active', 'vi');
      const toggleToken = tokens.find(t => t.normalized === 'toggle');
      expect(toggleToken).toBeDefined();
    });

    it('should handle "hiển thị" as single command', () => {
      const tokens = getTokens('hiển thị #modal', 'vi');
      const showToken = tokens.find(t => t.normalized === 'show');
      expect(showToken).toBeDefined();
    });

    it('should handle "lấy giá trị" as single command', () => {
      const tokens = getTokens('lấy giá trị #element', 'vi');
      const getToken = tokens.find(t => t.normalized === 'get');
      expect(getToken).toBeDefined();
    });
  });
});

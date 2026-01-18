/**
 * Complex Selector Tests
 *
 * Tests for Phase 5 enhancements:
 * - Bracket attribute selectors with quoted values
 * - HTML literal syntax with modifiers (.class, #id, [attr])
 * - Escaped character handling
 * - Nested quote handling
 */

import { describe, it, expect } from 'vitest';
import { parse, tokenize } from '../src';

/**
 * Helper to get tokens array from TokenStream
 */
function getTokens(input: string, language: string = 'en') {
  const stream = tokenize(input, language);
  return stream.tokens;
}

// =============================================================================
// Bracket Attribute Selector Tests
// =============================================================================

describe('Bracket Attribute Selectors', () => {
  describe('Simple attribute selectors', () => {
    it('should parse selector with simple attribute', () => {
      const result = parse('toggle .active on [disabled]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse selector with attribute value', () => {
      const result = parse('toggle .active on [type=button]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Quoted attribute values', () => {
    it('should parse selector with double-quoted value', () => {
      const result = parse('toggle .active on [type="button"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse selector with single-quoted value', () => {
      const result = parse("toggle .active on [type='button']", 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse selector with backtick-quoted value', () => {
      const result = parse('toggle .active on [type=`button`]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Nested brackets in quoted values', () => {
    it('should handle brackets inside double quotes', () => {
      const result = parse('toggle .active on [data-config="[1,2,3]"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should handle brackets inside single quotes', () => {
      const result = parse("toggle .active on [data-config='[1,2,3]']", 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should handle nested object notation in quotes', () => {
      const result = parse('toggle .active on [data-json="{key: [1,2]}"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Escaped characters in attribute selectors', () => {
    it('should handle escaped quotes in double-quoted values', () => {
      const result = parse('toggle .active on [title="He said \\"Hello\\""]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should handle escaped quotes in single-quoted values', () => {
      const result = parse("toggle .active on [title='She\\'s here']", 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should handle escaped brackets', () => {
      const result = parse('toggle .active on [data-value="\\[escaped\\]"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Complex attribute operators', () => {
    it('should parse ^= (starts with) operator', () => {
      const result = parse('toggle .active on [class^="btn-"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse $= (ends with) operator', () => {
      const result = parse('toggle .active on [class$="-primary"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse *= (contains) operator', () => {
      const result = parse('toggle .active on [class*="active"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse ~= (word match) operator', () => {
      const result = parse('toggle .active on [class~="btn"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse |= (prefix match) operator', () => {
      const result = parse('toggle .active on [lang|="en"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Multiple attribute selectors', () => {
    it('should parse multiple attribute selectors', () => {
      const result = parse('toggle .active on [type="button"][disabled]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse combined class and attribute selectors', () => {
      const result = parse('toggle .active on .btn[type="submit"]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse combined ID and attribute selectors', () => {
      const result = parse('toggle .active on #submit[disabled]', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });
});

// =============================================================================
// HTML Literal Syntax Tests
// =============================================================================

describe('HTML Literal Syntax', () => {
  describe('Basic HTML literals', () => {
    it('should parse simple tag', () => {
      const result = parse('toggle .active on <button>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse self-closing tag', () => {
      const result = parse('toggle .active on <button/>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse tag with whitespace before /', () => {
      const result = parse('toggle .active on <button />', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Class modifiers', () => {
    it('should parse tag with single class', () => {
      const result = parse('toggle .active on <button.primary>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse tag with multiple classes', () => {
      const result = parse('toggle .active on <button.btn.primary>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse self-closing tag with class', () => {
      const result = parse('toggle .active on <div.card/>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('ID modifiers', () => {
    it('should parse tag with ID', () => {
      const result = parse('toggle .active on <button#submit>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse self-closing tag with ID', () => {
      const result = parse('toggle .active on <button#submit/>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Combined class and ID modifiers', () => {
    it('should parse tag with class then ID', () => {
      const result = parse('toggle .active on <button.primary#submit>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse tag with ID then class', () => {
      const result = parse('toggle .active on <button#submit.primary>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse tag with multiple classes and ID', () => {
      const result = parse('toggle .active on <button.btn.primary#submit>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse self-closing with class and ID', () => {
      const result = parse('toggle .active on <div.card#main/>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Attribute modifiers in HTML literals', () => {
    it('should parse tag with simple attribute', () => {
      const result = parse('toggle .active on <button[disabled]>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse tag with attribute value', () => {
      const result = parse('toggle .active on <button[type="submit"]>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse self-closing tag with attribute', () => {
      const result = parse('toggle .active on <input[type="text"]/>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Combined modifiers in HTML literals', () => {
    it('should parse tag with class, ID, and attribute', () => {
      const result = parse('toggle .active on <button.btn#submit[disabled]>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse tag with ID, class, and attribute', () => {
      const result = parse('toggle .active on <button#submit.btn[disabled]>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse complex combination', () => {
      const result = parse('toggle .active on <div.card.primary#main[data-id="123"]/>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse multiple attributes with modifiers', () => {
      const result = parse(
        'toggle .active on <button.btn#submit[type="submit"][disabled]/>',
        'en'
      );
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Nested quotes in HTML literal attributes', () => {
    it('should handle brackets in quoted attribute values', () => {
      const result = parse('toggle .active on <div[data-config="[1,2,3]"]>', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should handle complex nested structures', () => {
      const result = parse(
        'toggle .active on <div.card#main[data-json="{key: [1,2]}"]/>',
        'en'
      );
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });
});

// =============================================================================
// Multilingual Complex Selector Tests
// =============================================================================

describe('Complex Selectors in Multilingual Context', () => {
  describe('Japanese', () => {
    it('should parse bracket selector', () => {
      const result = parse('[type="button"] に .active を 切り替え', 'ja');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse HTML literal with modifiers', () => {
      const result = parse('<button.btn#submit/> に .active を 切り替え', 'ja');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Korean', () => {
    it('should parse bracket selector', () => {
      const result = parse('[type="button"] 에 .active 를 토글', 'ko');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse HTML literal with modifiers', () => {
      const result = parse('<button.btn#submit/> 에 .active 를 토글', 'ko');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Arabic', () => {
    it('should parse bracket selector', () => {
      const result = parse('بدل .active على [type="button"]', 'ar');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse HTML literal with modifiers', () => {
      const result = parse('بدل .active على <button.btn#submit/>', 'ar');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('Spanish', () => {
    it('should parse bracket selector', () => {
      const result = parse('alternar .active en [type="button"]', 'es');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse HTML literal with modifiers', () => {
      const result = parse('alternar .active en <button.btn#submit/>', 'es');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });
});

// =============================================================================
// Token Extraction Tests
// =============================================================================

describe('Selector Token Extraction', () => {
  describe('Bracket selector tokenization', () => {
    it('should extract bracket selector as single token', () => {
      const tokens = getTokens('toggle .active on [type="button"]', 'en');
      const selectorToken = tokens.find(t => t.kind === 'selector' && t.value.includes('['));
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('[type="button"]');
    });

    it('should handle nested brackets in tokenization', () => {
      const tokens = getTokens('toggle .active on [data-config="[1,2,3]"]', 'en');
      const selectorToken = tokens.find(
        t => t.kind === 'selector' && t.value.includes('[') && t.value.includes('data-config')
      );
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('[data-config="[1,2,3]"]');
    });
  });

  describe('HTML literal tokenization', () => {
    it('should extract simple HTML literal as single token', () => {
      const tokens = getTokens('toggle .active on <button/>', 'en');
      const selectorToken = tokens.find(t => t.kind === 'selector' && t.value.startsWith('<'));
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('<button/>');
    });

    it('should extract HTML literal with class modifier', () => {
      const tokens = getTokens('toggle .active on <button.primary/>', 'en');
      const selectorToken = tokens.find(t => t.kind === 'selector' && t.value.startsWith('<'));
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('<button.primary/>');
    });

    it('should extract HTML literal with ID modifier', () => {
      const tokens = getTokens('toggle .active on <button#submit/>', 'en');
      const selectorToken = tokens.find(t => t.kind === 'selector' && t.value.startsWith('<'));
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('<button#submit/>');
    });

    it('should extract HTML literal with class and ID', () => {
      const tokens = getTokens('toggle .active on <button.btn#submit/>', 'en');
      const selectorToken = tokens.find(t => t.kind === 'selector' && t.value.startsWith('<'));
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('<button.btn#submit/>');
    });

    it('should extract HTML literal with attribute', () => {
      const tokens = getTokens('toggle .active on <button[disabled]/>', 'en');
      const selectorToken = tokens.find(t => t.kind === 'selector' && t.value.startsWith('<'));
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('<button[disabled]/>');
    });

    it('should extract complex HTML literal', () => {
      const tokens = getTokens(
        'toggle .active on <div.card#main[data-id="123"]/>',
        'en'
      );
      const selectorToken = tokens.find(t => t.kind === 'selector' && t.value.startsWith('<'));
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('<div.card#main[data-id="123"]/>');
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Complex Selector Edge Cases', () => {
  it('should handle empty attribute value', () => {
    const result = parse('toggle .active on [data-value=""]', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('toggle');
  });

  it('should handle attribute with spaces in value', () => {
    const result = parse('toggle .active on [title="Click me"]', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('toggle');
  });

  it('should handle multiple consecutive escaped characters', () => {
    const result = parse('toggle .active on [data-value="\\\\escaped\\\\"]', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('toggle');
  });

  it('should handle HTML literal with no modifiers', () => {
    const result = parse('toggle .active on <div>', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('toggle');
  });

  it('should handle HTML literal with whitespace variations', () => {
    const result = parse('toggle .active on <button />', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('toggle');
  });

  it('should handle mixed quote types in different attributes', () => {
    const result = parse('toggle .active on [type="button"][data-id=\'123\']', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('toggle');
  });

  it('should handle very long attribute values', () => {
    const longValue = 'a'.repeat(100);
    const result = parse(`toggle .active on [data-long="${longValue}"]`, 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('toggle');
  });
});

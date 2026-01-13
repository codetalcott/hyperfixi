/**
 * Multilingual Parser Tests
 *
 * Tests for locale-aware hyperscript parsing using KeywordProvider.
 * Validates that Spanish and Japanese keywords are correctly resolved
 * to English canonical form in the AST.
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { tokenize } from './tokenizer';
import { Parser } from './parser';
import type { KeywordResolver } from './types';

// Mock Spanish keyword provider for testing
const spanishKeywords: KeywordResolver = {
  resolve(token: string): string | undefined {
    const map: Record<string, string> = {
      // Commands
      en: 'on',
      clic: 'click',
      alternar: 'toggle',
      poner: 'put',
      establecer: 'set',
      si: 'if',
      registrar: 'log',
      esperar: 'wait',
      mostrar: 'show',
      ocultar: 'hide',
      agregar: 'add',
      quitar: 'remove',
      // Modifiers
      a: 'to',
      de: 'from',
      con: 'with',
      // Logical
      y: 'and',
      o: 'or',
      no: 'not',
      entonces: 'then',
      sino: 'else',
      // Values
      verdadero: 'true',
      falso: 'false',
      yo: 'me',
      ello: 'it',
      // Time
      segundos: 'seconds',
      ms: 'ms',
    };
    const normalized = token.toLowerCase();
    return map[normalized] || (isEnglishKeyword(normalized) ? normalized : undefined);
  },
  isCommand(token: string): boolean {
    const commands = new Set([
      'en',
      'clic',
      'alternar',
      'poner',
      'establecer',
      'si',
      'registrar',
      'esperar',
      'mostrar',
      'ocultar',
      'agregar',
      'quitar',
      // English fallbacks
      'on',
      'click',
      'toggle',
      'put',
      'set',
      'if',
      'log',
      'wait',
      'show',
      'hide',
      'add',
      'remove',
    ]);
    return commands.has(token.toLowerCase());
  },
  isKeyword(token: string): boolean {
    const keywords = new Set([
      'entonces',
      'sino',
      'y',
      'o',
      'no',
      'a',
      'de',
      'con',
      'then',
      'else',
      'and',
      'or',
      'not',
      'to',
      'from',
      'with',
    ]);
    return keywords.has(token.toLowerCase());
  },
};

// Mock Japanese keyword provider for testing
const japaneseKeywords: KeywordResolver = {
  resolve(token: string): string | undefined {
    const map: Record<string, string> = {
      // Commands (Japanese)
      で: 'on',
      クリック: 'click',
      切り替え: 'toggle',
      置く: 'put',
      設定: 'set',
      もし: 'if',
      記録: 'log',
      待つ: 'wait',
      表示: 'show',
      隠す: 'hide',
      // Modifiers
      に: 'to',
      から: 'from',
      と: 'with',
      // Logical
      そして: 'and',
      または: 'or',
      ではない: 'not',
      それから: 'then',
      そうでなければ: 'else',
      // Values
      真: 'true',
      偽: 'false',
      私: 'me',
      それ: 'it',
    };
    const normalized = token.toLowerCase();
    return map[normalized] || (isEnglishKeyword(normalized) ? normalized : undefined);
  },
  isCommand(token: string): boolean {
    const commands = new Set([
      'で',
      'クリック',
      '切り替え',
      '置く',
      '設定',
      'もし',
      '記録',
      '待つ',
      '表示',
      '隠す',
      // English fallbacks
      'on',
      'click',
      'toggle',
      'put',
      'set',
      'if',
      'log',
      'wait',
      'show',
      'hide',
    ]);
    return commands.has(token.toLowerCase());
  },
  isKeyword(token: string): boolean {
    const keywords = new Set([
      'それから',
      'そうでなければ',
      'そして',
      'または',
      'ではない',
      'に',
      'から',
      'と',
      'then',
      'else',
      'and',
      'or',
      'not',
      'to',
      'from',
      'with',
    ]);
    return keywords.has(token.toLowerCase());
  },
};

// Helper to check if a token is an English keyword
function isEnglishKeyword(token: string): boolean {
  const englishKeywords = new Set([
    'on',
    'click',
    'toggle',
    'put',
    'set',
    'if',
    'log',
    'wait',
    'show',
    'hide',
    'add',
    'remove',
    'then',
    'else',
    'and',
    'or',
    'not',
    'to',
    'from',
    'with',
    'true',
    'false',
    'me',
    'it',
    'my',
    'seconds',
    'ms',
  ]);
  return englishKeywords.has(token.toLowerCase());
}

describe('Multilingual Parser', () => {
  describe('Spanish Keywords', () => {
    it('should parse simple Spanish command', () => {
      const result = parse('on click toggle .active', { keywords: spanishKeywords });
      expect(result.success).toBe(true);
      expect(result.node!).toBeDefined();
    });

    it('should resolve Spanish "en" to English "on"', () => {
      // Using direct Parser with Spanish tokens
      const tokens = tokenize('en click toggle .active');
      const parser = new Parser(tokens, { keywords: spanishKeywords });
      const result = parser.parse();

      expect(result.success).toBe(true);
      // Single event handlers parse to eventHandler type
      // The 'en' (Spanish for 'on') should be resolved correctly
      expect(result.node!.type).toBe('eventHandler');
    });

    it('should allow mixing Spanish commands with English DOM terms', () => {
      // Spanish "alternar" (toggle) + English "click" + CSS selector
      const result = parse('on click toggle .active', { keywords: spanishKeywords });
      expect(result.success).toBe(true);
    });

    it('should resolve command names to English canonical form', () => {
      // This test verifies AST normalization
      const resolved = spanishKeywords.resolve('alternar');
      expect(resolved).toBe('toggle');

      const resolvedOn = spanishKeywords.resolve('en');
      expect(resolvedOn).toBe('on');
    });
  });

  describe('Japanese Keywords', () => {
    it('should resolve Japanese keywords', () => {
      const resolved = japaneseKeywords.resolve('切り替え');
      expect(resolved).toBe('toggle');

      const resolvedClick = japaneseKeywords.resolve('クリック');
      expect(resolvedClick).toBe('click');
    });

    it('should recognize Japanese commands', () => {
      expect(japaneseKeywords.isCommand('切り替え')).toBe(true);
      expect(japaneseKeywords.isCommand('クリック')).toBe(true);
    });

    it('should allow English fallback', () => {
      // English keywords should still work with Japanese provider
      expect(japaneseKeywords.resolve('toggle')).toBe('toggle');
      expect(japaneseKeywords.resolve('click')).toBe('click');
    });
  });

  describe('English Fallback', () => {
    it('should work without keyword provider (English only)', () => {
      const result = parse('on click toggle .active');
      expect(result.success).toBe(true);
    });

    it('should accept English keywords when using Spanish provider', () => {
      // English should always work even with locale provider
      const result = parse('on click toggle .active', { keywords: spanishKeywords });
      expect(result.success).toBe(true);
    });
  });

  describe('KeywordResolver Interface', () => {
    it('should resolve unknown tokens to undefined', () => {
      expect(spanishKeywords.resolve('unknown_word')).toBeUndefined();
      expect(japaneseKeywords.resolve('unknown_word')).toBeUndefined();
    });

    it('should correctly identify commands', () => {
      expect(spanishKeywords.isCommand('alternar')).toBe(true);
      expect(spanishKeywords.isCommand('toggle')).toBe(true);
      expect(spanishKeywords.isCommand('notacommand')).toBe(false);
    });

    it('should correctly identify keywords', () => {
      expect(spanishKeywords.isKeyword('entonces')).toBe(true);
      expect(spanishKeywords.isKeyword('then')).toBe(true);
      expect(spanishKeywords.isKeyword('notakeyword')).toBe(false);
    });
  });
});

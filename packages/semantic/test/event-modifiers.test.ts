/**
 * Event Modifier Tests
 *
 * Tests for event modifiers (.once, .debounce(), .throttle(), .queue())
 * that can be applied to event handlers in all supported languages.
 *
 * Event modifiers provide additional control over event handling:
 * - .once: Execute handler only once
 * - .debounce(N): Debounce handler by N milliseconds
 * - .throttle(N): Throttle handler by N milliseconds
 * - .queue(strategy): Control how multiple events are queued
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
// Tokenization Tests
// =============================================================================

describe('Event Modifier Tokenization', () => {
  describe('.once modifier', () => {
    it('should tokenize .once as event-modifier token', () => {
      const tokens = getTokens('on click.once toggle .active', 'en');
      const modifierToken = tokens.find(t => t.kind === 'event-modifier');
      expect(modifierToken).toBeDefined();
      expect(modifierToken?.value).toBe('.once');
      expect(modifierToken?.metadata).toEqual({ modifierName: 'once', value: undefined });
    });

    it('should tokenize multiple .once modifiers', () => {
      const tokens = getTokens('on click.once.throttle(300) toggle .active', 'en');
      const modifierTokens = tokens.filter(t => t.kind === 'event-modifier');
      expect(modifierTokens.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('.debounce() modifier', () => {
    it('should tokenize .debounce(300) with value', () => {
      const tokens = getTokens('on click.debounce(300) toggle .active', 'en');
      const modifierToken = tokens.find(t => t.kind === 'event-modifier' && t.value.includes('debounce'));
      expect(modifierToken).toBeDefined();
      expect(modifierToken?.value).toBe('.debounce(300)');
      expect(modifierToken?.metadata).toEqual({ modifierName: 'debounce', value: 300 });
    });

    it('should tokenize .debounce(1000)', () => {
      const tokens = getTokens('on input.debounce(1000) send update', 'en');
      const modifierToken = tokens.find(t => t.kind === 'event-modifier' && t.value.includes('debounce'));
      expect(modifierToken).toBeDefined();
      expect(modifierToken?.metadata).toEqual({ modifierName: 'debounce', value: 1000 });
    });
  });

  describe('.throttle() modifier', () => {
    it('should tokenize .throttle(100) with value', () => {
      const tokens = getTokens('on scroll.throttle(100) log position', 'en');
      const modifierToken = tokens.find(t => t.kind === 'event-modifier' && t.value.includes('throttle'));
      expect(modifierToken).toBeDefined();
      expect(modifierToken?.value).toBe('.throttle(100)');
      expect(modifierToken?.metadata).toEqual({ modifierName: 'throttle', value: 100 });
    });
  });

  describe('.queue() modifier', () => {
    it('should tokenize .queue(first)', () => {
      const tokens = getTokens('on click.queue(first) fetch /api', 'en');
      const modifierToken = tokens.find(t => t.kind === 'event-modifier' && t.value.includes('queue'));
      expect(modifierToken).toBeDefined();
      expect(modifierToken?.value).toBe('.queue(first)');
      expect(modifierToken?.metadata).toEqual({ modifierName: 'queue', value: 'first' });
    });

    it('should tokenize .queue(last)', () => {
      const tokens = getTokens('on click.queue(last) fetch /api', 'en');
      const modifierToken = tokens.find(t => t.kind === 'event-modifier');
      expect(modifierToken?.metadata).toEqual({ modifierName: 'queue', value: 'last' });
    });

    it('should tokenize .queue(all)', () => {
      const tokens = getTokens('on click.queue(all) fetch /api', 'en');
      const modifierToken = tokens.find(t => t.kind === 'event-modifier');
      expect(modifierToken?.metadata).toEqual({ modifierName: 'queue', value: 'all' });
    });

    it('should tokenize .queue(none)', () => {
      const tokens = getTokens('on click.queue(none) fetch /api', 'en');
      const modifierToken = tokens.find(t => t.kind === 'event-modifier');
      expect(modifierToken?.metadata).toEqual({ modifierName: 'queue', value: 'none' });
    });
  });

  describe('Multiple modifiers', () => {
    it('should tokenize multiple modifiers in sequence', () => {
      const tokens = getTokens('on click.once.debounce(300) toggle .active', 'en');
      const modifierTokens = tokens.filter(t => t.kind === 'event-modifier');
      expect(modifierTokens.length).toBe(2);
      expect(modifierTokens[0].metadata).toEqual({ modifierName: 'once', value: undefined });
      expect(modifierTokens[1].metadata).toEqual({ modifierName: 'debounce', value: 300 });
    });

    it('should tokenize .once.throttle(100)', () => {
      const tokens = getTokens('on scroll.once.throttle(100) log position', 'en');
      const modifierTokens = tokens.filter(t => t.kind === 'event-modifier');
      expect(modifierTokens.length).toBe(2);
    });
  });

  describe('Modifier vs selector distinction', () => {
    it('should NOT tokenize .active as event modifier', () => {
      const tokens = getTokens('toggle .active', 'en');
      const modifierToken = tokens.find(t => t.kind === 'event-modifier');
      expect(modifierToken).toBeUndefined();
    });

    it('should correctly distinguish .once from .myClass', () => {
      const tokens = getTokens('on click.once add .myClass', 'en');
      const modifierTokens = tokens.filter(t => t.kind === 'event-modifier');
      const selectorTokens = tokens.filter(t => t.kind === 'selector');
      expect(modifierTokens.length).toBe(1);
      expect(selectorTokens.some(t => t.value === '.myClass')).toBe(true);
    });
  });
});

// =============================================================================
// Parsing Tests - English
// =============================================================================

describe('Event Modifier Parsing - English', () => {
  it('should parse "on click.once toggle .active"', () => {
    const result = parse('on click.once toggle .active', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('on');
    if (result?.kind === 'event-handler') {
      expect(result.eventModifiers?.once).toBe(true);
    }
  });

  it('should parse "on input.debounce(300) send update"', () => {
    const result = parse('on input.debounce(300) send update', 'en');
    expect(result).not.toBeNull();
    if (result?.kind === 'event-handler') {
      expect(result.eventModifiers?.debounce).toBe(300);
    }
  });

  it('should parse "on scroll.throttle(100) log position"', () => {
    const result = parse('on scroll.throttle(100) log position', 'en');
    expect(result).not.toBeNull();
    if (result?.kind === 'event-handler') {
      expect(result.eventModifiers?.throttle).toBe(100);
    }
  });

  it('should parse "on click.queue(first) fetch /api"', () => {
    const result = parse('on click.queue(first) fetch /api', 'en');
    expect(result).not.toBeNull();
    if (result?.kind === 'event-handler') {
      expect(result.eventModifiers?.queue).toBe('first');
    }
  });

  it('should parse multiple modifiers "on click.once.debounce(500) toggle .active"', () => {
    const result = parse('on click.once.debounce(500) toggle .active', 'en');
    expect(result).not.toBeNull();
    if (result?.kind === 'event-handler') {
      expect(result.eventModifiers?.once).toBe(true);
      expect(result.eventModifiers?.debounce).toBe(500);
    }
  });
});

// =============================================================================
// Cross-Language Tests
// =============================================================================

describe('Event Modifiers - All Languages', () => {
  const languages = [
    'en', 'es', 'pt', 'fr', 'de', 'it', // Western European
    'ja', 'ko', 'zh', // East Asian
    'ar', // Middle Eastern
    'tr', 'pl', 'ru', 'uk', // Other European
    'hi', 'bn', 'th', 'vi', // South/Southeast Asian
    'id', 'ms', 'tl', 'sw', 'qu', // Other
  ];

  describe('.once modifier across languages', () => {
    languages.forEach(lang => {
      it(`should tokenize .once in ${lang}`, () => {
        const tokens = getTokens('on click.once toggle .active', lang);
        const modifierToken = tokens.find(t => t.kind === 'event-modifier');
        expect(modifierToken).toBeDefined();
        expect(modifierToken?.metadata).toEqual({ modifierName: 'once', value: undefined });
      });
    });
  });

  describe('.debounce() modifier across languages', () => {
    languages.forEach(lang => {
      it(`should tokenize .debounce(300) in ${lang}`, () => {
        const tokens = getTokens('on click.debounce(300) toggle .active', lang);
        const modifierToken = tokens.find(t => t.kind === 'event-modifier' && t.value.includes('debounce'));
        expect(modifierToken).toBeDefined();
        expect(modifierToken?.metadata).toEqual({ modifierName: 'debounce', value: 300 });
      });
    });
  });

  describe('.throttle() modifier across languages', () => {
    languages.forEach(lang => {
      it(`should tokenize .throttle(100) in ${lang}`, () => {
        const tokens = getTokens('on scroll.throttle(100) log position', lang);
        const modifierToken = tokens.find(t => t.kind === 'event-modifier' && t.value.includes('throttle'));
        expect(modifierToken).toBeDefined();
        expect(modifierToken?.metadata).toEqual({ modifierName: 'throttle', value: 100 });
      });
    });
  });

  describe('.queue() modifier across languages', () => {
    languages.forEach(lang => {
      it(`should tokenize .queue(first) in ${lang}`, () => {
        const tokens = getTokens('on click.queue(first) fetch /api', lang);
        const modifierToken = tokens.find(t => t.kind === 'event-modifier' && t.value.includes('queue'));
        expect(modifierToken).toBeDefined();
        expect(modifierToken?.metadata).toEqual({ modifierName: 'queue', value: 'first' });
      });
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Event Modifier Edge Cases', () => {
  it('should handle modifier without parentheses', () => {
    const tokens = getTokens('on click.once toggle .active', 'en');
    const modifierToken = tokens.find(t => t.kind === 'event-modifier');
    expect(modifierToken).toBeDefined();
  });

  it('should handle modifier with whitespace after', () => {
    const tokens = getTokens('on click.once toggle .active', 'en');
    const modifierToken = tokens.find(t => t.kind === 'event-modifier');
    expect(modifierToken).toBeDefined();
  });

  it('should handle modifier followed by another modifier', () => {
    const tokens = getTokens('on click.once.debounce(300) toggle .active', 'en');
    const modifierTokens = tokens.filter(t => t.kind === 'event-modifier');
    expect(modifierTokens.length).toBe(2);
  });

  it('should handle modifier followed by command', () => {
    const tokens = getTokens('on click.once toggle .active', 'en');
    const modifierToken = tokens.find(t => t.kind === 'event-modifier');
    const keywordToken = tokens.find(t => t.kind === 'keyword' && t.value === 'toggle');
    expect(modifierToken).toBeDefined();
    expect(keywordToken).toBeDefined();
  });

  it('should NOT match incomplete modifier', () => {
    const tokens = getTokens('on click.onc toggle .active', 'en');
    const modifierToken = tokens.find(t => t.kind === 'event-modifier');
    expect(modifierToken).toBeUndefined();
  });

  it('should NOT match case-sensitive variants', () => {
    const tokens = getTokens('on click.Once toggle .active', 'en');
    const modifierToken = tokens.find(t => t.kind === 'event-modifier');
    // Event modifiers are lowercase only
    expect(modifierToken).toBeUndefined();
  });
});

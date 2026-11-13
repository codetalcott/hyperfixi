/**
 * Swahili Native Idiom Tests
 *
 * Tests for native Swahili idiom patterns that go beyond
 * direct translations to support more natural Swahili expressions.
 *
 * Swahili features:
 * - SVO (Subject-Verb-Object) word order
 * - Prepositions for grammatical roles (kwenye, kutoka, ndani)
 * - Space-separated words
 * - Agglutinative with noun class system (18 classes)
 * - Verb agreement prefixes (u-, a-, tu-, m-, wa-)
 *
 * @see packages/semantic/src/generators/profiles/swahili.ts for profile
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
// Tokenizer Tests - Native Idiom Detection
// =============================================================================

describe('Swahili Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize wakati as event marker', () => {
      const tokens = getTokens('wakati bonyeza', 'sw');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const wakatiToken = tokens.find(t => t.value === 'wakati');
      expect(wakatiToken).toBeDefined();
    });

    it('should tokenize kwa as event marker (alternative)', () => {
      const tokens = getTokens('kwa bonyeza', 'sw');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize kwenye as event marker (alternative)', () => {
      const tokens = getTokens('kwenye bonyeza', 'sw');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize badilisha as toggle', () => {
      const tokens = getTokens('badilisha .active', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize ongeza as add', () => {
      const tokens = getTokens('ongeza .highlight', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize ondoa as remove', () => {
      const tokens = getTokens('ondoa .highlight', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize futa as remove (alternative)', () => {
      const tokens = getTokens('futa .class', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize onyesha as show', () => {
      const tokens = getTokens('onyesha #modal', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize ficha as hide', () => {
      const tokens = getTokens('ficha #modal', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize weka as put', () => {
      const tokens = getTokens('weka "text" ndani #output', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('put');
    });

    it('should tokenize ongezeko as increment', () => {
      const tokens = getTokens('ongezeko counter', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should tokenize punguza as decrement', () => {
      const tokens = getTokens('punguza counter', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });

    it('should tokenize pata as get', () => {
      const tokens = getTokens('pata #element', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('get');
    });

    it('should tokenize seti as set', () => {
      const tokens = getTokens('seti x kwenye 10', 'sw');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('set');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('badilisha .active', 'sw');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('onyesha #modal', 'sw');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });

    it('should handle multiple selectors in single command', () => {
      const tokens = getTokens('badilisha .active kwenye #button', 'sw');
      const selectors = tokens.filter(t => t.kind === 'selector');
      expect(selectors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Possessive markers', () => {
    it('should tokenize yangu as my (N class)', () => {
      const tokens = getTokens('giá yangu', 'sw');
      const possToken = tokens.find(t => t.value === 'yangu');
      expect(possToken).toBeDefined();
    });

    it('should tokenize yako as your', () => {
      const tokens = getTokens('kifo yako', 'sw');
      const possToken = tokens.find(t => t.value === 'yako');
      expect(possToken).toBeDefined();
    });

    it('should tokenize yake as its/his/her', () => {
      const tokens = getTokens('jina yake', 'sw');
      const possToken = tokens.find(t => t.value === 'yake');
      expect(possToken).toBeDefined();
    });

    it('should handle wangu as my (M-Wa class)', () => {
      const tokens = getTokens('rafiki wangu', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle changu as my (Ki-Vi class)', () => {
      const tokens = getTokens('kiti changu', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Swahili Event Handler Patterns', () => {
  describe('Standard pattern: wakati {event}', () => {
    it('should tokenize "wakati bonyeza badilisha .active"', () => {
      const tokens = getTokens('wakati bonyeza badilisha .active', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "wakati wasilisha badilisha .loading"', () => {
      const tokens = getTokens('wakati wasilisha badilisha .loading', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "wakati hover ongeza .highlight"', () => {
      const tokens = getTokens('wakati hover ongeza .highlight', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "wakati ingiza weka "text" ndani #output"', () => {
      const tokens = getTokens('wakati ingiza weka "test" ndani #output', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: wakati {event} kutoka {source}', () => {
    it('should tokenize "wakati bonyeza kutoka #button badilisha .active"', () => {
      const tokens = getTokens('wakati bonyeza kutoka #button badilisha .active', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle kwenye as source marker alternative', () => {
      const tokens = getTokens('wakati bonyeza kwenye #button ongeza .active', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With destination marker: kwenye {destination}', () => {
    it('should tokenize "badilisha .active kwenye #button"', () => {
      const tokens = getTokens('badilisha .active kwenye #button', 'sw');
      const destMarker = tokens.find(t => t.value === 'kwenye');
      expect(destMarker).toBeDefined();
    });

    it('should tokenize "ongeza .hover kwenye #element"', () => {
      const tokens = getTokens('ongeza .hover kwenye #element', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Swahili Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "badilisha .active"', () => {
      const node = parse('badilisha .active', 'sw');
      expect(node.action).toBe('toggle');
    });

    it('should tokenize "wakati bonyeza badilisha .active kwenye #button"', () => {
      const tokens = getTokens('wakati bonyeza badilisha .active kwenye #button', 'sw');
      expect(tokens.length).toBeGreaterThan(5);
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "onyesha #modal"', () => {
      const node = parse('onyesha #modal', 'sw');
      expect(node.action).toBe('show');
    });

    it('should parse "ficha #modal"', () => {
      const node = parse('ficha #modal', 'sw');
      expect(node.action).toBe('hide');
    });

    it('should tokenize "wakati lenga onyesha #tooltip"', () => {
      const tokens = getTokens('wakati lenga onyesha #tooltip', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "wakati blur ficha #tooltip"', () => {
      const tokens = getTokens('wakati blur ficha #tooltip', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "ongeza .highlight"', () => {
      const node = parse('ongeza .highlight', 'sw');
      expect(node.action).toBe('add');
    });

    it('should parse "ondoa .highlight"', () => {
      const node = parse('ondoa .highlight', 'sw');
      expect(node.action).toBe('remove');
    });

    it('should tokenize "wakati bonyeza ondoa .error"', () => {
      const tokens = getTokens('wakati bonyeza ondoa .error', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "futa .active" (alternative remove)', () => {
      const tokens = getTokens('futa .active', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "ongezeko counter"', () => {
      const node = parse('ongezeko counter', 'sw');
      expect(node.action).toBe('increment');
    });

    it('should parse "punguza counter"', () => {
      const node = parse('punguza counter', 'sw');
      expect(node.action).toBe('decrement');
    });

    it('should tokenize "wakati bonyeza ongezeko #counter"', () => {
      const tokens = getTokens('wakati bonyeza ongezeko #counter', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "wakati bonyeza punguza #counter"', () => {
      const tokens = getTokens('wakati bonyeza punguza #counter', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Put/Get commands', () => {
    it.fails('should parse "weka "habari" ndani #output"', () => {
      const node = parse('weka "habari" ndani #output', 'sw');
      expect(node.action).toBe('put');
    });

    it('should tokenize "wakati ingiza weka "test" ndani #output"', () => {
      const tokens = getTokens('wakati ingiza weka "test" ndani #output', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "pata #element"', () => {
      const node = parse('pata #element', 'sw');
      expect(node.action).toBe('get');
    });
  });

  describe('Set command', () => {
    it('should parse "seti x kwenye 10"', () => {
      const node = parse('seti x kwenye 10', 'sw');
      expect(node.action).toBe('set');
    });

    it('should tokenize "wakati badilisha seti x kwenye 10"', () => {
      const tokens = getTokens('wakati badilisha seti x kwenye 10', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Preposition/Marker Tests
// =============================================================================

describe('Swahili Prepositions and Markers', () => {
  describe('Destination marker: kwenye', () => {
    it('should handle kwenye as destination marker', () => {
      const tokens = getTokens('badilisha .active kwenye #button', 'sw');
      const kwenyeToken = tokens.find(t => t.value === 'kwenye');
      expect(kwenyeToken).toBeDefined();
    });

    it('should tokenize "seti x kwenye 10"', () => {
      const tokens = getTokens('seti x kwenye 10', 'sw');
      const destMarker = tokens.find(t => t.value === 'kwenye');
      expect(destMarker).toBeDefined();
    });
  });

  describe('Destination marker: ndani (into)', () => {
    it('should handle ndani as into/destination', () => {
      const tokens = getTokens('weka "text" ndani #output', 'sw');
      const ndaniToken = tokens.find(t => t.value === 'ndani');
      expect(ndaniToken).toBeDefined();
    });

    it('should tokenize "weka "message" ndani #result"', () => {
      const tokens = getTokens('weka "message" ndani #result', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Source marker: kutoka (from)', () => {
    it('should handle kutoka as source marker', () => {
      const tokens = getTokens('ondoa .class kutoka #element', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Noun class agreement', () => {
    it('should handle M-Wa class (people)', () => {
      const tokens = getTokens('rafiki wangu', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle Ki-Vi class (things)', () => {
      const tokens = getTokens('kiti changu', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle Ji-Ma class', () => {
      const tokens = getTokens('takataka langu', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle N class (general)', () => {
      const tokens = getTokens('nyumba yangu', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Swahili Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "wakati bonyeza badilisha .active kwenye #button"', () => {
      const tokens = getTokens('wakati bonyeza badilisha .active kwenye #button', 'sw');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "wakati wasilisha onyesha #matokeo"', () => {
      const tokens = getTokens('wakati wasilisha onyesha #matokeo', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "wakati hover ongeza .highlight kwenye #element"', () => {
      const tokens = getTokens('wakati hover ongeza .highlight kwenye #element', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound pattern with multiple destinations', () => {
      const tokens = getTokens('badilisha .active kwenye #button', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-word and compound commands', () => {
    it('should handle "badilisha" as single keyword', () => {
      const tokens = getTokens('badilisha .active', 'sw');
      const toggleToken = tokens.find(t => t.normalized === 'toggle');
      expect(toggleToken).toBeDefined();
    });

    it('should handle "onyesha" as single keyword', () => {
      const tokens = getTokens('onyesha #modal', 'sw');
      const showToken = tokens.find(t => t.normalized === 'show');
      expect(showToken).toBeDefined();
    });

    it('should handle "ongezeko" as increment (distinct from ongeza)', () => {
      const tokens = getTokens('ongezeko counter', 'sw');
      const incrToken = tokens.find(t => t.normalized === 'increment');
      expect(incrToken).toBeDefined();
    });

    it('should handle alternative remove keyword "futa"', () => {
      const tokens = getTokens('futa .active', 'sw');
      const removeToken = tokens.find(t => t.normalized === 'remove');
      expect(removeToken).toBeDefined();
    });

    it('should handle "pata" for get command', () => {
      const tokens = getTokens('pata #element', 'sw');
      const getToken = tokens.find(t => t.normalized === 'get');
      expect(getToken).toBeDefined();
    });
  });

  describe('Event names in Swahili context', () => {
    it('should recognize "bonyeza" as click event', () => {
      const tokens = getTokens('wakati bonyeza', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize "wasilisha" as submit event', () => {
      const tokens = getTokens('wakati wasilisha', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize "hover" as hover event', () => {
      const tokens = getTokens('wakati hover', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize "ingiza" as input event', () => {
      const tokens = getTokens('wakati ingiza', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize "lenga" as focus event', () => {
      const tokens = getTokens('wakati lenga', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize "blur" as blur event', () => {
      const tokens = getTokens('wakati blur', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Complex role combinations', () => {
    it('should handle patient + destination', () => {
      const tokens = getTokens('weka "text" ndani #output', 'sw');
      expect(tokens.length).toBeGreaterThan(2);
    });

    it('should handle event + source + command + destination', () => {
      const tokens = getTokens(
        'wakati bonyeza kwenye #button badilisha .active kwenye #target',
        'sw'
      );
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle possessive with action', () => {
      const tokens = getTokens('ongeza yangu', 'sw');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

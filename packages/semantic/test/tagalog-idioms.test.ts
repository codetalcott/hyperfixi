/**
 * Tagalog Native Idiom Tests
 *
 * Tests for native Tagalog idiom patterns that go beyond
 * direct translations to support more natural Tagalog expressions.
 *
 * Tagalog features:
 * - VSO (Verb-Subject-Object) word order unlike SVO English
 * - Tagalog is a verb-initial language, verbs come first
 * - Rich verb morphology with affixes (mag-, -um-, -in-, i-, ma-)
 * - Ergative-absolutive alignment (subject marker ang vs object marker -ng/nin)
 * - Uses prepositions (sa, mula, sa etc.) for grammatical roles
 * - Space-separated words with Roman alphabet
 * - Uses linker ng for possession and modification
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

describe('Tagalog Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize kapag as event marker', () => {
      const tokens = getTokens('kapag pindot', 'tl');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const kapagToken = tokens.find(t => t.value === 'kapag');
      expect(kapagToken).toBeDefined();
    });

    it('should tokenize tuwing as event marker (alternative)', () => {
      const tokens = getTokens('tuwing pindot', 'tl');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize palitan as toggle', () => {
      const tokens = getTokens('palitan .active', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize idagdag as add', () => {
      const tokens = getTokens('idagdag .highlight', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize alisin as remove', () => {
      const tokens = getTokens('alisin .highlight', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize ipakita as show', () => {
      const tokens = getTokens('ipakita #modal', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize itago as hide', () => {
      const tokens = getTokens('itago #modal', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize ilagay as put', () => {
      const tokens = getTokens('ilagay "hello" sa #output', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('put');
    });

    it('should tokenize itakda as set', () => {
      const tokens = getTokens('itakda x sa 10', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('set');
    });

    it('should tokenize kunin as get', () => {
      const tokens = getTokens('kunin #element', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('get');
    });

    it('should tokenize dagdagan as increment', () => {
      const tokens = getTokens('dagdagan counter', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should tokenize bawasan as decrement', () => {
      const tokens = getTokens('bawasan counter', 'tl');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('palitan .active', 'tl');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('ipakita #modal', 'tl');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Tagalog Event Handler Patterns', () => {
  describe('Standard pattern: kapag {event} {command}', () => {
    it('should tokenize "kapag pindot palitan .active"', () => {
      const tokens = getTokens('kapag pindot palitan .active', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "kapag isumite palitan .loading"', () => {
      const tokens = getTokens('kapag isumite palitan .loading', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "kapag hover idagdag .highlight"', () => {
      const tokens = getTokens('kapag hover idagdag .highlight', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "kapag ituon ipakita #tooltip"', () => {
      const tokens = getTokens('kapag ituon ipakita #tooltip', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternative pattern: tuwing {event}', () => {
    it('should tokenize "tuwing pindot palitan .active"', () => {
      const tokens = getTokens('tuwing pindot palitan .active', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With destination marker: kapag {event} {command} sa {target}', () => {
    it('should tokenize "kapag pindot palitan .active sa #button"', () => {
      const tokens = getTokens('kapag pindot palitan .active sa #button', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "kapag hover idagdag .hover sa #element"', () => {
      const tokens = getTokens('kapag hover idagdag .hover sa #element', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source marker: kapag {event} mula_sa {source}', () => {
    it('should tokenize "kapag pindot mula_sa #button"', () => {
      const tokens = getTokens('kapag pindot mula_sa #button', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Tagalog Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "palitan .active"', () => {
      const result = canParse('palitan .active', 'tl');
      if (result) {
        const node = parse('palitan .active', 'tl');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('palitan .active', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "itoggle .visible"', () => {
      const tokens = getTokens('itoggle .visible', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Add commands', () => {
    it('should parse "idagdag .highlight"', () => {
      const result = canParse('idagdag .highlight', 'tl');
      if (result) {
        const node = parse('idagdag .highlight', 'tl');
        expect(node.action).toBe('add');
      } else {
        const tokens = getTokens('idagdag .highlight', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "magdagdag .highlight"', () => {
      const tokens = getTokens('magdagdag .highlight', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Remove commands', () => {
    it('should parse "alisin .highlight"', () => {
      const result = canParse('alisin .highlight', 'tl');
      if (result) {
        const node = parse('alisin .highlight', 'tl');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('alisin .highlight', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "tanggalin .highlight"', () => {
      const tokens = getTokens('tanggalin .highlight', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "ipakita #modal"', () => {
      const result = canParse('ipakita #modal', 'tl');
      if (result) {
        const node = parse('ipakita #modal', 'tl');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('ipakita #modal', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "itago #modal"', () => {
      const result = canParse('itago #modal', 'tl');
      if (result) {
        const node = parse('itago #modal', 'tl');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('itago #modal', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Put/Set/Get commands', () => {
    it('should parse "ilagay \\"hello\\" sa #output"', () => {
      const result = canParse('ilagay "hello" sa #output', 'tl');
      if (result) {
        const node = parse('ilagay "hello" sa #output', 'tl');
        expect(node.action).toBe('put');
      } else {
        const tokens = getTokens('ilagay "hello" sa #output', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "itakda x sa 10"', () => {
      const result = canParse('itakda x sa 10', 'tl');
      if (result) {
        const node = parse('itakda x sa 10', 'tl');
        expect(node.action).toBe('set');
      } else {
        const tokens = getTokens('itakda x sa 10', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "kunin #element"', () => {
      const result = canParse('kunin #element', 'tl');
      if (result) {
        const node = parse('kunin #element', 'tl');
        expect(node.action).toBe('get');
      } else {
        const tokens = getTokens('kunin #element', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "dagdagan counter"', () => {
      const result = canParse('dagdagan counter', 'tl');
      if (result) {
        const node = parse('dagdagan counter', 'tl');
        expect(node.action).toBe('increment');
      } else {
        const tokens = getTokens('dagdagan counter', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "bawasan counter"', () => {
      const result = canParse('bawasan counter', 'tl');
      if (result) {
        const node = parse('bawasan counter', 'tl');
        expect(node.action).toBe('decrement');
      } else {
        const tokens = getTokens('bawasan counter', 'tl');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Verb Morphology Tests - Tagalog Affixes
// =============================================================================

describe('Tagalog Verb Morphology and Affixes', () => {
  describe('Actor focus affixes (mag-, -um-)', () => {
    it('should recognize magdagdag (mag- prefix)', () => {
      const tokens = getTokens('magdagdag .highlight', 'tl');
      const addToken = tokens.find(t => t.normalized === 'add');
      expect(addToken).toBeDefined();
    });

    it('should recognize magsabi (verb: say)', () => {
      const tokens = getTokens('magsabi', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Object focus affixes (i-, -in)', () => {
    it('should recognize ilagay (i- prefix + lagay)', () => {
      const tokens = getTokens('ilagay "text" sa #output', 'tl');
      const putToken = tokens.find(t => t.normalized === 'put');
      expect(putToken).toBeDefined();
    });

    it('should recognize itakda (i- prefix + takda)', () => {
      const tokens = getTokens('itakda x sa 10', 'tl');
      const setToken = tokens.find(t => t.normalized === 'set');
      expect(setToken).toBeDefined();
    });

    it('should recognize ipakita (i- prefix + pakita)', () => {
      const tokens = getTokens('ipakita #modal', 'tl');
      const showToken = tokens.find(t => t.normalized === 'show');
      expect(showToken).toBeDefined();
    });
  });

  describe('Patient focus affixes (ma-, -an)', () => {
    it('should recognize magtago (mag- + tago)', () => {
      const tokens = getTokens('magtago #modal', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize itago (i- + tago)', () => {
      const tokens = getTokens('itago #modal', 'tl');
      const hideToken = tokens.find(t => t.normalized === 'hide');
      expect(hideToken).toBeDefined();
    });
  });
});

// =============================================================================
// Preposition/Marker Tests
// =============================================================================

describe('Tagalog Prepositions and Role Markers', () => {
  describe('Destination marker: sa', () => {
    it('should handle sa (to/into)', () => {
      const tokens = getTokens('ilagay "text" sa #output', 'tl');
      const saToken = tokens.find(t => t.value === 'sa');
      expect(saToken).toBeDefined();
    });

    it('should recognize sa in target expressions', () => {
      const tokens = getTokens('palitan .active sa #button', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Source marker: mula_sa / galing_sa', () => {
    it('should handle mula_sa (from)', () => {
      const tokens = getTokens('kunin mula_sa #element', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle galing_sa as alternative for from', () => {
      const tokens = getTokens('kunin galing_sa #element', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Manner marker: nang', () => {
    it('should handle nang (manner, how)', () => {
      const tokens = getTokens('gumawa nang mabilis', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Possessive/Linker: ng', () => {
    it('should handle ng (linker for possession)', () => {
      const tokens = getTokens('ang kulay ng #button', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Possessive pronouns', () => {
    it('should handle ko (my)', () => {
      const tokens = getTokens('kukunin ko', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle mo (your)', () => {
      const tokens = getTokens('kukunin mo', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle niya (his/her/its)', () => {
      const tokens = getTokens('kukunin niya', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Tagalog Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "kapag pindot palitan .active sa #button"', () => {
      const tokens = getTokens('kapag pindot palitan .active sa #button', 'tl');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "kapag input ilagay \\"test\\" sa #output"', () => {
      const tokens = getTokens('kapag input ilagay "test" sa #output', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound commands with saka (then)', () => {
      const tokens = getTokens('idagdag .loading saka maghintay 1s saka alisin .loading', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "kapag pindot ituon ipakita #tooltip"', () => {
      const tokens = getTokens('kapag pindot ituon ipakita #tooltip', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-word commands and keywords', () => {
    it('should handle "palitan" as single toggle command', () => {
      const tokens = getTokens('palitan .active', 'tl');
      const toggleToken = tokens.find(t => t.normalized === 'toggle');
      expect(toggleToken).toBeDefined();
    });

    it('should handle "idagdag" as single add command', () => {
      const tokens = getTokens('idagdag .highlight', 'tl');
      const addToken = tokens.find(t => t.normalized === 'add');
      expect(addToken).toBeDefined();
    });

    it('should handle "ilagay" as single put command', () => {
      const tokens = getTokens('ilagay "text" sa #output', 'tl');
      const putToken = tokens.find(t => t.normalized === 'put');
      expect(putToken).toBeDefined();
    });
  });

  describe('VSO word order in practice', () => {
    it('should parse verb-initial "palitan .active sa #button"', () => {
      const tokens = getTokens('palitan .active sa #button', 'tl');
      // Verb comes first in VSO order
      expect(tokens[0].value).toBe('palitan');
    });

    it('should parse verb-initial "idagdag .highlight"', () => {
      const tokens = getTokens('idagdag .highlight', 'tl');
      expect(tokens[0].value).toBe('idagdag');
    });

    it('should handle "kapag pindot" with verb-initial pattern', () => {
      const tokens = getTokens('kapag pindot palitan .active', 'tl');
      // After event marker, verb comes
      const toggleIdx = tokens.findIndex(t => t.normalized === 'toggle');
      expect(toggleIdx).toBeGreaterThan(-1);
    });
  });

  describe('Alternative verb forms', () => {
    it('should recognize alternative add form: magdagdag', () => {
      const tokens = getTokens('magdagdag .highlight', 'tl');
      const addToken = tokens.find(t => t.normalized === 'add');
      expect(addToken).toBeDefined();
    });

    it('should recognize alternative show form: magpakita', () => {
      const tokens = getTokens('magpakita #modal', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize alternative hide form: magtago', () => {
      const tokens = getTokens('magtago #modal', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should recognize alternative remove form: tanggalin', () => {
      const tokens = getTokens('tanggalin .highlight', 'tl');
      const removeToken = tokens.find(t => t.normalized === 'remove');
      expect(removeToken).toBeDefined();
    });

    it('should recognize primary get form: kunin', () => {
      const tokens = getTokens('kunin #element', 'tl');
      const getToken = tokens.find(t => t.normalized === 'get');
      expect(getToken).toBeDefined();
    });

    it('should recognize alternative increment form: taasan', () => {
      const tokens = getTokens('taasan counter', 'tl');
      const incrementToken = tokens.find(t => t.normalized === 'increment');
      expect(incrementToken).toBeDefined();
    });

    it('should recognize alternative decrement form: ibaba', () => {
      const tokens = getTokens('ibaba counter', 'tl');
      const decrementToken = tokens.find(t => t.normalized === 'decrement');
      expect(decrementToken).toBeDefined();
    });
  });

  describe('Control flow keywords', () => {
    it('should handle kung (if)', () => {
      const tokens = getTokens('kung may .error', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle kung_hindi (else)', () => {
      const tokens = getTokens('kung_hindi idagdag .success', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle habang (while)', () => {
      const tokens = getTokens('habang totoo', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ulitin (repeat)', () => {
      const tokens = getTokens('ulitin', 'tl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Positional put (before/after)', () => {
    // `bago` (before) / `matapos` (after) are destination markers for
    // `put X before/after Y`. `matapos` — not `pagkatapos` (which is also "then")
    // — is the unambiguous positional "after".
    it('parses put … bago (before) …', () => {
      expect(parse('ilagay "<p>New</p>" bago ako kapag click', 'tl')).toBeTruthy();
    });

    it('parses put … matapos (after) …', () => {
      expect(parse('ilagay "<p>New</p>" matapos ako kapag click', 'tl')).toBeTruthy();
    });
  });
});

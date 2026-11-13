/**
 * German Native Idiom Tests
 *
 * Tests for native German idiom patterns that go beyond
 * direct translations to support more natural German expressions.
 *
 * German features:
 * - SVO word order (V2 in main clauses)
 * - Prepositions for grammatical roles
 * - Space-separated words
 * - Umlauts (a-umlaut, o-umlaut, u-umlaut) and eszett
 * - Compound nouns and separable verb prefixes
 * - Case system (nominative, accusative, dative, genitive)
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
// Tokenizer Tests - Native Keyword Detection
// =============================================================================

describe('German Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize bei as event marker', () => {
      const tokens = getTokens('bei Klick', 'de');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const beiToken = tokens.find(t => t.value === 'bei');
      expect(beiToken).toBeDefined();
    });

    it('should tokenize beim as event marker', () => {
      const tokens = getTokens('beim Klick', 'de');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize wenn as temporal marker', () => {
      const tokens = getTokens('wenn Klick', 'de');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const wennToken = tokens.find(t => t.value === 'wenn');
      expect(wennToken).toBeDefined();
    });
  });

  describe('Command keywords', () => {
    it('should tokenize umschalten as toggle', () => {
      const tokens = getTokens('umschalten .active', 'de');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize wechseln as toggle (alternative)', () => {
      const tokens = getTokens('wechseln .active', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize hinzufuegen as add', () => {
      const tokens = getTokens('hinzufügen .highlight', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize entfernen as remove', () => {
      const tokens = getTokens('entfernen .highlight', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize zeigen as show', () => {
      const tokens = getTokens('zeigen #modal', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize verbergen as hide', () => {
      const tokens = getTokens('verbergen #dropdown', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize erhoehen as increment', () => {
      const tokens = getTokens('erhöhen counter', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should tokenize verringern as decrement', () => {
      const tokens = getTokens('verringern counter', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });

    it('should tokenize setzen as put', () => {
      const tokens = getTokens('setzen "hallo" in #output', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('put');
    });

    it('should tokenize festlegen as set', () => {
      const tokens = getTokens('festlegen x auf 10', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('set');
    });

    it('should tokenize holen as get', () => {
      const tokens = getTokens('holen #element', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('get');
    });

    it('should tokenize abrufen as fetch', () => {
      const tokens = getTokens('abrufen /api/data', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('fetch');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('umschalten .active', 'de');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('zeigen #modal', 'de');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('German Event Handler Patterns', () => {
  describe('Standard pattern: bei {event}', () => {
    it('should tokenize "bei Klick umschalten .active"', () => {
      const tokens = getTokens('bei Klick umschalten .active', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "bei Absenden zeigen #result"', () => {
      const tokens = getTokens('bei Absenden zeigen #result', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "bei Eingabe umschalten .active"', () => {
      const tokens = getTokens('bei Eingabe umschalten .active', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternate pattern: beim {event}', () => {
    it('should tokenize "beim Klick umschalten .active"', () => {
      const tokens = getTokens('beim Klick umschalten .active', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "beim Hover hinzufügen .highlight"', () => {
      const tokens = getTokens('beim Hover hinzufügen .highlight', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Temporal pattern: wenn {event}', () => {
    it('should tokenize "wenn Klick umschalten .active"', () => {
      const tokens = getTokens('wenn Klick umschalten .active', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "wenn Änderung zeigen #result"', () => {
      const tokens = getTokens('wenn Änderung zeigen #result', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With destination: bei {event} auf {destination}', () => {
    it('should tokenize "bei Klick auf #button umschalten .active"', () => {
      const tokens = getTokens('bei Klick auf #button umschalten .active', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('German Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "umschalten .active"', () => {
      const node = parse('umschalten .active', 'de');
      expect(node.action).toBe('toggle');
    });

    it('should parse "wechseln .visible" (alternative)', () => {
      const node = parse('wechseln .visible', 'de');
      expect(node.action).toBe('toggle');
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "zeige #modal"', () => {
      const node = parse('zeige #modal', 'de');
      expect(node.action).toBe('show');
    });

    it('should parse "anzeigen #panel" (alternative)', () => {
      const node = parse('anzeigen #panel', 'de');
      expect(node.action).toBe('show');
    });

    it('should parse "verstecke #modal"', () => {
      const node = parse('verstecke #modal', 'de');
      expect(node.action).toBe('hide');
    });

    it('should parse "verbergen #dropdown"', () => {
      const node = parse('verbergen #dropdown', 'de');
      expect(node.action).toBe('hide');
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "hinzufügen .highlight"', () => {
      const node = parse('hinzufügen .highlight', 'de');
      expect(node.action).toBe('add');
    });

    it('should parse "entfernen .highlight"', () => {
      const node = parse('entfernen .highlight', 'de');
      expect(node.action).toBe('remove');
    });

    it('should parse "löschen .error" (alternative)', () => {
      const node = parse('löschen .error', 'de');
      expect(node.action).toBe('remove');
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "erhöhe zähler"', () => {
      const node = parse('erhöhe zähler', 'de');
      expect(node.action).toBe('increment');
    });

    it('should parse "verringere zähler"', () => {
      const node = parse('verringere zähler', 'de');
      expect(node.action).toBe('decrement');
    });

    it('should parse "erhöhen #counter"', () => {
      const node = parse('erhöhen #counter', 'de');
      expect(node.action).toBe('increment');
    });
  });

  describe('Put/Set/Get commands', () => {
    it('should parse "setzen "hallo" in #output"', () => {
      const node = parse('setzen "hallo" in #output', 'de');
      expect(node.action).toBe('put');
    });

    it('should parse "setze x auf 10"', () => {
      const node = parse('setze x auf 10', 'de');
      expect(['set', 'put']).toContain(node.action);
    });

    it('should parse "hole #element"', () => {
      const node = parse('hole #element', 'de');
      expect(node.action).toBe('get');
    });
  });
});

// =============================================================================
// Script-Specific Tests (Umlauts and Eszett)
// =============================================================================

describe('German Script - Umlauts and Eszett', () => {
  describe('a-umlaut handling', () => {
    it('should handle keywords with a-umlaut: anhängen', () => {
      const tokens = getTokens('anhängen #element', 'de');
      expect(tokens.length).toBeGreaterThan(0);
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('append');
    });

    it('should handle Änderung (change) with a-umlaut', () => {
      const tokens = getTokens('bei Änderung zeigen #result', 'de');
      const changeToken = tokens.find(t => t.normalized === 'change');
      expect(changeToken).toBeDefined();
    });
  });

  describe('o-umlaut handling', () => {
    it('should handle keywords with o-umlaut: erhöhen', () => {
      const tokens = getTokens('erhöhen #counter', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should handle löschen with o-umlaut', () => {
      const tokens = getTokens('löschen .error', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should handle auslösen with o-umlaut', () => {
      const tokens = getTokens('auslösen click', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('trigger');
    });
  });

  describe('u-umlaut handling', () => {
    it('should handle keywords with u-umlaut: hinzufügen', () => {
      const tokens = getTokens('hinzufügen .active', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should handle zurückgeben with u-umlaut', () => {
      const tokens = getTokens('zurückgeben 42', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('return');
    });

    it('should handle für with u-umlaut', () => {
      const tokens = getTokens('für element', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle übergang with u-umlaut', () => {
      const tokens = getTokens('übergang .fade', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('transition');
    });
  });

  describe('Eszett handling', () => {
    it('should recognize eszett in German identifiers', () => {
      const tokens = getTokens('setzen "gruß" in #output', 'de');
      expect(tokens.length).toBeGreaterThan(0);
      const stringToken = tokens.find(t => t.value === '"gruß"');
      expect(stringToken).toBeDefined();
    });

    it('should handle identifiers containing eszett', () => {
      const tokens = getTokens('festlegen größe auf 10', 'de');
      expect(tokens.length).toBeGreaterThan(0);
      const identToken = tokens.find(t => t.value === 'größe');
      expect(identToken).toBeDefined();
    });
  });

  describe('Umlaut-free variants', () => {
    it('should accept hinzufugen as fallback for hinzufügen', () => {
      const tokens = getTokens('hinzufugen .active', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should accept loschen as fallback for löschen', () => {
      const tokens = getTokens('loschen .error', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should accept erhohen as fallback for erhöhen', () => {
      const tokens = getTokens('erhohen #counter', 'de');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });
  });
});

// =============================================================================
// Preposition/Modifier Tests
// =============================================================================

describe('German Prepositions and Modifiers', () => {
  describe('Destination preposition: auf', () => {
    it('should handle auf (on/onto)', () => {
      const tokens = getTokens('umschalten .active auf #button', 'de');
      const aufToken = tokens.find(t => t.value === 'auf');
      expect(aufToken).toBeDefined();
    });

    it('should handle zu (to)', () => {
      const tokens = getTokens('gehen zu /home', 'de');
      const zuToken = tokens.find(t => t.value === 'zu');
      expect(zuToken).toBeDefined();
    });

    it('should handle in (in/into)', () => {
      const tokens = getTokens('setzen "hallo" in #output', 'de');
      const inToken = tokens.find(t => t.value === 'in');
      expect(inToken).toBeDefined();
    });
  });

  describe('Source preposition: von', () => {
    it('should handle von (from)', () => {
      const tokens = getTokens('entfernen .active von #element', 'de');
      const vonToken = tokens.find(t => t.value === 'von');
      expect(vonToken).toBeDefined();
    });

    it('should handle aus (from/out of)', () => {
      const tokens = getTokens('holen wert aus #input', 'de');
      const ausToken = tokens.find(t => t.value === 'aus');
      expect(ausToken).toBeDefined();
    });
  });

  describe('Style preposition: mit', () => {
    it('should handle mit (with)', () => {
      const tokens = getTokens('zeigen #modal mit .fade', 'de');
      const mitToken = tokens.find(t => t.value === 'mit');
      expect(mitToken).toBeDefined();
    });
  });

  describe('Other prepositions', () => {
    it('should handle nach (after/to)', () => {
      const tokens = getTokens('nach 1s zeigen #tooltip', 'de');
      const nachToken = tokens.find(t => t.value === 'nach');
      expect(nachToken).toBeDefined();
    });

    it('should handle vor (before)', () => {
      const tokens = getTokens('vor #element hinzufügen .new', 'de');
      const vorToken = tokens.find(t => t.value === 'vor');
      expect(vorToken).toBeDefined();
    });
  });

  describe('Possessive forms', () => {
    it('should handle mein (my)', () => {
      const tokens = getTokens('mein wert', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle meine (my, feminine/plural)', () => {
      const tokens = getTokens('meine eigenschaft', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle dein (your)', () => {
      const tokens = getTokens('dein text', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle sein (its)', () => {
      const tokens = getTokens('sein wert', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('German Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "bei Klick umschalten .active auf #button"', () => {
      const tokens = getTokens('bei Klick umschalten .active auf #button', 'de');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "bei Absenden umschalten .loading"', () => {
      const tokens = getTokens('bei Absenden umschalten .loading', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "bei Hover hinzufügen .highlight auf #element"', () => {
      const tokens = getTokens('bei Hover hinzufügen .highlight auf #element', 'de');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "bei Fokus zeigen #tooltip"', () => {
      const tokens = getTokens('bei Fokus zeigen #tooltip', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "bei Eingabe setzen "test" auf #output"', () => {
      const tokens = getTokens('bei Eingabe setzen "test" auf #output', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Compound commands with dann (then)', () => {
    it('should handle chained commands with dann', () => {
      const tokens = getTokens('hinzufügen .loading dann warten 1s dann entfernen .loading', 'de');
      expect(tokens.length).toBeGreaterThan(0);
      const thenTokens = tokens.filter(t => t.normalized === 'then');
      expect(thenTokens.length).toBe(2);
    });

    it('should handle chained commands with anschließend', () => {
      const tokens = getTokens('zeigen #modal anschließend hinzufügen .active', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound with und (and)', () => {
      const tokens = getTokens('hinzufügen .active und zeigen #panel', 'de');
      expect(tokens.length).toBeGreaterThan(0);
      const undToken = tokens.find(t => t.normalized === 'and');
      expect(undToken).toBeDefined();
    });
  });

  describe('Event handler with compound body', () => {
    it('should handle "bei Klick hinzufügen .loading dann abrufen /api/data dann entfernen .loading"', () => {
      const tokens = getTokens(
        'bei Klick hinzufügen .loading dann abrufen /api/data dann entfernen .loading',
        'de'
      );
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "bei Absenden verbergen #form dann zeigen #danke"', () => {
      const tokens = getTokens('bei Absenden verbergen #form dann zeigen #danke', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Reference keywords', () => {
    it('should handle ich (me) reference', () => {
      const tokens = getTokens('umschalten .active auf ich', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle es (it) reference', () => {
      const tokens = getTokens('zeigen es', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle du (you) reference', () => {
      const tokens = getTokens('verbergen du', 'de');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

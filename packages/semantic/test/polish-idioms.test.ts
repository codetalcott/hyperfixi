/**
 * Polish Native Idiom Tests
 *
 * Tests for native Polish idiom patterns that go beyond
 * direct translations to support more natural Polish expressions.
 *
 * Polish features:
 * - SVO (Subject-Verb-Object) default word order (relatively free)
 * - Fusional language with rich verb conjugation
 * - Uses IMPERATIVE form for commands in software UI (unique among profiles)
 * - Space-separated words with Polish diacritics (ą, ć, ę, ł, ń, ó, ś, ź, ż)
 * - Prepositions for grammatical roles (do, z, na, w, ze)
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
// Tokenizer Tests - Native Idiom Detection
// =============================================================================

describe('Polish Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize przy as event marker', () => {
      const tokens = getTokens('przy kliknięciu', 'pl');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const przyToken = tokens.find(t => t.value === 'przy');
      expect(przyToken).toBeDefined();
    });

    it('should tokenize na as event marker', () => {
      const tokens = getTokens('na kliknięciu', 'pl');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize gdy as event keyword', () => {
      const tokens = getTokens('gdy kliknięciu', 'pl');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const gdyToken = tokens.find(t => t.value === 'gdy');
      expect(gdyToken).toBeDefined();
    });

    it('should tokenize kiedy as temporal marker', () => {
      const tokens = getTokens('kiedy kliknięciu', 'pl');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize przełącz as toggle', () => {
      const tokens = getTokens('przełącz .active', 'pl');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should tokenize pokaż as show', () => {
      const tokens = getTokens('pokaż #modal', 'pl');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should tokenize ukryj as hide', () => {
      const tokens = getTokens('ukryj #dropdown', 'pl');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize dodaj as add', () => {
      const tokens = getTokens('dodaj .active', 'pl');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should tokenize usuń as remove', () => {
      const tokens = getTokens('usuń .active', 'pl');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize zwiększ as increment', () => {
      const tokens = getTokens('zwiększ counter', 'pl');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should tokenize zmniejsz as decrement', () => {
      const tokens = getTokens('zmniejsz counter', 'pl');
      expect(tokens[0].normalized).toBe('decrement');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('przełącz .active', 'pl');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('pokaż #modal', 'pl');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Polish Event Handler Patterns', () => {
  describe('Standard pattern: przy {event}', () => {
    it('should tokenize "przy kliknięciu przełącz .active"', () => {
      const tokens = getTokens('przy kliknięciu przełącz .active', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "przy wysłaniu pokaż #result"', () => {
      const tokens = getTokens('przy wysłaniu pokaż #result', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternate pattern: gdy {event}', () => {
    it('should tokenize "gdy kliknięciu przełącz .active"', () => {
      const tokens = getTokens('gdy kliknięciu przełącz .active', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "gdy zmianie pokaż #result"', () => {
      const tokens = getTokens('gdy zmianie pokaż #result', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With destination filter: przy {event} na {target}', () => {
    it('should tokenize "przy kliknięciu przełącz .active na #button"', () => {
      const tokens = getTokens('przy kliknięciu przełącz .active na #button', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Polish Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "przełącz .active"', () => {
      const node = parse('przełącz .active', 'pl');
      expect(node.action).toBe('toggle');
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "pokaż #modal"', () => {
      const node = parse('pokaż #modal', 'pl');
      expect(node.action).toBe('show');
    });

    it('should parse "ukryj #modal"', () => {
      const node = parse('ukryj #modal', 'pl');
      expect(node.action).toBe('hide');
    });

    it('should parse "schowaj #menu" (alternate hide)', () => {
      const tokens = getTokens('schowaj #menu', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "dodaj .highlight"', () => {
      const node = parse('dodaj .highlight', 'pl');
      expect(node.action).toBe('add');
    });

    it('should parse "usuń .highlight"', () => {
      const node = parse('usuń .highlight', 'pl');
      expect(node.action).toBe('remove');
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "zwiększ counter"', () => {
      const node = parse('zwiększ counter', 'pl');
      expect(node.action).toBe('increment');
    });

    it('should parse "zmniejsz counter"', () => {
      const node = parse('zmniejsz counter', 'pl');
      expect(node.action).toBe('decrement');
    });
  });
});

// =============================================================================
// Polish Diacritic Tests (Script-Specific)
// =============================================================================

describe('Polish Diacritics', () => {
  describe('All 9 Polish diacritics (ą, ć, ę, ł, ń, ó, ś, ź, ż)', () => {
    it('should handle ą (ogonek) in przełącz', () => {
      const tokens = getTokens('przełącz .active', 'pl');
      expect(tokens[0].kind).toBe('keyword');
    });

    it('should handle ć (acute) in umieść', () => {
      const tokens = getTokens('umieść "tekst" w #output', 'pl');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should handle ę (ogonek) in identifiers', () => {
      const tokens = getTokens('częstość', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ł (stroke) in przełącz', () => {
      const tokens = getTokens('przełącz .visible', 'pl');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should handle ń (acute) in usuń', () => {
      const tokens = getTokens('usuń .active', 'pl');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should handle ó (acute) in utwórz', () => {
      const tokens = getTokens('utwórz element', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ś (acute) in wyświetl', () => {
      const tokens = getTokens('wyświetl #modal', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ź (acute) in idź', () => {
      const tokens = getTokens('idź /strona', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ż (overdot) in jeżeli', () => {
      const tokens = getTokens('jeżeli prawda', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('ASCII fallback (diacritics stripped)', () => {
    it('should accept przelacz for przełącz', () => {
      const tokens = getTokens('przelacz .active', 'pl');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should accept usun for usuń', () => {
      const tokens = getTokens('usun .active', 'pl');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should accept pokaz for pokaż', () => {
      const tokens = getTokens('pokaz #modal', 'pl');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should accept umiesc for umieść', () => {
      const tokens = getTokens('umiesc "text" w #output', 'pl');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should accept zwieksz for zwiększ', () => {
      const tokens = getTokens('zwieksz counter', 'pl');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should accept wyswietl for wyświetl', () => {
      const tokens = getTokens('wyswietl #panel', 'pl');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should accept wyczysc for wyczyść', () => {
      const tokens = getTokens('wyczysc .error', 'pl');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should accept zaladuj for załaduj', () => {
      const tokens = getTokens('zaladuj /api/data', 'pl');
      expect(tokens[0].normalized).toBe('fetch');
    });
  });

  describe('Imperative form recognition', () => {
    it('should recognize imperative przełącz (not infinitive przełączać)', () => {
      expect(getTokens('przełącz .active', 'pl')[0].normalized).toBe('toggle');
    });

    it('should recognize imperative dodaj (not infinitive dodawać)', () => {
      expect(getTokens('dodaj .highlight', 'pl')[0].normalized).toBe('add');
    });

    it('should recognize imperative usuń (not infinitive usuwać)', () => {
      expect(getTokens('usuń .highlight', 'pl')[0].normalized).toBe('remove');
    });

    it('should recognize imperative ustaw (not infinitive ustawiać)', () => {
      expect(getTokens('ustaw x na 5', 'pl')[0].normalized).toBe('set');
    });
  });
});

// =============================================================================
// Preposition/Modifier Tests
// =============================================================================

describe('Polish Prepositions and Modifiers', () => {
  describe('Destination prepositions (do, w, na)', () => {
    it('should handle do (to/into)', () => {
      const tokens = getTokens('umieść "test" do #output', 'pl');
      expect(tokens.find(t => t.value === 'do')).toBeDefined();
    });

    it('should handle w (in)', () => {
      const tokens = getTokens('umieść "cześć" w #output', 'pl');
      expect(tokens.find(t => t.value === 'w')).toBeDefined();
    });

    it('should handle na (on/for)', () => {
      const tokens = getTokens('ustaw x na 10', 'pl');
      expect(tokens.find(t => t.value === 'na')).toBeDefined();
    });
  });

  describe('Source prepositions (z, ze)', () => {
    it('should handle z (from/with)', () => {
      const tokens = getTokens('usuń .class z #element', 'pl');
      expect(tokens.find(t => t.value === 'z')).toBeDefined();
    });

    it('should handle ze (from, before consonant clusters)', () => {
      const tokens = getTokens('usuń .class ze #strony', 'pl');
      expect(tokens.find(t => t.value === 'ze')).toBeDefined();
    });
  });

  describe('Possessive forms', () => {
    it('should handle mój/moja/moje (my)', () => {
      expect(getTokens('mój element', 'pl').length).toBeGreaterThan(0);
    });

    it('should handle twój/twoja/twoje (your)', () => {
      expect(getTokens('twój element', 'pl').length).toBeGreaterThan(0);
    });

    it('should handle jego/jej (his/her/its)', () => {
      expect(getTokens('jego wartość', 'pl').length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Polish Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "przy kliknięciu przełącz .active na #button"', () => {
      const tokens = getTokens('przy kliknięciu przełącz .active na #button', 'pl');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "przy wysłaniu przełącz .loading"', () => {
      const tokens = getTokens('przy wysłaniu przełącz .loading', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "przy wprowadzeniu umieść "test" do #output"', () => {
      const tokens = getTokens('przy wprowadzeniu umieść "test" do #output', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "przy zmianie ustaw x na 10"', () => {
      const tokens = getTokens('przy zmianie ustaw x na 10', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Compound commands', () => {
    it('should handle chaining with potem (then)', () => {
      const tokens = getTokens('dodaj .loading potem czekaj 1s potem usuń .loading', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
      const potemTokens = tokens.filter(t => t.value === 'potem');
      expect(potemTokens.length).toBe(2);
    });

    it('should handle chaining with wtedy (then)', () => {
      const tokens = getTokens('przełącz .active wtedy pokaż #result', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle chaining with i (and)', () => {
      const tokens = getTokens('dodaj .highlight i pokaż #tooltip', 'pl');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.find(t => t.value === 'i')).toBeDefined();
    });

    it('should handle event handler with compound body', () => {
      const tokens = getTokens(
        'przy kliknięciu dodaj .loading potem pobierz /api/data potem usuń .loading',
        'pl'
      );
      expect(tokens.length).toBeGreaterThan(5);
    });
  });
});

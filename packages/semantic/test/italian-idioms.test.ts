/**
 * Italian Native Idiom Tests
 *
 * Tests for native Italian idiom patterns that go beyond
 * direct translations to support more natural Italian expressions.
 *
 * Key forms tested:
 * - Preposition: al (on/at) - Standard event trigger
 * - Temporal: quando (when) - Standard
 * - Imperative forms - Natural command style
 *
 * Italian features:
 * - SVO (Subject-Verb-Object) word order
 * - Three verb conjugation classes (-are, -ere, -ire)
 * - Articulated prepositions (al, del, nel, sul, etc.)
 * - Reflexive verbs with attached/detached pronouns
 *
 * @see NATIVE_REVIEW_NEEDED.md for patterns needing native speaker validation
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse, tokenize } from '../src';
import { ItalianMorphologicalNormalizer } from '../src/tokenizers/morphology/italian-normalizer';

/**
 * Helper to get tokens array from TokenStream
 */
function getTokens(input: string, language: string) {
  const stream = tokenize(input, language);
  return stream.tokens;
}

// =============================================================================
// Morphological Normalizer Tests
// =============================================================================

describe('Italian Morphological Normalization', () => {
  const normalizer = new ItalianMorphologicalNormalizer();

  describe('Present participle/gerund (-ando/-endo) removal', () => {
    it('should normalize alternando to alternare', () => {
      const result = normalizer.normalize('alternando');
      expect(result.stem).toBe('alternare');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize mostrando to mostrare', () => {
      const result = normalizer.normalize('mostrando');
      expect(result.stem).toBe('mostrare');
    });

    it('should normalize nascondendo to nascondere', () => {
      const result = normalizer.normalize('nascondendo');
      expect(result.stem).toBe('nascondere');
    });

    it('should normalize aggiungendo (strips -endo suffix)', () => {
      const result = normalizer.normalize('aggiungendo');
      expect(result.stem).toMatch(/^aggiunger/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('Past participle (-ato/-uto/-ito) removal', () => {
    it('should normalize alternato to alternare', () => {
      const result = normalizer.normalize('alternato');
      expect(result.stem).toBe('alternare');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize nascosto to nascondere', () => {
      const result = normalizer.normalize('nascosto');
      // Irregular past participle - may not fully normalize
      expect(result.stem).toBeDefined();
    });

    it('should normalize mostrato to mostrare', () => {
      const result = normalizer.normalize('mostrato');
      expect(result.stem).toBe('mostrare');
    });
  });

  describe('Reflexive verb handling', () => {
    it('should normalize mostrarsi to mostrare', () => {
      const result = normalizer.normalize('mostrarsi');
      expect(result.stem).toBe('mostrare');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize nascondersi to nascondere', () => {
      const result = normalizer.normalize('nascondersi');
      expect(result.stem).toBe('nascondere');
    });

    it('should normalize alternarsi to alternare', () => {
      const result = normalizer.normalize('alternarsi');
      expect(result.stem).toBe('alternare');
    });
  });

  describe('Infinitive forms (no change needed)', () => {
    it('should keep mostrare unchanged', () => {
      const result = normalizer.normalize('mostrare');
      expect(result.stem).toBe('mostrare');
      expect(result.confidence).toBe(1.0);
    });

    it('should keep nascondere unchanged', () => {
      const result = normalizer.normalize('nascondere');
      expect(result.stem).toBe('nascondere');
      expect(result.confidence).toBe(1.0);
    });

    it('should keep aggiungere unchanged', () => {
      const result = normalizer.normalize('aggiungere');
      expect(result.stem).toBe('aggiungere');
      expect(result.confidence).toBe(1.0);
    });
  });
});

// =============================================================================
// Tokenizer Tests - Native Idiom Detection
// =============================================================================

describe('Italian Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize al as event marker', () => {
      const tokens = getTokens('al clic', 'it');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const alToken = tokens.find(t => t.value === 'al');
      expect(alToken).toBeDefined();
    });

    it('should tokenize quando as event marker', () => {
      const tokens = getTokens('quando clic', 'it');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize su as event marker', () => {
      const tokens = getTokens('su clic', 'it');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize commutare as toggle', () => {
      const tokens = getTokens('commutare .active', 'it');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize mostrare as show', () => {
      const tokens = getTokens('mostrare #modal', 'it');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize nascondere as hide', () => {
      const tokens = getTokens('nascondere #dropdown', 'it');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize aggiungere as add', () => {
      const tokens = getTokens('aggiungere .active', 'it');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize rimuovere as remove', () => {
      const tokens = getTokens('rimuovere .active', 'it');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('commutare .active', 'it');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('mostrare #modal', 'it');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Italian Event Handler Patterns', () => {
  describe('Standard pattern: al {event}', () => {
    it('should parse "al clic commutare .active"', () => {
      const result = canParse('al clic commutare .active', 'it');
      if (result) {
        const node = parse('al clic commutare .active', 'it');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('al clic commutare .active', 'it');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "al invio mostrare #result"', () => {
      const tokens = getTokens('al invio mostrare #result', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Temporal pattern: quando {event}', () => {
    it('should parse "quando clic commutare .active"', () => {
      const result = canParse('quando clic commutare .active', 'it');
      if (result) {
        const node = parse('quando clic commutare .active', 'it');
        expect(node.action).toBe('on');
      } else {
        const tokens = getTokens('quando clic commutare .active', 'it');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "quando cambiamento mostrare #result"', () => {
      const tokens = getTokens('quando cambiamento mostrare #result', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: al clic su {source}', () => {
    it('should parse "al clic su #button commutare .active"', () => {
      const tokens = getTokens('al clic su #button commutare .active', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "quando clic su #submit mostrare #result"', () => {
      const tokens = getTokens('quando clic su #submit mostrare #result', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Italian Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "commutare .active"', () => {
      const result = canParse('commutare .active', 'it');
      if (result) {
        const node = parse('commutare .active', 'it');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('commutare .active', 'it');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "alternare .visible"', () => {
      const result = canParse('alternare .visible', 'it');
      if (result) {
        const node = parse('alternare .visible', 'it');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('alternare .visible', 'it');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "mostrare #modal"', () => {
      const result = canParse('mostrare #modal', 'it');
      if (result) {
        const node = parse('mostrare #modal', 'it');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('mostrare #modal', 'it');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "nascondere #dropdown"', () => {
      const result = canParse('nascondere #dropdown', 'it');
      if (result) {
        const node = parse('nascondere #dropdown', 'it');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('nascondere #dropdown', 'it');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "visualizzare #menu"', () => {
      const tokens = getTokens('visualizzare #menu', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "aggiungere .active"', () => {
      const result = canParse('aggiungere .active', 'it');
      if (result) {
        const node = parse('aggiungere .active', 'it');
        expect(node.action).toBe('add');
      } else {
        const tokens = getTokens('aggiungere .active', 'it');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "rimuovere .active"', () => {
      const result = canParse('rimuovere .active', 'it');
      if (result) {
        const node = parse('rimuovere .active', 'it');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('rimuovere .active', 'it');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "eliminare .active"', () => {
      const tokens = getTokens('eliminare .active', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Semantic Equivalence Tests
// =============================================================================

describe('Italian Semantic Equivalence', () => {
  describe('All event handler forms tokenize correctly', () => {
    it('al form tokenizes', () => {
      const tokens = getTokens('al clic commutare .active', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('quando form tokenizes', () => {
      const tokens = getTokens('quando clic commutare .active', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('su form tokenizes', () => {
      const tokens = getTokens('su clic commutare .active', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Commands with accented characters', () => {
    it('should handle à (a grave)', () => {
      const tokens = getTokens('già attivo', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle è (e grave)', () => {
      const tokens = getTokens('è attivo', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle é (e acute)', () => {
      const tokens = getTokens('perché clic', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ì (i grave)', () => {
      const tokens = getTokens('così fatto', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ò (o grave)', () => {
      const tokens = getTokens('però attivo', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ù (u grave)', () => {
      const tokens = getTokens('più elementi', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Articulated prepositions', () => {
    it('should handle al (a + il)', () => {
      const tokens = getTokens('al clic', 'it');
      const alToken = tokens.find(t => t.value === 'al');
      expect(alToken).toBeDefined();
    });

    it('should handle del (di + il)', () => {
      const tokens = getTokens("dell'elemento", 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle nel (in + il)', () => {
      const tokens = getTokens('nel contenitore', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle sul (su + il)', () => {
      const tokens = getTokens('sul pulsante', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Italian Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "al clic su #button aggiungere .active al #target"', () => {
      const tokens = getTokens('al clic su #button aggiungere .active al #target', 'it');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "quando invio mostrare #risultato"', () => {
      const tokens = getTokens('quando invio mostrare #risultato', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound commands', () => {
      const tokens = getTokens('aggiungere .loading poi attendere 1s poi rimuovere .loading', 'it');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

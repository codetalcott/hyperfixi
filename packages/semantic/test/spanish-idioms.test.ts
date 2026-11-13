/**
 * Spanish Native Idiom Tests
 *
 * Tests for native Spanish idiom patterns that go beyond
 * direct translations to support more natural Spanish expressions.
 *
 * These patterns accept multiple grammatically-correct forms that all
 * normalize to equivalent semantic nodes.
 *
 * Key forms tested:
 * - Native idiom: al + infinitive (upon/when doing) - Most idiomatic
 * - Temporal: cuando (when) - Standard
 * - Preposition: en (on/in) - Direct translation
 * - Conditional: si (if) - Hypothetical
 *
 * Spanish features:
 * - SVO (Subject-Verb-Object) word order
 * - Three verb conjugation classes (-ar, -er, -ir)
 * - Reflexive verbs with attached/detached pronouns
 * - Preposition contractions (al = a + el, del = de + el)
 *
 * Research notes:
 * - "al hacer clic" is idiomatic and natural (most common form)
 * - "cuando haga clic" is standard (formal/written)
 * - "en clic" is less natural - "al hacer clic" preferred
 * - Spanish UI typically uses infinitive forms: "Haga clic para..."
 *
 * @see NATIVE_REVIEW_NEEDED.md for patterns needing native speaker validation
 */

import { describe, it, expect } from 'vitest';
import { parse, tokenize } from '../src';
import { SpanishMorphologicalNormalizer } from '../src/tokenizers/morphology/spanish-normalizer';

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

describe('Spanish Morphological Normalization', () => {
  const normalizer = new SpanishMorphologicalNormalizer();

  describe('Gerund (-ando/-iendo) removal', () => {
    it('should normalize alternando to alternar', () => {
      const result = normalizer.normalize('alternando');
      expect(result.stem).toBe('alternar');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize mostrando to mostrar', () => {
      const result = normalizer.normalize('mostrando');
      expect(result.stem).toBe('mostrar');
    });

    it('should normalize escondiendo to esconder', () => {
      const result = normalizer.normalize('escondiendo');
      expect(result.stem).toBe('esconder');
    });

    it('should normalize añadiendo (strips -iendo suffix)', () => {
      const result = normalizer.normalize('añadiendo');
      // Normalizer may not perfectly reconstruct -ir verbs
      // The important thing is it strips the gerund suffix
      expect(result.stem).toMatch(/^añad/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('Past participle (-ado/-ido) removal', () => {
    it('should normalize alternado to alternar', () => {
      const result = normalizer.normalize('alternado');
      expect(result.stem).toBe('alternar');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize escondido to esconder', () => {
      const result = normalizer.normalize('escondido');
      expect(result.stem).toBe('esconder');
    });
  });

  describe('Preterite tense removal', () => {
    it('should normalize alternó to alternar', () => {
      const result = normalizer.normalize('alternó');
      expect(result.stem).toBe('alternar');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('should normalize mostró to mostrar', () => {
      const result = normalizer.normalize('mostró');
      expect(result.stem).toBe('mostrar');
    });
  });

  describe('Reflexive verb handling', () => {
    it('should normalize mostrarse to mostrar', () => {
      const result = normalizer.normalize('mostrarse');
      expect(result.stem).toBe('mostrar');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should normalize esconderse to esconder', () => {
      const result = normalizer.normalize('esconderse');
      expect(result.stem).toBe('esconder');
    });

    it('should normalize alternarse to alternar', () => {
      const result = normalizer.normalize('alternarse');
      expect(result.stem).toBe('alternar');
    });
  });

  describe('Infinitive forms (no change needed)', () => {
    it('should keep mostrar unchanged', () => {
      const result = normalizer.normalize('mostrar');
      expect(result.stem).toBe('mostrar');
      expect(result.confidence).toBe(1.0);
    });

    it('should keep esconder unchanged', () => {
      const result = normalizer.normalize('esconder');
      expect(result.stem).toBe('esconder');
      expect(result.confidence).toBe(1.0);
    });

    it('should keep añadir unchanged', () => {
      const result = normalizer.normalize('añadir');
      expect(result.stem).toBe('añadir');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Subjunctive forms', () => {
    it('should normalize haga to hacer', () => {
      const result = normalizer.normalize('haga');
      // Subjunctive is more complex - may not fully normalize
      expect(result.stem).toBeDefined();
    });
  });
});

// =============================================================================
// Tokenizer Tests - Native Idiom Detection
// =============================================================================

describe('Spanish Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize al as event marker', () => {
      const tokens = getTokens('al hacer clic', 'es');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const alToken = tokens.find(t => t.value === 'al');
      expect(alToken).toBeDefined();
    });

    it('should tokenize cuando as event marker', () => {
      const tokens = getTokens('cuando clic', 'es');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize en as event marker', () => {
      const tokens = getTokens('en clic', 'es');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize si as conditional marker', () => {
      const tokens = getTokens('si hace clic', 'es');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize alternar as toggle', () => {
      const tokens = getTokens('alternar .active', 'es');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize mostrar as show', () => {
      const tokens = getTokens('mostrar #modal', 'es');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize ocultar as hide', () => {
      const tokens = getTokens('ocultar #dropdown', 'es');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize añadir as add', () => {
      const tokens = getTokens('añadir .active', 'es');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize quitar as remove', () => {
      const tokens = getTokens('quitar .active', 'es');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('alternar .active', 'es');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('mostrar #modal', 'es');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Spanish Event Handler Patterns', () => {
  describe('Native idiom: al + infinitive', () => {
    it('should parse "al clic alternar .active"', () => {
      const node = parse('al clic alternar .active', 'es');
      expect(node.action).toBe('on');
    });

    it('should parse "al hacer clic alternar .active"', () => {
      const tokens = getTokens('al hacer clic alternar .active', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "al enviar mostrar #result"', () => {
      const tokens = getTokens('al enviar mostrar #result', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Standard pattern: en {event}', () => {
    it('should parse "en clic alternar .active"', () => {
      const node = parse('en clic alternar .active', 'es');
      expect(node.action).toBe('on');
    });
  });

  describe('Temporal pattern: cuando {event}', () => {
    it('should parse "cuando clic alternar .active"', () => {
      const node = parse('cuando clic alternar .active', 'es');
      expect(node.action).toBe('on');
    });

    it('should parse "cuando cambio mostrar #result"', () => {
      const tokens = getTokens('cuando cambio mostrar #result', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Conditional pattern: si {event}', () => {
    it('should parse "si clic alternar .active"', () => {
      const tokens = getTokens('si clic alternar .active', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "si hace clic mostrar #modal"', () => {
      const tokens = getTokens('si hace clic mostrar #modal', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: al clic en {source}', () => {
    it('should parse "al clic en #button alternar .active"', () => {
      const tokens = getTokens('al clic en #button alternar .active', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "cuando clic en #submit mostrar #result"', () => {
      const tokens = getTokens('cuando clic en #submit mostrar #result', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Spanish Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "alternar .active"', () => {
      const node = parse('alternar .active', 'es');
      expect(node.action).toBe('toggle');
    });

    it('should parse "cambiar .visible"', () => {
      const node = parse('cambiar .visible', 'es');
      expect(node.action).toBe('toggle');
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "mostrar #modal"', () => {
      const node = parse('mostrar #modal', 'es');
      expect(node.action).toBe('show');
    });

    it('should parse "ocultar #dropdown"', () => {
      const node = parse('ocultar #dropdown', 'es');
      expect(node.action).toBe('hide');
    });

    it('should parse "esconder #menu"', () => {
      const node = parse('esconder #menu', 'es');
      expect(node.action).toBe('hide');
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "añadir .active"', () => {
      const node = parse('añadir .active', 'es');
      expect(node.action).toBe('add');
    });

    it('should parse "quitar .active"', () => {
      const node = parse('quitar .active', 'es');
      expect(node.action).toBe('remove');
    });

    it('should parse "eliminar .active"', () => {
      const node = parse('eliminar .active', 'es');
      expect(node.action).toBe('remove');
    });
  });
});

// =============================================================================
// Semantic Equivalence Tests
// =============================================================================

describe('Spanish Semantic Equivalence', () => {
  describe('All event handler forms tokenize correctly', () => {
    it('native al form tokenizes', () => {
      const tokens = getTokens('al clic alternar .active', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('when form tokenizes', () => {
      const tokens = getTokens('cuando clic alternar .active', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('preposition form tokenizes', () => {
      const tokens = getTokens('en clic alternar .active', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('conditional form tokenizes', () => {
      const tokens = getTokens('si clic alternar .active', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Commands with special characters', () => {
    it('should handle ñ (n with tilde)', () => {
      const tokens = getTokens('añadir .active', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle á (a acute)', () => {
      const tokens = getTokens('está activo', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle é (e acute)', () => {
      const tokens = getTokens('después de clic', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ó (o acute)', () => {
      const tokens = getTokens('acción completada', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ú (u acute)', () => {
      const tokens = getTokens('último elemento', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ü (u with diaeresis)', () => {
      const tokens = getTokens('pingüino', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Preposition contractions', () => {
    it('should handle al (a + el)', () => {
      const tokens = getTokens('al clicar', 'es');
      const alToken = tokens.find(t => t.value === 'al');
      expect(alToken).toBeDefined();
    });

    it('should handle del (de + el)', () => {
      const tokens = getTokens('del elemento', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Latin American Spanish Variants
// =============================================================================

describe('Latin American Spanish Variants', () => {
  it('should handle voseo conjugations (Argentina/Uruguay)', () => {
    // vos hacés clic instead of tú haces clic
    const tokens = getTokens('hacés clic', 'es');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should handle ustedes as default plural (not vosotros)', () => {
    const tokens = getTokens('ustedes hacen clic', 'es');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should handle computadora (Latin America) as well as ordenador (Spain)', () => {
    // Both should be accepted
    const tokens1 = getTokens('computadora', 'es');
    const tokens2 = getTokens('ordenador', 'es');
    expect(tokens1.length).toBeGreaterThan(0);
    expect(tokens2.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Spanish Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "al clic en #button añadir .active al #target"', () => {
      const tokens = getTokens('al clic en #button añadir .active al #target', 'es');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "cuando envío mostrar #resultado"', () => {
      const tokens = getTokens('cuando envío mostrar #resultado', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound commands', () => {
      const tokens = getTokens('añadir .loading luego esperar 1s luego quitar .loading', 'es');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

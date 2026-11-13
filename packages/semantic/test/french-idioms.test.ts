/**
 * French Native Idiom Tests
 *
 * Tests for native French idiom patterns that go beyond
 * direct translations to support more natural French expressions.
 *
 * French features:
 * - SVO (Subject-Verb-Object) word order like English
 * - Space-separated words with rich accent marks
 * - Prepositions for grammatical roles (sur, de, dans, avec)
 * - Verb conjugation (infinitive form used in UI commands)
 * - Gendered articles (le/la/les, un/une/des)
 * - Accent marks: e with acute/grave/circumflex/diaeresis, c-cedilla, etc.
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

describe('French Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize au as event marker', () => {
      const tokens = getTokens('au clic', 'fr');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const auToken = tokens.find(t => t.value === 'au');
      expect(auToken).toBeDefined();
    });

    it('should tokenize quand as temporal marker', () => {
      const tokens = getTokens('quand clic', 'fr');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const quandToken = tokens.find(t => t.value === 'quand');
      expect(quandToken).toBeDefined();
    });

    it('should tokenize lorsque as temporal marker', () => {
      const tokens = getTokens('lorsque clic', 'fr');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize basculer as toggle', () => {
      const tokens = getTokens('basculer .active', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize alterner as toggle (alternative)', () => {
      const tokens = getTokens('alterner .active', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize afficher as show', () => {
      const tokens = getTokens('afficher #modal', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize montrer as show', () => {
      const tokens = getTokens('montrer #modal', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize cacher as hide', () => {
      const tokens = getTokens('cacher #dropdown', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize masquer as hide (alternative)', () => {
      const tokens = getTokens('masquer #dropdown', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize ajouter as add', () => {
      const tokens = getTokens('ajouter .active', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize supprimer as remove', () => {
      const tokens = getTokens('supprimer .active', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize enlever as remove (alternative)', () => {
      const tokens = getTokens('enlever .active', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize retirer as remove (alternative)', () => {
      const tokens = getTokens('retirer .active', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });

    it('should tokenize incrémenter as increment', () => {
      const tokens = getTokens('incrémenter compteur', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should tokenize décrémenter as decrement', () => {
      const tokens = getTokens('décrémenter compteur', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('basculer .active', 'fr');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('afficher #modal', 'fr');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('French Event Handler Patterns', () => {
  describe('Standard pattern: au {event}', () => {
    it('should tokenize "au clic basculer .active"', () => {
      const tokens = getTokens('au clic basculer .active', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "au soumission basculer .loading"', () => {
      const tokens = getTokens('au soumission basculer .loading', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternate pattern: quand {event}', () => {
    it('should tokenize "quand clic basculer .active"', () => {
      const tokens = getTokens('quand clic basculer .active', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "lorsque changement afficher #result"', () => {
      const tokens = getTokens('lorsque changement afficher #result', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: au {event} sur {source}', () => {
    it('should tokenize "au clic sur #button basculer .active"', () => {
      const tokens = getTokens('au clic sur #button basculer .active', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Event handler with destination', () => {
    it('should tokenize "au clic basculer .active sur #button"', () => {
      const tokens = getTokens('au clic basculer .active sur #button', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "au survol ajouter .hover sur #element"', () => {
      const tokens = getTokens('au survol ajouter .hover sur #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('French Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "basculer .active"', () => {
      const node = parse('basculer .active', 'fr');
      expect(node.action).toBe('toggle');
    });

    it('should parse "alterner .visible"', () => {
      const node = parse('alterner .visible', 'fr');
      expect(node.action).toBe('toggle');
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "afficher #modal"', () => {
      const node = parse('afficher #modal', 'fr');
      expect(node.action).toBe('show');
    });

    it('should parse "montrer #modal"', () => {
      const node = parse('montrer #modal', 'fr');
      expect(node.action).toBe('show');
    });

    it('should parse "cacher #modal"', () => {
      const node = parse('cacher #modal', 'fr');
      expect(node.action).toBe('hide');
    });

    it('should parse "masquer #dropdown"', () => {
      const node = parse('masquer #dropdown', 'fr');
      expect(node.action).toBe('hide');
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "ajouter .highlight"', () => {
      const node = parse('ajouter .highlight', 'fr');
      expect(node.action).toBe('add');
    });

    it('should parse "supprimer .highlight"', () => {
      const node = parse('supprimer .highlight', 'fr');
      expect(node.action).toBe('remove');
    });

    it('should parse "enlever .active"', () => {
      const node = parse('enlever .active', 'fr');
      expect(node.action).toBe('remove');
    });

    it('should parse "retirer .active"', () => {
      const node = parse('retirer .active', 'fr');
      expect(node.action).toBe('remove');
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "incrémenter compteur"', () => {
      const node = parse('incrémenter compteur', 'fr');
      expect(node.action).toBe('increment');
    });

    it('should parse "augmenter compteur" (alternative)', () => {
      const node = parse('augmenter compteur', 'fr');
      expect(node.action).toBe('increment');
    });

    it('should parse "décrémenter compteur"', () => {
      const node = parse('décrémenter compteur', 'fr');
      expect(node.action).toBe('decrement');
    });

    it('should parse "diminuer compteur" (alternative)', () => {
      const node = parse('diminuer compteur', 'fr');
      expect(node.action).toBe('decrement');
    });
  });

  describe('Put/Set/Get commands', () => {
    it('should parse "mettre \\"bonjour\\" dans #output"', () => {
      const node = parse('mettre "bonjour" dans #output', 'fr');
      expect(node.action).toBe('put');
    });

    it('should parse "définir x à 10"', () => {
      const node = parse('définir x à 10', 'fr');
      expect(node.action).toBe('set');
    });

    it('should parse "obtenir #element"', () => {
      const node = parse('obtenir #element', 'fr');
      expect(node.action).toBe('get');
    });
  });

  describe('Fetch command', () => {
    it('should parse "chercher /api/data"', () => {
      const node = parse('chercher /api/data', 'fr');
      expect(node.action).toBe('fetch');
    });

    it('should parse "récupérer /api/data" (alternative)', () => {
      const node = parse('récupérer /api/data', 'fr');
      expect(node.action).toBe('fetch');
    });
  });
});

// =============================================================================
// French Accent Tests
// =============================================================================

describe('French Accents', () => {
  describe('Acute accent (accent aigu) - e with acute: é', () => {
    it('should handle é in incrémenter', () => {
      const tokens = getTokens('incrémenter compteur', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should handle é in décrémenter', () => {
      const tokens = getTokens('décrémenter compteur', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });

    it('should handle é in récupérer', () => {
      const tokens = getTokens('récupérer /api/data', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('fetch');
    });
  });

  describe('Grave accent (accent grave) - è, à, ù', () => {
    it('should handle è in entrée', () => {
      const tokens = getTokens('entrée #input', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle à in définir x à 10', () => {
      const tokens = getTokens('définir x à 10', 'fr');
      const aToken = tokens.find(t => t.value === 'à');
      expect(aToken).toBeDefined();
    });

    it('should handle ù in où', () => {
      const tokens = getTokens('où #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Circumflex (accent circonflexe) - ê, â, û, ô, î', () => {
    it('should handle ê in arrêter', () => {
      const tokens = getTokens('arrêter', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle â in grâce', () => {
      const tokens = getTokens('grâce #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle î in connaître', () => {
      const tokens = getTokens('connaître #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ô in contrôle', () => {
      const tokens = getTokens('contrôle #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle û in sûr', () => {
      const tokens = getTokens('sûr #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Diaeresis (trema) - ë, ï', () => {
    it('should handle ë in Noël-style words', () => {
      const tokens = getTokens('noël #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ï in naïf-style words', () => {
      const tokens = getTokens('naïf #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Cedilla (cédille) - ç', () => {
    it('should handle ç in ça', () => {
      const tokens = getTokens('ça #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ç in façade-style words', () => {
      const tokens = getTokens('façade #element', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Accent-free fallbacks', () => {
    it('should handle definir (without accent) as set', () => {
      const tokens = getTokens('definir x', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('set');
    });

    it('should handle incrementer (without accent) as increment', () => {
      const tokens = getTokens('incrementer compteur', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('increment');
    });

    it('should handle decrementer (without accent) as decrement', () => {
      const tokens = getTokens('decrementer compteur', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('decrement');
    });

    it('should handle recuperer (without accent) as fetch', () => {
      const tokens = getTokens('recuperer /api/data', 'fr');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('fetch');
    });
  });
});

// =============================================================================
// Preposition/Modifier Tests
// =============================================================================

describe('French Prepositions and Modifiers', () => {
  describe('Destination preposition: sur (on)', () => {
    it('should handle sur for destination', () => {
      const tokens = getTokens('basculer .active sur #button', 'fr');
      const surToken = tokens.find(t => t.value === 'sur');
      expect(surToken).toBeDefined();
    });

    it('should handle à for destination (alternative)', () => {
      const tokens = getTokens('définir x à 10', 'fr');
      const aToken = tokens.find(t => t.value === 'à');
      expect(aToken).toBeDefined();
    });

    it('should handle dans for destination (alternative)', () => {
      const tokens = getTokens('mettre "bonjour" dans #output', 'fr');
      const dansToken = tokens.find(t => t.value === 'dans');
      expect(dansToken).toBeDefined();
    });
  });

  describe('Source preposition: de (from)', () => {
    it('should handle de for source', () => {
      const tokens = getTokens('supprimer .class de #element', 'fr');
      const deToken = tokens.find(t => t.value === 'de');
      expect(deToken).toBeDefined();
    });

    it('should handle depuis for source (alternative)', () => {
      const tokens = getTokens('supprimer .class depuis #element', 'fr');
      const depuisToken = tokens.find(t => t.value === 'depuis');
      expect(depuisToken).toBeDefined();
    });
  });

  describe('Style preposition: avec (with)', () => {
    it('should handle avec for style', () => {
      const tokens = getTokens('afficher #modal avec .fade', 'fr');
      const avecToken = tokens.find(t => t.value === 'avec');
      expect(avecToken).toBeDefined();
    });
  });

  describe('Possessive markers', () => {
    it('should handle mon/ma/mes (my)', () => {
      const tokens = getTokens('mon #element', 'fr');
      const monToken = tokens.find(t => t.value === 'mon');
      expect(monToken).toBeDefined();
    });

    it('should handle ton/ta/tes (your)', () => {
      const tokens = getTokens('ton #element', 'fr');
      const tonToken = tokens.find(t => t.value === 'ton');
      expect(tonToken).toBeDefined();
    });

    it('should handle son/sa/ses (its)', () => {
      const tokens = getTokens('son #element', 'fr');
      const sonToken = tokens.find(t => t.value === 'son');
      expect(sonToken).toBeDefined();
    });
  });

  describe('References', () => {
    it('should handle moi (me)', () => {
      const tokens = getTokens('ajouter .active sur moi', 'fr');
      const moiToken = tokens.find(t => t.value === 'moi');
      expect(moiToken).toBeDefined();
    });

    it('should handle il (it)', () => {
      const tokens = getTokens('basculer il', 'fr');
      const ilToken = tokens.find(t => t.value === 'il');
      expect(ilToken).toBeDefined();
    });

    it('should handle toi (you)', () => {
      const tokens = getTokens('afficher toi', 'fr');
      const toiToken = tokens.find(t => t.value === 'toi');
      expect(toiToken).toBeDefined();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('French Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "au clic sur #button ajouter .active sur #target"', () => {
      const tokens = getTokens('au clic sur #button ajouter .active sur #target', 'fr');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "au soumission afficher #résultat"', () => {
      const tokens = getTokens('au soumission afficher #résultat', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "au focus montrer #tooltip"', () => {
      const tokens = getTokens('au focus montrer #tooltip', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "au blur cacher #tooltip"', () => {
      const tokens = getTokens('au blur cacher #tooltip', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "au clic incrémenter #counter"', () => {
      const tokens = getTokens('au clic incrémenter #counter', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "au clic décrémenter #counter"', () => {
      const tokens = getTokens('au clic décrémenter #counter', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "au saisie mettre \\"test\\" dans #output"', () => {
      const tokens = getTokens('au saisie mettre "test" dans #output', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "au changement définir x à 10"', () => {
      const tokens = getTokens('au changement définir x à 10', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Compound commands with puis (then)', () => {
    it('should handle chained commands with puis', () => {
      const tokens = getTokens('ajouter .loading puis attendre 1s puis supprimer .loading', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
      const puisTokens = tokens.filter(t => t.value === 'puis');
      expect(puisTokens.length).toBe(2);
    });

    it('should handle chained commands with ensuite', () => {
      const tokens = getTokens('basculer .active ensuite afficher #message', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
      const ensuiteToken = tokens.find(t => t.value === 'ensuite');
      expect(ensuiteToken).toBeDefined();
    });

    it('should handle et (and) for compound commands', () => {
      const tokens = getTokens('ajouter .active et supprimer .inactive', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
      const etToken = tokens.find(t => t.value === 'et');
      expect(etToken).toBeDefined();
    });
  });

  describe('Complex multi-role commands', () => {
    it('should handle "au clic basculer .active sur #button"', () => {
      const tokens = getTokens('au clic basculer .active sur #button', 'fr');
      expect(tokens.length).toBeGreaterThan(4);
      const toggleToken = tokens.find(t => t.normalized === 'toggle');
      expect(toggleToken).toBeDefined();
    });

    it('should handle "au survol ajouter .hover sur #element"', () => {
      const tokens = getTokens('au survol ajouter .hover sur #element', 'fr');
      expect(tokens.length).toBeGreaterThan(4);
      const addToken = tokens.find(t => t.normalized === 'add');
      expect(addToken).toBeDefined();
    });

    it('should handle "au clic supprimer .error de #formulaire"', () => {
      const tokens = getTokens('au clic supprimer .error de #formulaire', 'fr');
      expect(tokens.length).toBeGreaterThan(4);
      const removeToken = tokens.find(t => t.normalized === 'remove');
      expect(removeToken).toBeDefined();
    });

    it('should handle "placer \\"texte\\" dans #sortie"', () => {
      const tokens = getTokens('placer "texte" dans #sortie', 'fr');
      expect(tokens.length).toBeGreaterThan(0);
      const putToken = tokens.find(t => t.normalized === 'put');
      expect(putToken).toBeDefined();
    });
  });
});

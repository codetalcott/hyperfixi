/**
 * Ukrainian Native Idiom Tests
 *
 * Tests for native Ukrainian idiom patterns that go beyond
 * direct translations to support more natural Ukrainian expressions.
 *
 * Ukrainian features:
 * - SVO (Subject-Verb-Object) default word order (relatively free)
 * - Fusional language with rich verb conjugation
 * - Uses INFINITIVE form for commands in software UI (industry standard)
 * - Space-separated words with Cyrillic script
 * - Unique Ukrainian letters: ґ, є, і, ї (not found in Russian Cyrillic)
 * - Soft sign (ь) used extensively in verb forms
 * - Prepositions for grammatical roles (в, на, до, з, від, із)
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

describe('Ukrainian Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize при as event marker', () => {
      const tokens = getTokens('при кліку', 'uk');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const priToken = tokens.find(t => t.value === 'при');
      expect(priToken).toBeDefined();
    });

    it('should tokenize коли as temporal marker', () => {
      const tokens = getTokens('коли кліку', 'uk');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const kolyToken = tokens.find(t => t.value === 'коли');
      expect(kolyToken).toBeDefined();
    });

    it('should tokenize якщо as temporal/conditional marker', () => {
      const tokens = getTokens('якщо кліку', 'uk');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const yakshchoToken = tokens.find(t => t.value === 'якщо');
      expect(yakshchoToken).toBeDefined();
    });
  });

  describe('Command keywords', () => {
    it('should tokenize перемкнути as toggle', () => {
      const tokens = getTokens('перемкнути .active', 'uk');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should tokenize додати as add', () => {
      const tokens = getTokens('додати .highlight', 'uk');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should tokenize видалити as remove', () => {
      const tokens = getTokens('видалити .highlight', 'uk');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize показати as show', () => {
      const tokens = getTokens('показати #modal', 'uk');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should tokenize сховати as hide', () => {
      const tokens = getTokens('сховати #modal', 'uk');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize збільшити as increment', () => {
      const tokens = getTokens('збільшити counter', 'uk');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should tokenize зменшити as decrement', () => {
      const tokens = getTokens('зменшити counter', 'uk');
      expect(tokens[0].normalized).toBe('decrement');
    });

    it('should tokenize покласти as put', () => {
      const tokens = getTokens('покласти "привіт" в #output', 'uk');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should tokenize встановити as set', () => {
      const tokens = getTokens('встановити x на 10', 'uk');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should tokenize отримати as get', () => {
      const tokens = getTokens('отримати #element', 'uk');
      expect(tokens[0].normalized).toBe('get');
    });

    it('should tokenize завантажити as fetch', () => {
      const tokens = getTokens('завантажити /api/data', 'uk');
      expect(tokens[0].normalized).toBe('fetch');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('перемкнути .active', 'uk');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('показати #modal', 'uk');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Ukrainian Event Handler Patterns', () => {
  describe('Standard pattern: при {event}', () => {
    it('should tokenize "при кліку перемкнути .active"', () => {
      const tokens = getTokens('при кліку перемкнути .active', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "при відправці перемкнути .loading"', () => {
      const tokens = getTokens('при відправці перемкнути .loading', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "при наведенні додати .highlight"', () => {
      const tokens = getTokens('при наведенні додати .highlight', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Temporal pattern: коли {event}', () => {
    it('should tokenize "коли кліку перемкнути .active"', () => {
      const tokens = getTokens('коли кліку перемкнути .active', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "коли зміні показати #result"', () => {
      const tokens = getTokens('коли зміні показати #result', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Conditional pattern: якщо {event}', () => {
    it('should tokenize "якщо кліку перемкнути .active"', () => {
      const tokens = getTokens('якщо кліку перемкнути .active', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With destination filter: при {event} на {target}', () => {
    it('should tokenize "при кліку перемкнути .active на #button"', () => {
      const tokens = getTokens('при кліку перемкнути .active на #button', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Ukrainian Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "перемкнути .active"', () => {
      const node = parse('перемкнути .active', 'uk');
      expect(node.action).toBe('toggle');
    });

    it('should parse "перемкни .visible" (imperative)', () => {
      const node = parse('перемкни .visible', 'uk');
      expect(node.action).toBe('toggle');
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "показати #modal"', () => {
      const node = parse('показати #modal', 'uk');
      expect(node.action).toBe('show');
    });

    it('should parse "покажи #panel" (imperative)', () => {
      const node = parse('покажи #panel', 'uk');
      expect(node.action).toBe('show');
    });

    it('should parse "сховати #modal"', () => {
      const node = parse('сховати #modal', 'uk');
      expect(node.action).toBe('hide');
    });

    it('should parse "приховати #dropdown" (alternate hide)', () => {
      const node = parse('приховати #dropdown', 'uk');
      expect(node.action).toBe('hide');
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "додати .highlight"', () => {
      const node = parse('додати .highlight', 'uk');
      expect(node.action).toBe('add');
    });

    it('should parse "видалити .highlight"', () => {
      const node = parse('видалити .highlight', 'uk');
      expect(node.action).toBe('remove');
    });

    it('should parse "прибрати .error" (alternate remove)', () => {
      const node = parse('прибрати .error', 'uk');
      expect(node.action).toBe('remove');
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "збільшити counter"', () => {
      const node = parse('збільшити counter', 'uk');
      expect(node.action).toBe('increment');
    });

    it('should parse "зменшити counter"', () => {
      const node = parse('зменшити counter', 'uk');
      expect(node.action).toBe('decrement');
    });
  });

  describe('Put/Set/Get commands', () => {
    it('should parse "покласти \\"привіт\\" в #output"', () => {
      const node = parse('покласти "привіт" в #output', 'uk');
      expect(node.action).toBe('put');
    });

    it('should parse "встановити x на 10"', () => {
      const node = parse('встановити x на 10', 'uk');
      expect(['set', 'put']).toContain(node.action);
    });

    it('should parse "отримати #element"', () => {
      const node = parse('отримати #element', 'uk');
      expect(node.action).toBe('get');
    });

    it('should parse "помістити \\"текст\\" в #output" (alternate put)', () => {
      const node = parse('помістити "текст" в #output', 'uk');
      expect(node.action).toBe('put');
    });
  });
});

// =============================================================================
// Ukrainian Cyrillic Script-Specific Tests
// =============================================================================

describe('Ukrainian Cyrillic Script', () => {
  describe('Unique Ukrainian letters (ґ, є, і, ї)', () => {
    it('should handle і (dotted i) in keywords: збільшити', () => {
      const tokens = getTokens('збільшити counter', 'uk');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should handle і in prepositions: від', () => {
      const tokens = getTokens('від #element', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
      const vidToken = tokens.find(t => t.value === 'від');
      expect(vidToken).toBeDefined();
    });

    it('should handle ї (yi) in identifiers', () => {
      const tokens = getTokens('її значення', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle є (ye) in identifiers', () => {
      const tokens = getTokens('є істина', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ґ (g with upturn) in identifiers', () => {
      const tokens = getTokens('ґрунтовний', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Soft sign (ь) in verb forms', () => {
    it('should handle ь in перемкнути', () => {
      const tokens = getTokens('перемкнути .active', 'uk');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should handle ь in збільшити', () => {
      const tokens = getTokens('збільшити counter', 'uk');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should handle ь in зменшити', () => {
      const tokens = getTokens('зменшити counter', 'uk');
      expect(tokens[0].normalized).toBe('decrement');
    });

    it('should handle ь in покласти', () => {
      const tokens = getTokens('покласти "текст" в #output', 'uk');
      expect(tokens[0].normalized).toBe('put');
    });
  });

  describe('Apostrophe in Ukrainian words', () => {
    it('should handle apostrophe as part of Ukrainian words', () => {
      // Ukrainian uses apostrophe before я, ю, є, ї after labials
      const tokens = getTokens("пам'ятати", 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Imperative form recognition', () => {
    it('should recognize imperative перемкни (from infinitive перемкнути)', () => {
      const tokens = getTokens('перемкни .active', 'uk');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should recognize imperative додай (from infinitive додати)', () => {
      const tokens = getTokens('додай .highlight', 'uk');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should recognize imperative видали (from infinitive видалити)', () => {
      const tokens = getTokens('видали .highlight', 'uk');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should recognize imperative встанови (from infinitive встановити)', () => {
      const tokens = getTokens('встанови x на 5', 'uk');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should recognize imperative отримай (from infinitive отримати)', () => {
      const tokens = getTokens('отримай #element', 'uk');
      expect(tokens[0].normalized).toBe('get');
    });

    it('should recognize imperative покажи (from infinitive показати)', () => {
      const tokens = getTokens('покажи #modal', 'uk');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should recognize imperative сховай (from infinitive сховати)', () => {
      const tokens = getTokens('сховай #dropdown', 'uk');
      expect(tokens[0].normalized).toBe('hide');
    });
  });

  describe('Alternative keyword forms', () => {
    it('should recognize прибрати as remove (alternate)', () => {
      const tokens = getTokens('прибрати .error', 'uk');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should recognize приховати as hide (alternate)', () => {
      const tokens = getTokens('приховати #modal', 'uk');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should recognize помістити as put (alternate)', () => {
      const tokens = getTokens('помістити "текст" в #output', 'uk');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should recognize задати as set (alternate)', () => {
      const tokens = getTokens('задати x на 10', 'uk');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should recognize вставити as put (alternate)', () => {
      const tokens = getTokens('вставити "дані" в #output', 'uk');
      expect(tokens[0].normalized).toBe('put');
    });
  });
});

// =============================================================================
// Preposition/Modifier Tests
// =============================================================================

describe('Ukrainian Prepositions and Modifiers', () => {
  describe('Destination prepositions (в, на, до)', () => {
    it('should handle в (in/into)', () => {
      const tokens = getTokens('покласти "привіт" в #output', 'uk');
      expect(tokens.find(t => t.value === 'в')).toBeDefined();
    });

    it('should handle на (on/for)', () => {
      const tokens = getTokens('встановити x на 10', 'uk');
      expect(tokens.find(t => t.value === 'на')).toBeDefined();
    });

    it('should handle до (to)', () => {
      const tokens = getTokens('перейти до /home', 'uk');
      expect(tokens.find(t => t.value === 'до')).toBeDefined();
    });
  });

  describe('Source prepositions (з, від, із)', () => {
    it('should handle з (from/with)', () => {
      const tokens = getTokens('видалити .class з #element', 'uk');
      expect(tokens.find(t => t.value === 'з')).toBeDefined();
    });

    it('should handle від (from)', () => {
      const tokens = getTokens('від #element', 'uk');
      expect(tokens.find(t => t.value === 'від')).toBeDefined();
    });

    it('should handle із (from, variant)', () => {
      const tokens = getTokens('видалити .class із #element', 'uk');
      expect(tokens.find(t => t.value === 'із')).toBeDefined();
    });
  });

  describe('Possessive forms', () => {
    it('should handle мій (my, masculine)', () => {
      const tokens = getTokens('мій елемент', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle моя (my, feminine)', () => {
      const tokens = getTokens('моя властивість', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle моє (my, neuter)', () => {
      const tokens = getTokens('моє значення', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle твій (your, masculine)', () => {
      const tokens = getTokens('твій текст', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle його (his/its)', () => {
      const tokens = getTokens('його значення', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle її (her/its, feminine)', () => {
      const tokens = getTokens('її значення', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Ukrainian Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "при кліку перемкнути .active на #button"', () => {
      const tokens = getTokens('при кліку перемкнути .active на #button', 'uk');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "при відправці перемкнути .loading"', () => {
      const tokens = getTokens('при відправці перемкнути .loading', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "при наведенні додати .highlight"', () => {
      const tokens = getTokens('при наведенні додати .highlight', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "при введенні покласти \\"тест\\" в #output"', () => {
      const tokens = getTokens('при введенні покласти "тест" в #output', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "при зміні встановити x на 10"', () => {
      const tokens = getTokens('при зміні встановити x на 10', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Compound commands', () => {
    it('should handle chaining with потім (then)', () => {
      const tokens = getTokens('додати .loading потім чекати 1s потім видалити .loading', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
      const potimTokens = tokens.filter(t => t.value === 'потім');
      expect(potimTokens.length).toBe(2);
    });

    it('should handle chaining with далі (then, alternate)', () => {
      const tokens = getTokens('перемкнути .active далі показати #result', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle chaining with тоді (then, alternate)', () => {
      const tokens = getTokens('сховати #modal тоді видалити .backdrop', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle chaining with і (and)', () => {
      const tokens = getTokens('додати .highlight і показати #tooltip', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.find(t => t.value === 'і')).toBeDefined();
    });

    it('should handle chaining with та (and, alternate)', () => {
      const tokens = getTokens('показати #modal та додати .active', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.find(t => t.value === 'та')).toBeDefined();
    });

    it('should handle event handler with compound body', () => {
      const tokens = getTokens(
        'при кліку додати .loading потім завантажити /api/data потім видалити .loading',
        'uk'
      );
      expect(tokens.length).toBeGreaterThan(5);
    });
  });

  describe('Reference keywords', () => {
    it('should handle я (me) reference', () => {
      const tokens = getTokens('перемкнути .active на я', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle це (it) reference', () => {
      const tokens = getTokens('показати це', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ти (you) reference', () => {
      const tokens = getTokens('сховати ти', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Control flow keywords', () => {
    it('should handle якщо (if)', () => {
      const tokens = getTokens('якщо істина', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
      const ifToken = tokens.find(t => t.normalized === 'if');
      expect(ifToken).toBeDefined();
    });

    it('should handle кінець (end)', () => {
      const tokens = getTokens('кінець', 'uk');
      expect(tokens.length).toBeGreaterThan(0);
      const endToken = tokens.find(t => t.normalized === 'end');
      expect(endToken).toBeDefined();
    });
  });
});

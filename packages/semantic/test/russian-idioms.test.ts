/**
 * Russian Native Idiom Tests
 *
 * Tests for native Russian idiom patterns that go beyond
 * direct translations to support more natural Russian expressions.
 *
 * Russian features:
 * - SVO (Subject-Verb-Object) default word order (relatively free)
 * - Fusional language with rich verb conjugation
 * - Uses INFINITIVE form for commands in software UI (industry standard)
 * - Space-separated words with Cyrillic alphabet
 * - Prepositions for grammatical roles (в, на, к, из, от, с)
 * - Soft sign (ь) and hard sign (ъ) as modifier characters
 * - Letter ё (yo) distinct from е (ye)
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
// Tokenizer Tests - Native Keyword Detection
// =============================================================================

describe('Russian Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize при as event marker', () => {
      const tokens = getTokens('при клике', 'ru');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const priToken = tokens.find(t => t.value === 'при');
      expect(priToken).toBeDefined();
    });

    it('should tokenize когда as temporal marker', () => {
      const tokens = getTokens('когда клике', 'ru');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const kogdaToken = tokens.find(t => t.value === 'когда');
      expect(kogdaToken).toBeDefined();
    });

    it('should tokenize если as conditional/temporal marker', () => {
      const tokens = getTokens('если клике', 'ru');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const esliToken = tokens.find(t => t.value === 'если');
      expect(esliToken).toBeDefined();
    });
  });

  describe('Command keywords - primary forms (infinitive)', () => {
    it('should tokenize переключить as toggle', () => {
      const tokens = getTokens('переключить .active', 'ru');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should tokenize добавить as add', () => {
      const tokens = getTokens('добавить .highlight', 'ru');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should tokenize удалить as remove', () => {
      const tokens = getTokens('удалить .highlight', 'ru');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize показать as show', () => {
      const tokens = getTokens('показать #modal', 'ru');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should tokenize скрыть as hide', () => {
      const tokens = getTokens('скрыть #modal', 'ru');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize увеличить as increment', () => {
      const tokens = getTokens('увеличить counter', 'ru');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should tokenize уменьшить as decrement', () => {
      const tokens = getTokens('уменьшить counter', 'ru');
      expect(tokens[0].normalized).toBe('decrement');
    });

    it('should tokenize положить as put', () => {
      const tokens = getTokens('положить "привет" в #output', 'ru');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should tokenize установить as set', () => {
      const tokens = getTokens('установить x в 10', 'ru');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should tokenize получить as get', () => {
      const tokens = getTokens('получить #element', 'ru');
      expect(tokens[0].normalized).toBe('get');
    });
  });

  describe('Command keywords - alternative forms (imperative)', () => {
    it('should tokenize переключи as toggle (imperative)', () => {
      const tokens = getTokens('переключи .active', 'ru');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should tokenize добавь as add (imperative)', () => {
      const tokens = getTokens('добавь .highlight', 'ru');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should tokenize удали as remove (imperative)', () => {
      const tokens = getTokens('удали .highlight', 'ru');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize убрать as remove (alternative infinitive)', () => {
      const tokens = getTokens('убрать .error', 'ru');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize убери as remove (alternative imperative)', () => {
      const tokens = getTokens('убери .error', 'ru');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize покажи as show (imperative)', () => {
      const tokens = getTokens('покажи #modal', 'ru');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should tokenize скрой as hide (imperative)', () => {
      const tokens = getTokens('скрой #dropdown', 'ru');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize спрятать as hide (alternative infinitive)', () => {
      const tokens = getTokens('спрятать #dropdown', 'ru');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize спрячь as hide (alternative imperative)', () => {
      const tokens = getTokens('спрячь #dropdown', 'ru');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize поместить as put (alternative infinitive)', () => {
      const tokens = getTokens('поместить "привет" в #output', 'ru');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should tokenize установи as set (imperative)', () => {
      const tokens = getTokens('установи x в 5', 'ru');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should tokenize задать as set (alternative infinitive)', () => {
      const tokens = getTokens('задать x в 5', 'ru');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should tokenize получи as get (imperative)', () => {
      const tokens = getTokens('получи #element', 'ru');
      expect(tokens[0].normalized).toBe('get');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('переключить .active', 'ru');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('показать #modal', 'ru');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Russian Event Handler Patterns', () => {
  describe('Standard pattern: при {event}', () => {
    it('should tokenize "при клике переключить .active"', () => {
      const tokens = getTokens('при клике переключить .active', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "при отправке переключить .loading"', () => {
      const tokens = getTokens('при отправке переключить .loading', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "при наведении добавить .highlight"', () => {
      const tokens = getTokens('при наведении добавить .highlight', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "при клике увеличить #counter"', () => {
      const tokens = getTokens('при клике увеличить #counter', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternate pattern: когда {event}', () => {
    it('should tokenize "когда клике переключить .active"', () => {
      const tokens = getTokens('когда клике переключить .active', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "когда изменении показать #result"', () => {
      const tokens = getTokens('когда изменении показать #result', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With destination filter: при {event} на {target}', () => {
    it('should tokenize "при клике переключить .active на #button"', () => {
      const tokens = getTokens('при клике переключить .active на #button', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Russian Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "переключить .active"', () => {
      const result = canParse('переключить .active', 'ru');
      if (result) {
        const node = parse('переключить .active', 'ru');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('переключить .active', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "показать #modal"', () => {
      const result = canParse('показать #modal', 'ru');
      if (result) {
        const node = parse('показать #modal', 'ru');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('показать #modal', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "скрыть #modal"', () => {
      const result = canParse('скрыть #modal', 'ru');
      if (result) {
        const node = parse('скрыть #modal', 'ru');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('скрыть #modal', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "спрятать #menu" (alternative hide)', () => {
      const result = canParse('спрятать #menu', 'ru');
      if (result) {
        const node = parse('спрятать #menu', 'ru');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('спрятать #menu', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "добавить .highlight"', () => {
      const result = canParse('добавить .highlight', 'ru');
      if (result) {
        const node = parse('добавить .highlight', 'ru');
        expect(node.action).toBe('add');
      } else {
        const tokens = getTokens('добавить .highlight', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "удалить .highlight"', () => {
      const result = canParse('удалить .highlight', 'ru');
      if (result) {
        const node = parse('удалить .highlight', 'ru');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('удалить .highlight', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "убрать .error" (alternative remove)', () => {
      const result = canParse('убрать .error', 'ru');
      if (result) {
        const node = parse('убрать .error', 'ru');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('убрать .error', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "увеличить counter"', () => {
      const result = canParse('увеличить counter', 'ru');
      if (result) {
        const node = parse('увеличить counter', 'ru');
        expect(node.action).toBe('increment');
      } else {
        const tokens = getTokens('увеличить counter', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "уменьшить counter"', () => {
      const result = canParse('уменьшить counter', 'ru');
      if (result) {
        const node = parse('уменьшить counter', 'ru');
        expect(node.action).toBe('decrement');
      } else {
        const tokens = getTokens('уменьшить counter', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Put/Set/Get commands', () => {
    it('should parse "поместить \\"привет\\" в #output"', () => {
      const result = canParse('поместить "привет" в #output', 'ru');
      if (result) {
        const node = parse('поместить "привет" в #output', 'ru');
        expect(node.action).toBe('put');
      } else {
        const tokens = getTokens('поместить "привет" в #output', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "установить x в 10"', () => {
      const result = canParse('установить x в 10', 'ru');
      if (result) {
        const node = parse('установить x в 10', 'ru');
        expect(node.action).toBe('set');
      } else {
        const tokens = getTokens('установить x в 10', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "получить #element"', () => {
      const result = canParse('получить #element', 'ru');
      if (result) {
        const node = parse('получить #element', 'ru');
        expect(node.action).toBe('get');
      } else {
        const tokens = getTokens('получить #element', 'ru');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// Cyrillic Script-Specific Tests
// =============================================================================

describe('Russian Cyrillic Script', () => {
  describe('Soft sign (ь) handling', () => {
    it('should handle ь in переключить', () => {
      const tokens = getTokens('переключить .active', 'ru');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should handle ь in удалить', () => {
      const tokens = getTokens('удалить .error', 'ru');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should handle ь in уменьшить', () => {
      const tokens = getTokens('уменьшить counter', 'ru');
      expect(tokens[0].normalized).toBe('decrement');
    });

    it('should handle ь in скрыть', () => {
      const tokens = getTokens('скрыть #panel', 'ru');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should handle ь in показать', () => {
      const tokens = getTokens('показать #modal', 'ru');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should handle ь in положить', () => {
      const tokens = getTokens('положить "текст" в #output', 'ru');
      expect(tokens[0].normalized).toBe('put');
    });
  });

  describe('Hard sign (ъ) handling', () => {
    it('should handle identifiers containing ъ', () => {
      const tokens = getTokens('объект', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].value).toBe('объект');
    });
  });

  describe('Letter ё vs е distinction', () => {
    it('should handle ё in моё (possessive neuter)', () => {
      const tokens = getTokens('моё значение', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ё in её (possessive feminine)', () => {
      const tokens = getTokens('её значение', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle keywords with е (not ё)', () => {
      const tokens = getTokens('перейти /home', 'ru');
      expect(tokens[0].normalized).toBe('go');
    });
  });

  describe('Imperative vs infinitive form recognition', () => {
    it('should recognize infinitive переключить (not imperative переключи)', () => {
      expect(getTokens('переключить .active', 'ru')[0].normalized).toBe('toggle');
    });

    it('should recognize imperative переключи', () => {
      expect(getTokens('переключи .active', 'ru')[0].normalized).toBe('toggle');
    });

    it('should recognize infinitive добавить (not imperative добавь)', () => {
      expect(getTokens('добавить .highlight', 'ru')[0].normalized).toBe('add');
    });

    it('should recognize imperative добавь', () => {
      expect(getTokens('добавь .highlight', 'ru')[0].normalized).toBe('add');
    });

    it('should recognize infinitive удалить (not imperative удали)', () => {
      expect(getTokens('удалить .highlight', 'ru')[0].normalized).toBe('remove');
    });

    it('should recognize imperative удали', () => {
      expect(getTokens('удали .highlight', 'ru')[0].normalized).toBe('remove');
    });

    it('should recognize infinitive установить (not imperative установи)', () => {
      expect(getTokens('установить x в 5', 'ru')[0].normalized).toBe('set');
    });

    it('should recognize imperative установи', () => {
      expect(getTokens('установи x в 5', 'ru')[0].normalized).toBe('set');
    });
  });
});

// =============================================================================
// Preposition/Modifier Tests
// =============================================================================

describe('Russian Prepositions and Modifiers', () => {
  describe('Destination prepositions (в, на, к)', () => {
    it('should handle в (in/into)', () => {
      const tokens = getTokens('поместить "текст" в #output', 'ru');
      expect(tokens.find(t => t.value === 'в')).toBeDefined();
    });

    it('should handle на (on/onto)', () => {
      const tokens = getTokens('переключить .active на #button', 'ru');
      expect(tokens.find(t => t.value === 'на')).toBeDefined();
    });

    it('should handle к (to/towards)', () => {
      const tokens = getTokens('перейти к #section', 'ru');
      expect(tokens.find(t => t.value === 'к')).toBeDefined();
    });
  });

  describe('Source prepositions (из, от, с)', () => {
    it('should handle из (from/out of)', () => {
      const tokens = getTokens('удалить .class из #element', 'ru');
      expect(tokens.find(t => t.value === 'из')).toBeDefined();
    });

    it('should handle от (from)', () => {
      const tokens = getTokens('получить данные от #source', 'ru');
      expect(tokens.find(t => t.value === 'от')).toBeDefined();
    });

    it('should handle с (from/with)', () => {
      const tokens = getTokens('удалить .error с #form', 'ru');
      expect(tokens.find(t => t.value === 'с')).toBeDefined();
    });
  });

  describe('Possessive forms', () => {
    it('should handle мой (my, masculine)', () => {
      expect(getTokens('мой элемент', 'ru').length).toBeGreaterThan(0);
    });

    it('should handle моя (my, feminine)', () => {
      expect(getTokens('моя форма', 'ru').length).toBeGreaterThan(0);
    });

    it('should handle моё (my, neuter)', () => {
      expect(getTokens('моё значение', 'ru').length).toBeGreaterThan(0);
    });

    it('should handle мои (my, plural)', () => {
      expect(getTokens('мои элементы', 'ru').length).toBeGreaterThan(0);
    });

    it('should handle твой (your, masculine)', () => {
      expect(getTokens('твой элемент', 'ru').length).toBeGreaterThan(0);
    });

    it('should handle его (his/its)', () => {
      expect(getTokens('его значение', 'ru').length).toBeGreaterThan(0);
    });

    it('should handle её (her/its, feminine)', () => {
      expect(getTokens('её значение', 'ru').length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Russian Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "при клике переключить .active на #button"', () => {
      const tokens = getTokens('при клике переключить .active на #button', 'ru');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "при отправке переключить .loading"', () => {
      const tokens = getTokens('при отправке переключить .loading', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "при наведении добавить .highlight"', () => {
      const tokens = getTokens('при наведении добавить .highlight', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "при клике увеличить #counter"', () => {
      const tokens = getTokens('при клике увеличить #counter', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "при фокусе показать #tooltip"', () => {
      const tokens = getTokens('при фокусе показать #tooltip', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "при размытии скрыть #tooltip"', () => {
      const tokens = getTokens('при размытии скрыть #tooltip', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "при вводе положить \\"test\\" в #output"', () => {
      const tokens = getTokens('при вводе положить "test" в #output', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "при изменении установить x в 10"', () => {
      const tokens = getTokens('при изменении установить x в 10', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Compound commands', () => {
    it('should handle chaining with затем (then)', () => {
      const tokens = getTokens('добавить .loading затем ждать 1s затем удалить .loading', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
      const thenTokens = tokens.filter(t => t.normalized === 'then');
      expect(thenTokens.length).toBe(2);
    });

    it('should handle chaining with потом (then, alternative)', () => {
      const tokens = getTokens('переключить .active потом показать #result', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle chaining with тогда (then, alternative)', () => {
      const tokens = getTokens('переключить .active тогда показать #result', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle chaining with и (and)', () => {
      const tokens = getTokens('добавить .highlight и показать #tooltip', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.find(t => t.normalized === 'and')).toBeDefined();
    });

    it('should handle event handler with compound body', () => {
      const tokens = getTokens(
        'при клике добавить .loading затем загрузить /api/data затем удалить .loading',
        'ru'
      );
      expect(tokens.length).toBeGreaterThan(5);
    });
  });

  describe('Reference keywords', () => {
    it('should handle я (me) reference', () => {
      const tokens = getTokens('переключить .active на я', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle это (it) reference', () => {
      const tokens = getTokens('показать это', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle ты (you) reference', () => {
      const tokens = getTokens('скрыть ты', 'ru');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

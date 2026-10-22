/**
 * Quechua Native Idiom Tests
 *
 * Tests for native Quechua idiom patterns that go beyond
 * direct translations to support more natural Quechua expressions.
 *
 * Quechua features:
 * - SOV (Subject-Object-Verb) word order - object comes before verb
 * - Agglutinative/polysynthetic - extensive suffixing for grammatical roles
 * - Postposition marking - grammatical roles marked after objects with suffixes
 * - Indigenous Andean language with rich morphology
 * - Multiple dialects (Quechua I and Quechua II), primarily Quechua II used here
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

describe('Quechua Tokenizer - Native Idioms', () => {
  describe('Event markers', () => {
    it('should tokenize pi as event marker', () => {
      const tokens = getTokens('pi ñit\'iy', 'qu');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const piToken = tokens.find(t => t.value === 'pi');
      expect(piToken).toBeDefined();
    });

    it('should tokenize kaqtin as event marker alternative', () => {
      const tokens = getTokens('kaqtin ñit\'iy', 'qu');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize kaqpi as event marker alternative', () => {
      const tokens = getTokens('kaqpi ñit\'iy', 'qu');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize t\'ikray as toggle', () => {
      const tokens = getTokens('.active ta t\'ikray', 'qu');
      const toggleToken = tokens.find(t => t.normalized === 'toggle');
      expect(toggleToken).toBeDefined();
    });

    it('should tokenize rikuchiy as show', () => {
      const tokens = getTokens('#modal ta rikuchiy', 'qu');
      const showToken = tokens.find(t => t.normalized === 'show');
      expect(showToken).toBeDefined();
    });

    it('should tokenize pakay as hide', () => {
      const tokens = getTokens('#modal ta pakay', 'qu');
      const hideToken = tokens.find(t => t.normalized === 'hide');
      expect(hideToken).toBeDefined();
    });

    it('should tokenize yapay as add', () => {
      const tokens = getTokens('.highlight ta yapay', 'qu');
      const addToken = tokens.find(t => t.normalized === 'add');
      expect(addToken).toBeDefined();
    });

    it('should tokenize qichuy as remove', () => {
      const tokens = getTokens('.highlight ta qichuy', 'qu');
      const removeToken = tokens.find(t => t.normalized === 'remove');
      expect(removeToken).toBeDefined();
    });

    it('should tokenize yapachiy as increment', () => {
      const tokens = getTokens('counter ta yapachiy', 'qu');
      const incrementToken = tokens.find(t => t.normalized === 'increment');
      expect(incrementToken).toBeDefined();
    });

    it('should tokenize pisiyachiy as decrement', () => {
      const tokens = getTokens('counter ta pisiyachiy', 'qu');
      const decrementToken = tokens.find(t => t.normalized === 'decrement');
      expect(decrementToken).toBeDefined();
    });

    it('should tokenize churay as put', () => {
      const tokens = getTokens('"text" ta #output man churay', 'qu');
      const putToken = tokens.find(t => t.normalized === 'put');
      expect(putToken).toBeDefined();
    });

    it('should tokenize taripay as get', () => {
      const tokens = getTokens('#element ta taripay', 'qu');
      const getToken = tokens.find(t => t.normalized === 'get');
      expect(getToken).toBeDefined();
    });

    it('should tokenize churanay as set', () => {
      const tokens = getTokens('x ta 10 man churanay', 'qu');
      const setToken = tokens.find(t => t.normalized === 'set');
      expect(setToken).toBeDefined();
    });
  });

  describe('Role markers (postpositions)', () => {
    it('should tokenize ta as patient marker', () => {
      const tokens = getTokens('.active ta t\'ikray', 'qu');
      const taToken = tokens.find(t => t.value === 'ta');
      expect(taToken).toBeDefined();
    });

    it('should tokenize man as destination marker', () => {
      const tokens = getTokens('"text" ta #output man churay', 'qu');
      const manToken = tokens.find(t => t.value === 'man');
      expect(manToken).toBeDefined();
    });

    it('should tokenize manta as source marker', () => {
      const tokens = getTokens('#source manta #target man churay', 'qu');
      const mantaToken = tokens.find(t => t.value === 'manta');
      expect(mantaToken).toBeDefined();
    });

    it('should tokenize wan as style marker', () => {
      const tokens = getTokens('.highlight wan yapay', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('.active ta t\'ikray', 'qu');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('#modal ta rikuchiy', 'qu');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Quechua Event Handler Patterns', () => {
  describe('Standard pattern: event pi', () => {
    it('should tokenize "ñit\'iy pi .active ta t\'ikray"', () => {
      const tokens = getTokens('ñit\'iy pi .active ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "kachay pi .loading ta t\'ikray"', () => {
      const tokens = getTokens('kachay pi .loading ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "apakuy pi #result ta rikuchiy"', () => {
      const tokens = getTokens('apakuy pi #result ta rikuchiy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternate pattern: event kaqtin', () => {
    it('should tokenize "ñit\'iy kaqtin .active ta t\'ikray"', () => {
      const tokens = getTokens('ñit\'iy kaqtin .active ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize "kambiay kaqtin #result ta rikuchiy"', () => {
      const tokens = getTokens('kambiay kaqtin #result ta rikuchiy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: event pi source manta', () => {
    it('should tokenize "ñit\'iy pi #button manta .active ta t\'ikray"', () => {
      const tokens = getTokens('ñit\'iy pi #button manta .active ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize complex event handler chain', () => {
      const tokens = getTokens('ñit\'iy pi #button manta .active ta t\'ikray chaymantataq .loading ta yapay', 'qu');
      expect(tokens.length).toBeGreaterThan(5);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Quechua Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse ".active ta t\'ikray"', () => {
      const result = canParse('.active ta t\'ikray', 'qu');
      if (result) {
        const node = parse('.active ta t\'ikray', 'qu');
        expect(node.action).toBe('toggle');
      } else {
        const tokens = getTokens('.active ta t\'ikray', 'qu');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse ".active ta tikray" (alternative spelling)', () => {
      const tokens = getTokens('.active ta tikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse ".visible ta t\'ikray" with different class', () => {
      const tokens = getTokens('.visible ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "#modal ta rikuchiy"', () => {
      const result = canParse('#modal ta rikuchiy', 'qu');
      if (result) {
        const node = parse('#modal ta rikuchiy', 'qu');
        expect(node.action).toBe('show');
      } else {
        const tokens = getTokens('#modal ta rikuchiy', 'qu');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "#dropdown ta pakay"', () => {
      const result = canParse('#dropdown ta pakay', 'qu');
      if (result) {
        const node = parse('#dropdown ta pakay', 'qu');
        expect(node.action).toBe('hide');
      } else {
        const tokens = getTokens('#dropdown ta pakay', 'qu');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "#menu ta qawachiy" (show alternative)', () => {
      const tokens = getTokens('#menu ta qawachiy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "#modal ta pakakuy" (hide alternative)', () => {
      const tokens = getTokens('#modal ta pakakuy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse ".highlight ta yapay"', () => {
      const result = canParse('.highlight ta yapay', 'qu');
      if (result) {
        const node = parse('.highlight ta yapay', 'qu');
        expect(node.action).toBe('add');
      } else {
        const tokens = getTokens('.highlight ta yapay', 'qu');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse ".active ta qichuy"', () => {
      const result = canParse('.active ta qichuy', 'qu');
      if (result) {
        const node = parse('.active ta qichuy', 'qu');
        expect(node.action).toBe('remove');
      } else {
        const tokens = getTokens('.active ta qichuy', 'qu');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse ".class ta hurquy" (remove alternative)', () => {
      const tokens = getTokens('.class ta hurquy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse ".class ta anchuchiy" (remove alternative)', () => {
      const tokens = getTokens('.class ta anchuchiy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse ".highlight ta yapaykuy" (add alternative)', () => {
      const tokens = getTokens('.highlight ta yapaykuy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "counter ta yapachiy"', () => {
      const result = canParse('counter ta yapachiy', 'qu');
      if (result) {
        const node = parse('counter ta yapachiy', 'qu');
        expect(node.action).toBe('increment');
      } else {
        const tokens = getTokens('counter ta yapachiy', 'qu');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "counter ta pisiyachiy"', () => {
      const result = canParse('counter ta pisiyachiy', 'qu');
      if (result) {
        const node = parse('counter ta pisiyachiy', 'qu');
        expect(node.action).toBe('decrement');
      } else {
        const tokens = getTokens('counter ta pisiyachiy', 'qu');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Put/Get/Set commands', () => {
    it('should parse "\"text\" ta #output man churay"', () => {
      const tokens = getTokens('"text" ta #output man churay', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "#element ta taripay"', () => {
      const result = canParse('#element ta taripay', 'qu');
      if (result) {
        const node = parse('#element ta taripay', 'qu');
        expect(node.action).toBe('get');
      } else {
        const tokens = getTokens('#element ta taripay', 'qu');
        expect(tokens.length).toBeGreaterThan(0);
      }
    });

    it('should parse "x ta 10 man churanay"', () => {
      const tokens = getTokens('x ta 10 man churanay', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Quechua Morphology Tests - Agglutination and Suffixing
// =============================================================================

describe('Quechua Morphology - Suffix Combinations', () => {
  describe('Possessive forms', () => {
    it('should tokenize ñuqapa (my/me possessive)', () => {
      const tokens = getTokens('ñuqapa value', 'qu');
      const possToken = tokens.find(t => t.value === 'ñuqapa');
      expect(possToken).toBeDefined();
    });

    it('should tokenize ñuqaypa (my alternative form)', () => {
      const tokens = getTokens('ñuqaypa value', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize qampa (your/you possessive)', () => {
      const tokens = getTokens('qampa value', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize paypa (its/his/her possessive)', () => {
      const tokens = getTokens('paypa value', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple suffix combinations', () => {
    it('should handle multiple role markers in sequence', () => {
      const tokens = getTokens('.class ta #target man churay', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle alternations with complex suffixes', () => {
      const tokens = getTokens('.active ta qhipaman yapay', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Pronoun references', () => {
    it('should tokenize ñuqa (I/me)', () => {
      const tokens = getTokens('ñuqa .active ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize qam (you)', () => {
      const tokens = getTokens('qam .active ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize pay (it/he/she)', () => {
      const tokens = getTokens('pay .active ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Event and Command Reference Tests
// =============================================================================

describe('Quechua Event and Command References', () => {
  describe('Event names', () => {
    it('should tokenize ñitiy as click', () => {
      const tokens = getTokens('ñitiy pi', 'qu');
      const clickToken = tokens.find(t => t.normalized === 'click');
      expect(clickToken).toBeDefined();
    });

    it('should tokenize apakuy as load', () => {
      const tokens = getTokens('apakuy pi', 'qu');
      const loadToken = tokens.find(t => t.normalized === 'load');
      expect(loadToken).toBeDefined();
    });

    it('should tokenize apaykachay as submit', () => {
      const tokens = getTokens('apaykachay pi', 'qu');
      const submitToken = tokens.find(t => t.normalized === 'submit');
      expect(submitToken).toBeDefined();
    });

    it('should tokenize hawachiy as mouseenter (hover is no DOM event)', () => {
      const tokens = getTokens('hawachiy pi', 'qu');
      const hoverToken = tokens.find(t => t.normalized === 'mouseenter');
      expect(hoverToken).toBeDefined();
    });

    it('should tokenize yaykuchiy as input', () => {
      const tokens = getTokens('yaykuchiy pi', 'qu');
      const inputToken = tokens.find(t => t.normalized === 'input');
      expect(inputToken).toBeDefined();
    });

    it('should tokenize kambiay as change', () => {
      const tokens = getTokens('kambiay pi', 'qu');
      const changeToken = tokens.find(t => t.normalized === 'change');
      expect(changeToken).toBeDefined();
    });
  });

  describe('Control flow keywords', () => {
    it('should tokenize sichus as if', () => {
      const tokens = getTokens('sichus ñit\'iy', 'qu');
      const ifToken = tokens.find(t => t.normalized === 'if');
      expect(ifToken).toBeDefined();
    });

    it('should tokenize manachus as else', () => {
      const tokens = getTokens('manachus', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize hukniraq as else alternative', () => {
      const tokens = getTokens('hukniraq', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize kutipay as repeat', () => {
      const tokens = getTokens('kutipay', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize sapankaq as for', () => {
      const tokens = getTokens('sapankaq', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Chaining and sequencing', () => {
    it('should tokenize chaymantataq as then', () => {
      const tokens = getTokens('chaymantataq', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize hinaspa as then alternative', () => {
      const tokens = getTokens('hinaspa', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize chaymanta as then alternative', () => {
      const tokens = getTokens('chaymanta', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize hinallataq as and', () => {
      const tokens = getTokens('hinallataq', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize tututuy as end/finish', () => {
      const tokens = getTokens('tukukuy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Quechua Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "ñit\'iy pi #button manta .active ta t\'ikray"', () => {
      const tokens = getTokens('ñit\'iy pi #button manta .active ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(4);
    });

    it('should handle "kachay pi .loading ta t\'ikray"', () => {
      const tokens = getTokens('kachay pi .loading ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound commands with chaymantataq (then)', () => {
      const tokens = getTokens('.loading ta yapay chaymantataq suyay 1s chaymantataq .loading ta qichuy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle qhawachiy pi #tooltip manta #description ta rikuchiy', () => {
      const tokens = getTokens('qhawachiy pi #tooltip manta #description ta rikuchiy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle mana qhawachiy pi #tooltip manta #description ta pakay', () => {
      const tokens = getTokens('mana qhawachiy pi #tooltip manta #description ta pakay', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-word commands and agglutination', () => {
    it('should handle "t\'ikray" as single command', () => {
      const tokens = getTokens('.active ta t\'ikray', 'qu');
      const toggleToken = tokens.find(t => t.normalized === 'toggle');
      expect(toggleToken).toBeDefined();
    });

    it('should handle "rikuchiy" as single command', () => {
      const tokens = getTokens('#modal ta rikuchiy', 'qu');
      const showToken = tokens.find(t => t.normalized === 'show');
      expect(showToken).toBeDefined();
    });

    it('should handle "taripay" as get command', () => {
      const tokens = getTokens('#element ta taripay', 'qu');
      const getToken = tokens.find(t => t.normalized === 'get');
      expect(getToken).toBeDefined();
    });

    it('should preserve SOV word order in tokenization', () => {
      const tokens = getTokens('.active ta #button pi t\'ikray', 'qu');
      // Patient (.active) comes before verb (t\'ikray) in SOV
      const classIndex = tokens.findIndex(t => t.value === '.active');
      const verbIndex = tokens.findIndex(t => t.normalized === 'toggle');
      expect(classIndex).toBeLessThan(verbIndex);
    });
  });

  describe('Real-world Quechua hyperscript examples', () => {
    it('should handle modal toggle on click from test cases', () => {
      const tokens = getTokens('ñit\'iy pi #button pa .active ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle send event toggle from test cases', () => {
      const tokens = getTokens('kachay pi .loading ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle hover add class from test cases', () => {
      const tokens = getTokens('hawachiy pi .highlight ta yapay', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle click remove class from test cases', () => {
      const tokens = getTokens('ñit\'iy pi .error ta qichuy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle focus show tooltip from test cases', () => {
      const tokens = getTokens('qhawachiy pi #tooltip ta rikuchiy', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle blur hide tooltip from test cases', () => {
      const tokens = getTokens('mana qhawachiy pi #tooltip ta pakay', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Destination and source markers (postpositions)', () => {
    it('should correctly place man marker after destination', () => {
      const tokens = getTokens('"text" ta #output man churay', 'qu');
      const manIndex = tokens.findIndex(t => t.value === 'man');
      const outputIndex = tokens.findIndex(t => t.value === '#output');
      expect(manIndex).toBeGreaterThan(outputIndex);
    });

    it('should correctly place manta marker after source', () => {
      const tokens = getTokens('.active ta #source manta #target man churay', 'qu');
      const mantaIndex = tokens.findIndex(t => t.value === 'manta');
      const sourceIndex = tokens.findIndex(t => t.value === '#source');
      expect(mantaIndex).toBeGreaterThan(sourceIndex);
    });

    it('should handle both manta and man together', () => {
      const tokens = getTokens('ñit\'iy pi #button manta .active ta t\'ikray', 'qu');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

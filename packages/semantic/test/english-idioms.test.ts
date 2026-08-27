/**
 * English Native Idiom Tests
 *
 * Tests for developer-friendly English idiom patterns that make hyperscript
 * easier for beginners to write. Unlike other language idioms which handle
 * grammatical differences, English idioms focus on:
 *
 * - Alternative event handler syntax (when, if, upon)
 * - Command synonyms (flip, switch, increase, decrease)
 * - Natural articles (the, class)
 * - Temporal expressions (in 2s, after 2s)
 * - British spelling aliases (colour, grey)
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse, tokenize } from '../src';

/**
 * Helper to get tokens array from TokenStream
 */
function getTokens(input: string, language: string = 'en') {
  const stream = tokenize(input, language);
  return stream.tokens;
}

// =============================================================================
// Event Handler Alternatives
// =============================================================================

describe('English Event Handler Idioms', () => {
  describe('"when" is NOT an event-handler head', () => {
    // In _hyperscript (0.9.93 verified) `when` is never a handler opener: it is
    // the reactive observer (`when <expr> changes … end`) and the trailing
    // command guard (`show .x when <cond>`). `when click toggle .active` fails on
    // the real engine ("Cannot watch local variable 'click'"). The `when
    // {event}` idiom this block used to pin was an invention — and the thing
    // that silently claimed every reactive head and truncated it to `on <first
    // token>` in the English reference. The semantic parser now rejects it too.
    it.each([
      'when clicked toggle .active',
      'when click toggle .active',
      'when clicked from #button toggle .active',
    ])('rejects %s like the engine does', source => {
      expect(canParse(source, 'en')).toBe(false);
      expect(() => parse(source, 'en')).toThrow();
    });

    it('still parses the reactive observer', () => {
      const result = parse('when $count changes put "x" into me end', 'en');
      expect(result?.action).toBe('when');
    });
  });

  describe('"if" event handler', () => {
    it('should parse "if clicked toggle .active"', () => {
      const result = parse('if clicked toggle .active', 'en');
      expect(result).not.toBeNull();
      // Note: "if" might be parsed as conditional or event handler
      // depending on context
    });

    it('should report canParse for "if clicked"', () => {
      expect(canParse('if clicked toggle .active', 'en')).toBe(true);
    });
  });

  describe('"upon" event handler', () => {
    it('should parse "upon clicking toggle .active"', () => {
      const result = parse('upon clicking toggle .active', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('on');
    });

    it('should parse "upon click toggle .active" (base form)', () => {
      const result = parse('upon click toggle .active', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('on');
    });

    it('should report canParse for "upon clicking"', () => {
      expect(canParse('upon clicking toggle .active', 'en')).toBe(true);
    });
  });
});

// =============================================================================
// Command Synonyms
// =============================================================================

describe('English Command Synonyms', () => {
  describe('toggle synonyms', () => {
    it('should normalize "flip" to "toggle" in tokenizer', () => {
      const tokens = getTokens('flip .active');
      const flipToken = tokens.find(t => t.value.toLowerCase() === 'flip');
      expect(flipToken).toBeDefined();
      expect(flipToken?.normalized).toBe('toggle');
    });

    it('should normalize "switch" to "toggle" in tokenizer', () => {
      const tokens = getTokens('switch .active');
      const switchToken = tokens.find(t => t.value.toLowerCase() === 'switch');
      expect(switchToken).toBeDefined();
      expect(switchToken?.normalized).toBe('toggle');
    });

    it('should parse "flip .active" as toggle command', () => {
      const result = parse('flip .active', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });

    it('should parse "switch .active on #button"', () => {
      const result = parse('switch .active on #button', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });

  describe('increment/decrement synonyms', () => {
    it('should normalize "increase" to "increment" in tokenizer', () => {
      const tokens = getTokens('increase #count');
      const increaseToken = tokens.find(t => t.value.toLowerCase() === 'increase');
      expect(increaseToken).toBeDefined();
      expect(increaseToken?.normalized).toBe('increment');
    });

    it('should normalize "decrease" to "decrement" in tokenizer', () => {
      const tokens = getTokens('decrease #count');
      const decreaseToken = tokens.find(t => t.value.toLowerCase() === 'decrease');
      expect(decreaseToken).toBeDefined();
      expect(decreaseToken?.normalized).toBe('decrement');
    });

    it('should parse "increase #counter" as increment command', () => {
      const result = parse('increase #counter', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('increment');
    });

    it('should parse "decrease #counter" as decrement command', () => {
      const result = parse('decrease #counter', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('decrement');
    });
  });

  describe('show/hide synonyms', () => {
    it('should normalize "display" to "show" in tokenizer', () => {
      const tokens = getTokens('display #tooltip');
      const displayToken = tokens.find(t => t.value.toLowerCase() === 'display');
      expect(displayToken).toBeDefined();
      expect(displayToken?.normalized).toBe('show');
    });

    it('should normalize "reveal" to "show" in tokenizer', () => {
      const tokens = getTokens('reveal #tooltip');
      const revealToken = tokens.find(t => t.value.toLowerCase() === 'reveal');
      expect(revealToken).toBeDefined();
      expect(revealToken?.normalized).toBe('show');
    });

    it('should normalize "conceal" to "hide" in tokenizer', () => {
      const tokens = getTokens('conceal #tooltip');
      const concealToken = tokens.find(t => t.value.toLowerCase() === 'conceal');
      expect(concealToken).toBeDefined();
      expect(concealToken?.normalized).toBe('hide');
    });

    it('should parse "display #tooltip" as show command', () => {
      const result = parse('display #tooltip', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('show');
    });

    it('should parse "conceal #tooltip" as hide command', () => {
      const result = parse('conceal #tooltip', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('hide');
    });
  });
});

// =============================================================================
// Natural Articles
// =============================================================================

describe('English Natural Articles', () => {
  describe('"the" before selectors', () => {
    it('should parse "toggle the .active"', () => {
      const result = parse('toggle the .active', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
      const patient = result?.roles.get('patient');
      expect(patient).toBeDefined();
    });

    it('should parse "show the #tooltip"', () => {
      const result = parse('show the #tooltip', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('show');
    });

    it('should parse "hide the #modal"', () => {
      const result = parse('hide the #modal', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('hide');
    });

    it('should parse "add the .visible to #element"', () => {
      const result = parse('add the .visible to #element', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('add');
    });
  });

  describe('"the" before identifiers', () => {
    it('should parse "set the color to red"', () => {
      const result = parse('set the color to red', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('set');
      const dest = result?.roles.get('destination');
      expect(dest?.type).toBe('expression');
      expect(dest && 'raw' in dest ? dest.raw : undefined).toBe('color');
    });

    it('should parse "put the text into #output"', () => {
      const result = parse('put the text into #output', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('put');
    });
  });

  describe('"class" after class selectors', () => {
    it('should parse "add the .visible class"', () => {
      const result = parse('add the .visible class', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('add');
    });

    it('should parse "remove the .hidden class"', () => {
      const result = parse('remove the .hidden class', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('remove');
    });

    it('should parse "toggle the .active class on #button"', () => {
      const result = parse('toggle the .active class on #button', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
    });
  });
});

// =============================================================================
// Mixed-Script Parsing (translation round-trip)
// =============================================================================

describe('Mixed-script parsing (translation round-trip)', () => {
  it('should parse Arabic with ASCII identifiers', () => {
    const result = parse('اضبط color إلى red', 'ar');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('set');
  });

  it('should parse Chinese with ASCII identifiers', () => {
    const result = parse('设置 color 为 red', 'zh');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('set');
  });
});

// =============================================================================
// Temporal Expressions
// =============================================================================

describe('English Temporal Expressions', () => {
  describe('"in {duration}" syntax', () => {
    it('should parse "in 2s" as wait command', () => {
      const result = parse('in 2s', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('wait');
      const duration = result?.roles.get('duration');
      expect(duration).toBeDefined();
    });

    it('should tokenize "in 2s hide #tooltip" correctly', () => {
      const tokens = getTokens('in 2s hide #tooltip');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].value).toBe('in');
    });

    it('should parse duration from "in 500ms"', () => {
      const result = parse('in 500ms', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('wait');
    });
  });

  describe('"after {duration}" syntax', () => {
    it('should parse "after 2s" as wait command', () => {
      const result = parse('after 2s', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('wait');
    });

    it('should tokenize "after 1s show #message" correctly', () => {
      const tokens = getTokens('after 1s show #message');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].value).toBe('after');
    });
  });
});

// =============================================================================
// British Spelling Aliases
// =============================================================================

describe('English British Spelling Aliases', () => {
  describe('colour/color', () => {
    it('should normalize "colour" to "color" in tokenizer', () => {
      const tokens = getTokens('set colour to red');
      const colourToken = tokens.find(t => t.value.toLowerCase() === 'colour');
      expect(colourToken).toBeDefined();
      expect(colourToken?.normalized).toBe('color');
    });
  });

  describe('grey/gray', () => {
    it('should normalize "grey" to "gray" in tokenizer', () => {
      const tokens = getTokens('set color to grey');
      const greyToken = tokens.find(t => t.value.toLowerCase() === 'grey');
      expect(greyToken).toBeDefined();
      expect(greyToken?.normalized).toBe('gray');
    });
  });

  describe('centre/center', () => {
    it('should normalize "centre" to "center" in tokenizer', () => {
      const tokens = getTokens('set alignment to centre');
      const centreToken = tokens.find(t => t.value.toLowerCase() === 'centre');
      expect(centreToken).toBeDefined();
      expect(centreToken?.normalized).toBe('center');
    });
  });

  describe('behaviour/behavior', () => {
    it('should normalize "behaviour" to "behavior" in tokenizer', () => {
      const tokens = getTokens('behaviour Draggable');
      const behaviourToken = tokens.find(t => t.value.toLowerCase() === 'behaviour');
      expect(behaviourToken).toBeDefined();
      expect(behaviourToken?.normalized).toBe('behavior');
    });
  });

  describe('initialise/initialize', () => {
    it('should normalize "initialise" to "initialize" in tokenizer', () => {
      const tokens = getTokens('call initialise');
      const initialiseToken = tokens.find(t => t.value.toLowerCase() === 'initialise');
      expect(initialiseToken).toBeDefined();
      expect(initialiseToken?.normalized).toBe('initialize');
    });
  });
});

// =============================================================================
// Combined Idioms
// =============================================================================

describe('English Combined Idioms', () => {
  it('should parse "on click flip the .active class"', () => {
    // `when clicked` was the invented handler head — see the "when" block above.
    const result = parse('on click flip the .active class', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('on');
  });

  it('should parse "on click increase #counter"', () => {
    const result = parse('on click increase #counter', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('on');
  });

  it('should parse "upon clicking display the #tooltip"', () => {
    const result = parse('upon clicking display the #tooltip', 'en');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('on');
  });
});

// =============================================================================
// Natural Class Syntax (without dot prefix)
// =============================================================================

describe('English Natural Class Syntax', () => {
  describe('identifier + "class" → class selector', () => {
    it('should tokenize "active class" as ".active" selector', () => {
      const tokens = getTokens('toggle the active class');
      const activeToken = tokens.find(t => t.value === '.active');
      expect(activeToken).toBeDefined();
      expect(activeToken?.kind).toBe('selector');
    });

    it('should tokenize "visible class" as ".visible" selector', () => {
      const tokens = getTokens('add the visible class');
      const visibleToken = tokens.find(t => t.value === '.visible');
      expect(visibleToken).toBeDefined();
      expect(visibleToken?.kind).toBe('selector');
    });

    it('should parse "toggle the active class" correctly', () => {
      const result = parse('toggle the active class', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('toggle');
      const patient = result?.roles.get('patient');
      expect(patient?.type).toBe('selector');
      expect(patient?.value).toBe('.active');
    });

    it('should parse "add the visible class" correctly', () => {
      const result = parse('add the visible class', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('add');
      const patient = result?.roles.get('patient');
      expect(patient?.type).toBe('selector');
      expect(patient?.value).toBe('.visible');
    });

    it('should parse "remove the hidden class" correctly', () => {
      const result = parse('remove the hidden class', 'en');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('remove');
    });

    it('should NOT convert "className" (no space before class)', () => {
      const tokens = getTokens('set className to foo');
      const classNameToken = tokens.find(t => t.value === 'className');
      expect(classNameToken).toBeDefined();
      expect(classNameToken?.kind).toBe('identifier');
    });
  });
});

// =============================================================================
// Keyword Recognition
// =============================================================================

describe('English Keyword Recognition', () => {
  it('should recognize "when" as a keyword', () => {
    const tokens = getTokens('when clicked');
    expect(tokens[0].kind).toBe('keyword');
    expect(tokens[0].value).toBe('when');
  });

  it('should recognize "upon" as a keyword', () => {
    const tokens = getTokens('upon clicking');
    expect(tokens[0].kind).toBe('keyword');
    expect(tokens[0].value).toBe('upon');
  });

  it('should recognize "flip" as a keyword', () => {
    const tokens = getTokens('flip .active');
    expect(tokens[0].kind).toBe('keyword');
  });

  it('should recognize "increase" as a keyword', () => {
    const tokens = getTokens('increase #count');
    expect(tokens[0].kind).toBe('keyword');
  });

  it('should recognize "colour" as a keyword', () => {
    const tokens = getTokens('colour');
    expect(tokens[0].kind).toBe('keyword');
  });
});

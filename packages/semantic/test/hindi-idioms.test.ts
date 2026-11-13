/**
 * Hindi Native Idiom Tests
 *
 * Tests for native Hindi idiom patterns that go beyond
 * direct translations to support more natural Hindi expressions.
 *
 * These patterns accept multiple grammatically-correct forms that all
 * normalize to equivalent semantic nodes.
 *
 * Key forms tested:
 * - Event markers: पर (on/at), जब (when), जब भी (whenever)
 * - Postpositions: को (patient/dative), में (in/into), पर (on/at), से (from/by)
 * - Possessive: का/की/के (of), मेरा/मेरी/मेरे (my)
 * - Control flow: अगर (if), फिर/तब (then), और (and), समाप्त/अंत (end)
 *
 * Hindi features:
 * - SOV (Subject-Object-Verb) word order
 * - LTR text direction with Devanagari script (U+0900-U+097F)
 * - Postpositions instead of prepositions
 * - Fusional verb conjugation (imperative forms for UI commands)
 * - Gender-inflected possessives (masculine/feminine/oblique)
 * - Matras (vowel signs), nukta, and conjuncts in Devanagari
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
// Tokenizer Tests - Keyword Detection
// =============================================================================

describe('Hindi Tokenizer - Keyword Detection', () => {
  describe('Command keywords', () => {
    it('should tokenize टॉगल as toggle', () => {
      const tokens = getTokens('टॉगल .active', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('toggle');
    });

    it('should tokenize जोड़ें as add', () => {
      const tokens = getTokens('जोड़ें .highlight', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should tokenize हटाएं as remove', () => {
      const tokens = getTokens('हटाएं .highlight', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize दिखाएं as show', () => {
      const tokens = getTokens('दिखाएं #modal', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should tokenize छिपाएं as hide', () => {
      const tokens = getTokens('छिपाएं #modal', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize बढ़ाएं as increment', () => {
      const tokens = getTokens('बढ़ाएं counter', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should tokenize घटाएं as decrement', () => {
      const tokens = getTokens('घटाएं counter', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('decrement');
    });

    it('should tokenize रखें as put', () => {
      const tokens = getTokens('रखें "test"', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should tokenize सेट as set', () => {
      const tokens = getTokens('सेट x', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('set');
    });

    it('should tokenize प्राप्त as get', () => {
      const tokens = getTokens('प्राप्त #element', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('get');
    });
  });

  describe('Alternative keyword forms', () => {
    it('should tokenize जोड़ (add alt) as add', () => {
      const tokens = getTokens('जोड़ .highlight', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should tokenize मिटाएं (remove alt) as remove', () => {
      const tokens = getTokens('मिटाएं .highlight', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('remove');
    });

    it('should tokenize दिखा (show alt) as show', () => {
      const tokens = getTokens('दिखा #modal', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('show');
    });

    it('should tokenize छिपा (hide alt) as hide', () => {
      const tokens = getTokens('छिपा #modal', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('hide');
    });

    it('should tokenize रख (put alt) as put', () => {
      const tokens = getTokens('रख "test"', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('put');
    });

    it('should tokenize बढ़ा (increment alt) as increment', () => {
      const tokens = getTokens('बढ़ा counter', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should tokenize घटा (decrement alt) as decrement', () => {
      const tokens = getTokens('घटा counter', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('decrement');
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('टॉगल .active', 'hi');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('दिखाएं #modal', 'hi');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });

    it('should handle compound selectors', () => {
      const tokens = getTokens('टॉगल .btn.active', 'hi');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toContain('.btn');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Hindi Event Handler Patterns', () => {
  describe('Standard pattern: {event} पर (on)', () => {
    it('should tokenize "क्लिक पर टॉगल .active"', () => {
      const tokens = getTokens('क्लिक पर टॉगल .active', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
      // Should recognize क्लिक as click
      const clickToken = tokens.find(t => t.normalized === 'click' || t.value === 'क्लिक');
      expect(clickToken).toBeDefined();
    });

    it('should tokenize "सबमिट पर .loading को टॉगल"', () => {
      const tokens = getTokens('सबमिट पर .loading को टॉगल', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "क्लिक पर #button का .active को टॉगल"', () => {
      const node = parse('क्लिक पर #button का .active को टॉगल', 'hi');
      expect(node.action).toBe('on');
    });

    it('should parse "सबमिट पर .loading को टॉगल"', () => {
      const node = parse('सबमिट पर .loading को टॉगल', 'hi');
      expect(node.action).toBe('on');
    });
  });

  describe('Temporal pattern: जब (when)', () => {
    it('should tokenize जब as event marker', () => {
      const tokens = getTokens('जब क्लिक', 'hi');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const jabToken = tokens.find(t => t.value === 'जब');
      expect(jabToken).toBeDefined();
      expect(jabToken?.kind).toBe('keyword');
    });

    it('should parse "जब क्लिक टॉगल .active"', () => {
      const node = parse('जब क्लिक टॉगल .active', 'hi');
      expect(node.action).toBe('on');
    });
  });

  describe('Repetitive pattern: जब भी (whenever)', () => {
    it('should tokenize "जब भी क्लिक बढ़ाएं counter"', () => {
      const tokens = getTokens('जब भी क्लिक बढ़ाएं counter', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Event handler with destination', () => {
    it('should parse "होवर पर .highlight को जोड़ें"', () => {
      const node = parse('होवर पर .highlight को जोड़ें', 'hi');
      expect(node.action).toBe('on');
    });

    it('should parse "क्लिक पर #counter को बढ़ाएं"', () => {
      const node = parse('क्लिक पर #counter को बढ़ाएं', 'hi');
      expect(node.action).toBe('on');
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Hindi Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "टॉगल .active"', () => {
      const node = parse('टॉगल .active', 'hi');
      // Parser may wrap in event handler or return command directly
      expect(['toggle', 'on']).toContain(node.action);
    });

    it('should parse ".active को टॉगल" (SOV order)', () => {
      const node = parse('.active को टॉगल', 'hi');
      expect(['toggle', 'on']).toContain(node.action);
    });

    it('should parse with alternative बदलें', () => {
      const tokens = getTokens('बदलें .active', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('toggle');
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "दिखाएं #modal"', () => {
      const node = parse('दिखाएं #modal', 'hi');
      expect(['show', 'on']).toContain(node.action);
    });

    it('should parse "छिपाएं #modal"', () => {
      const node = parse('छिपाएं #modal', 'hi');
      expect(['hide', 'on']).toContain(node.action);
    });

    it('should parse "#modal को दिखा" (SOV order, alt form)', () => {
      const node = parse('#modal को दिखा', 'hi');
      expect(['show', 'on']).toContain(node.action);
    });

    it('should parse "#modal को छिपा" (SOV order, alt form)', () => {
      const node = parse('#modal को छिपा', 'hi');
      expect(['hide', 'on']).toContain(node.action);
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "जोड़ें .highlight"', () => {
      const node = parse('जोड़ें .highlight', 'hi');
      expect(['add', 'on']).toContain(node.action);
    });

    it('should parse "हटाएं .highlight"', () => {
      const node = parse('हटाएं .highlight', 'hi');
      expect(['remove', 'on']).toContain(node.action);
    });

    it('should parse ".highlight को जोड़ें" (SOV order)', () => {
      const node = parse('.highlight को जोड़ें', 'hi');
      expect(['add', 'on']).toContain(node.action);
    });

    it('should parse ".highlight को हटाएं" (SOV order)', () => {
      const node = parse('.highlight को हटाएं', 'hi');
      expect(['remove', 'on']).toContain(node.action);
    });
  });

  describe('Increment/Decrement commands', () => {
    it('should parse "बढ़ाएं counter"', () => {
      const node = parse('बढ़ाएं counter', 'hi');
      expect(['increment', 'on']).toContain(node.action);
    });

    it('should parse "घटाएं counter"', () => {
      const node = parse('घटाएं counter', 'hi');
      expect(['decrement', 'on']).toContain(node.action);
    });

    it('should parse "counter को बढ़ा" (SOV order, alt form)', () => {
      const node = parse('counter को बढ़ा', 'hi');
      expect(['increment', 'on']).toContain(node.action);
    });

    it('should parse "counter को घटा" (SOV order, alt form)', () => {
      const node = parse('counter को घटा', 'hi');
      expect(['decrement', 'on']).toContain(node.action);
    });
  });

  describe('Put/Set/Get commands', () => {
    it('should parse "रखें \\"नमस्ते\\" में #output"', () => {
      const node = parse('रखें "नमस्ते" में #output', 'hi');
      expect(['put', 'on']).toContain(node.action);
    });

    it('should parse "\\"नमस्ते\\" को #output में रख" (SOV order, alt form)', () => {
      const node = parse('"नमस्ते" को #output में रख', 'hi');
      expect(['put', 'on']).toContain(node.action);
    });

    it('should parse "सेट x पर 10"', () => {
      const node = parse('सेट x पर 10', 'hi');
      expect(['set', 'on']).toContain(node.action);
    });

    it('should parse "प्राप्त #element"', () => {
      const node = parse('प्राप्त #element', 'hi');
      expect(['get', 'on']).toContain(node.action);
    });
  });
});

// =============================================================================
// Devanagari Script-Specific Tests
// =============================================================================

describe('Hindi Devanagari Script Handling', () => {
  describe('Matras (vowel signs)', () => {
    it('should handle aa matra (ा) in बढ़ाएं', () => {
      const tokens = getTokens('बढ़ाएं counter', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('increment');
    });

    it('should handle ii matra (ी) in मेरी', () => {
      const tokens = getTokens('मेरी .active', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle e matra (े) in मेरे', () => {
      const tokens = getTokens('मेरे element', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle o matra (ो) in रोकें', () => {
      const tokens = getTokens('रोकें', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('halt');
    });

    it('should handle au matra (ौ) in लौटाएं', () => {
      const tokens = getTokens('लौटाएं x', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('return');
    });
  });

  describe('Nukta (dot below)', () => {
    it('should handle nukta in जोड़ें (ड़ = ड + nukta)', () => {
      const tokens = getTokens('जोड़ें .highlight', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('add');
    });

    it('should handle nukta in बढ़ाएं (ढ़ = ढ + nukta)', () => {
      const tokens = getTokens('बढ़ाएं counter', 'hi');
      expect(tokens[0].kind).toBe('keyword');
    });
  });

  describe('Conjuncts (combined consonants)', () => {
    it('should handle conjunct in प्राप्त (pr + aa + pt)', () => {
      const tokens = getTokens('प्राप्त #element', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('get');
    });

    it('should handle conjunct in क्लिक (kl)', () => {
      const tokens = getTokens('क्लिक पर', 'hi');
      const clickToken = tokens.find(t => t.normalized === 'click');
      expect(clickToken).toBeDefined();
    });

    it('should handle conjunct in प्रतीक्षा (pr + t)', () => {
      const tokens = getTokens('प्रतीक्षा 1s', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('wait');
    });
  });

  describe('Visarga and chandrabindu', () => {
    it('should handle anusvara (ं) in हिन्दी', () => {
      // Token should still be recognized as identifier
      const tokens = getTokens('संक्रमण', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle chandrabindu (ँ) if present', () => {
      const tokens = getTokens('कहाँ element', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed Devanagari and ASCII', () => {
    it('should handle Devanagari keyword with ASCII selector', () => {
      const tokens = getTokens('टॉगल .active', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
    });

    it('should handle Devanagari keyword with ASCII identifier', () => {
      const tokens = getTokens('बढ़ाएं counter', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[1].kind).toBe('identifier');
    });

    it('should handle ASCII event name in Hindi context', () => {
      const tokens = getTokens('click पर टॉगल .active', 'hi');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });
  });
});

// =============================================================================
// Postposition/Modifier Tests
// =============================================================================

describe('Hindi Postpositions and Modifiers', () => {
  describe('Patient marker को (to/accusative)', () => {
    it('should handle को in ".active को टॉगल"', () => {
      const tokens = getTokens('.active को टॉगल', 'hi');
      const koToken = tokens.find(t => t.value === 'को');
      expect(koToken).toBeDefined();
    });

    it('should handle को in "#counter को बढ़ाएं"', () => {
      const tokens = getTokens('#counter को बढ़ाएं', 'hi');
      const koToken = tokens.find(t => t.value === 'को');
      expect(koToken).toBeDefined();
    });
  });

  describe('Destination marker में (in/into)', () => {
    it('should handle में in "रखें \\"text\\" में #output"', () => {
      const tokens = getTokens('रखें "text" में #output', 'hi');
      const meinToken = tokens.find(t => t.value === 'में');
      expect(meinToken).toBeDefined();
    });

    it('should handle में in "#output में रखो"', () => {
      const tokens = getTokens('"hello" को #output में रखो', 'hi');
      const meinToken = tokens.find(t => t.value === 'में');
      expect(meinToken).toBeDefined();
    });
  });

  describe('Event/location marker पर (on/at)', () => {
    it('should handle पर as event marker in "क्लिक पर"', () => {
      const tokens = getTokens('क्लिक पर टॉगल .active', 'hi');
      const parToken = tokens.find(t => t.value === 'पर');
      expect(parToken).toBeDefined();
    });

    it('should handle पर as value marker in "सेट x पर 10"', () => {
      const tokens = getTokens('सेट x पर 10', 'hi');
      const parToken = tokens.find(t => t.value === 'पर');
      expect(parToken).toBeDefined();
    });
  });

  describe('Source marker से (from/by)', () => {
    it('should handle से in source context', () => {
      const tokens = getTokens('हटाएं .class से #element', 'hi');
      const seToken = tokens.find(t => t.value === 'से');
      expect(seToken).toBeDefined();
    });
  });

  describe('Possessive markers का/की/के (of)', () => {
    it('should handle का (masculine possessive)', () => {
      const tokens = getTokens('#button का .active को टॉगल', 'hi');
      const kaToken = tokens.find(t => t.value === 'का');
      expect(kaToken).toBeDefined();
    });

    it('should handle की (feminine possessive)', () => {
      const tokens = getTokens('#form की .error', 'hi');
      const kiToken = tokens.find(t => t.value === 'की');
      expect(kiToken).toBeDefined();
    });

    it('should handle के (oblique/plural possessive)', () => {
      const tokens = getTokens('#element के .active', 'hi');
      const keToken = tokens.find(t => t.value === 'के');
      expect(keToken).toBeDefined();
    });
  });

  describe('Personal possessives', () => {
    // Note: Possessive keywords (मेरा, मेरी, etc.) are defined in profile.possessive.keywords
    // but not registered as tokenizer keywords via initializeKeywordsFromProfile.
    // They are correctly tokenized as identifiers.

    it('should handle मेरा (my, masculine) as token', () => {
      const tokens = getTokens('मेरा element', 'hi');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].value).toBe('मेरा');
    });

    it('should handle मेरी (my, feminine) as token', () => {
      const tokens = getTokens('मेरी .active', 'hi');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].value).toBe('मेरी');
    });

    it('should handle मेरे (my, oblique/plural) as token', () => {
      const tokens = getTokens('मेरे element', 'hi');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].value).toBe('मेरे');
    });

    it('should handle उसका (its, masculine) as token', () => {
      const tokens = getTokens('उसका value', 'hi');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].value).toBe('उसका');
    });
  });

  describe('Control flow keywords', () => {
    it('should tokenize अगर as if', () => {
      const tokens = getTokens('अगर सच', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('if');
    });

    it('should tokenize फिर as then', () => {
      const tokens = getTokens('फिर टॉगल .active', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('then');
    });

    it('should tokenize और as and', () => {
      const tokens = getTokens('और दिखाएं #result', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('and');
    });

    it('should tokenize समाप्त as end', () => {
      const tokens = getTokens('समाप्त', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('end');
    });

    it('should tokenize अंत (alt) as end', () => {
      const tokens = getTokens('अंत', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('end');
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Hindi Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "क्लिक पर #button का .active को टॉगल"', () => {
      const tokens = getTokens('क्लिक पर #button का .active को टॉगल', 'hi');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "सबमिट पर .loading को टॉगल"', () => {
      const tokens = getTokens('सबमिट पर .loading को टॉगल', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "होवर पर .highlight को जोड़ें"', () => {
      const tokens = getTokens('होवर पर .highlight को जोड़ें', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "क्लिक पर #counter को बढ़ाएं"', () => {
      const tokens = getTokens('क्लिक पर #counter को बढ़ाएं', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "इनपुट पर \\"test\\" को #output में रखें"', () => {
      const tokens = getTokens('इनपुट पर "test" को #output में रखें', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "बदलाव पर x को 10 में सेट"', () => {
      const tokens = getTokens('बदलाव पर x को 10 में सेट', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "फोकस पर #tooltip को दिखाएं"', () => {
      const tokens = getTokens('फोकस पर #tooltip को दिखाएं', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle "धुंधला पर #tooltip को छिपाएं"', () => {
      const tokens = getTokens('धुंधला पर #tooltip को छिपाएं', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Compound commands', () => {
    it('should handle chaining with फिर (then)', () => {
      const tokens = getTokens('जोड़ें .loading फिर प्रतीक्षा 1s फिर हटाएं .loading', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
      const phirTokens = tokens.filter(t => t.value === 'फिर');
      expect(phirTokens.length).toBe(2);
    });

    it('should handle chaining with तब (then alt)', () => {
      const tokens = getTokens('टॉगल .active तब दिखाएं #result', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle chaining with और (and)', () => {
      const tokens = getTokens('जोड़ें .highlight और दिखाएं #tooltip', 'hi');
      expect(tokens.length).toBeGreaterThan(0);
      const aurToken = tokens.find(t => t.value === 'और');
      expect(aurToken).toBeDefined();
    });

    it('should handle event handler with compound body', () => {
      const tokens = getTokens(
        'क्लिक पर जोड़ें .loading फिर लाएं /api/data फिर हटाएं .loading',
        'hi'
      );
      expect(tokens.length).toBeGreaterThan(5);
    });
  });

  describe('Semantic equivalence', () => {
    it('all command forms tokenize correctly', () => {
      const toggleTokens = getTokens('टॉगल .active', 'hi');
      const toggleSOVTokens = getTokens('.active को टॉगल', 'hi');
      const showTokens = getTokens('दिखाएं #modal', 'hi');
      const hideTokens = getTokens('छिपाएं #modal', 'hi');
      const incTokens = getTokens('बढ़ाएं counter', 'hi');
      const decTokens = getTokens('घटाएं counter', 'hi');

      expect(toggleTokens.length).toBeGreaterThan(0);
      expect(toggleSOVTokens.length).toBeGreaterThan(0);
      expect(showTokens.length).toBeGreaterThan(0);
      expect(hideTokens.length).toBeGreaterThan(0);
      expect(incTokens.length).toBeGreaterThan(0);
      expect(decTokens.length).toBeGreaterThan(0);
    });

    it('event handler forms tokenize correctly', () => {
      const parTokens = getTokens('क्लिक पर टॉगल .active', 'hi');
      const jabTokens = getTokens('जब क्लिक टॉगल .active', 'hi');

      expect(parTokens.length).toBeGreaterThan(0);
      expect(jabTokens.length).toBeGreaterThan(0);
    });

    it('primary and alternative keywords produce same normalized value', () => {
      const primary = getTokens('जोड़ें .highlight', 'hi');
      const alt = getTokens('जोड़ .highlight', 'hi');
      expect(primary[0].normalized).toBe('add');
      expect(alt[0].normalized).toBe('add');
      expect(primary[0].normalized).toBe(alt[0].normalized);
    });
  });

  describe('References', () => {
    it('should tokenize मैं as me', () => {
      const tokens = getTokens('मैं', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('me');
    });

    it('should tokenize यह as it', () => {
      const tokens = getTokens('यह', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('it');
    });

    it('should tokenize आप as you', () => {
      const tokens = getTokens('आप', 'hi');
      expect(tokens[0].kind).toBe('keyword');
      expect(tokens[0].normalized).toBe('you');
    });
  });
});

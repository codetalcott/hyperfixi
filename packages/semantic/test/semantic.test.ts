/**
 * Semantic Parser Tests
 *
 * Tests for the semantic-first multilingual hyperscript parser.
 */

import { describe, it, expect } from 'vitest';
import {
  parse,
  canParse,
  render,
  renderExplicit,
  translate,
  parseExplicit,
  toExplicit,
  fromExplicit,
  roundTrip,
  getAllTranslations,
  tokenize,
  getSupportedLanguages,
} from '../src';

// =============================================================================
// English Parsing Tests
// =============================================================================

describe('English Parsing', () => {
  describe('toggle command', () => {
    it('should parse "toggle .active on #button"', () => {
      const node = parse('toggle .active on #button', 'en');

      expect(node.kind).toBe('command');
      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')).toEqual({
        type: 'selector',
        value: '.active',
        selectorKind: 'class',
      });
      expect(node.roles.get('destination')).toEqual({
        type: 'selector',
        value: '#button',
        selectorKind: 'id',
      });
    });

    it('should parse "toggle .active" with implicit target', () => {
      const node = parse('toggle .active', 'en');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')).toEqual({
        type: 'selector',
        value: '.active',
        selectorKind: 'class',
      });
      // Implicit target should be 'me'
      expect(node.roles.get('destination')?.value).toBe('me');
    });
  });

  describe('put command', () => {
    it('should parse "put \\"hello\\" into #output"', () => {
      const node = parse('put "hello" into #output', 'en');

      expect(node.action).toBe('put');
      expect(node.roles.get('patient')).toEqual({
        type: 'literal',
        value: 'hello',
        dataType: 'string',
      });
      expect(node.roles.get('destination')).toEqual({
        type: 'selector',
        value: '#output',
        selectorKind: 'id',
      });
    });
  });
});

// =============================================================================
// Japanese Parsing Tests
// =============================================================================

describe('Japanese Parsing', () => {
  describe('toggle command', () => {
    it('should parse ".active を 切り替え"', () => {
      const node = parse('.active を 切り替え', 'ja');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')).toEqual({
        type: 'selector',
        value: '.active',
        selectorKind: 'class',
      });
    });

    it('should parse "#button の .active を 切り替え"', () => {
      const node = parse('#button の .active を 切り替え', 'ja');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
      expect(node.roles.get('destination')?.value).toBe('#button');
    });
  });
});

// =============================================================================
// Conjugated Verb Integration Tests
// =============================================================================
// These tests validate that morphological normalization enables natural
// conjugated verb forms to be parsed correctly.

describe('Conjugated Verb Parsing', () => {
  describe('Japanese conjugations', () => {
    it('should parse past tense: ".active を 切り替えた"', () => {
      const node = parse('.active を 切り替えた', 'ja');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse polite form: ".active を 切り替えます"', () => {
      const node = parse('.active を 切り替えます', 'ja');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse te-form: ".active を 切り替えて"', () => {
      const node = parse('.active を 切り替えて', 'ja');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse progressive: ".active を 切り替えている"', () => {
      const node = parse('.active を 切り替えている', 'ja');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse する verb: ".active を トグルする"', () => {
      const node = parse('.active を トグルする', 'ja');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse する verb past: ".active を トグルした"', () => {
      const node = parse('.active を トグルした', 'ja');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });
  });

  describe('Korean conjugations', () => {
    it('should parse dictionary form: ".active 를 토글하다"', () => {
      const node = parse('.active 를 토글하다', 'ko');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse polite form: ".active 를 토글해요"', () => {
      const node = parse('.active 를 토글해요', 'ko');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse formal form: ".active 를 토글합니다"', () => {
      const node = parse('.active 를 토글합니다', 'ko');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse honorific request: ".active 를 토글하세요"', () => {
      const node = parse('.active 를 토글하세요', 'ko');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse past tense: ".active 를 토글했어요"', () => {
      const node = parse('.active 를 토글했어요', 'ko');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });
  });

  describe('Spanish conjugations', () => {
    it('should parse gerund: "alternando .active"', () => {
      const node = parse('alternando .active', 'es');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse past participle: "alternado .active"', () => {
      const node = parse('alternado .active', 'es');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse 3rd person: "alterna .active"', () => {
      const node = parse('alterna .active', 'es');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse reflexive infinitive: "alternarse .active"', () => {
      const node = parse('alternarse .active', 'es');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });
  });

  describe('Turkish conjugations', () => {
    // Turkish is SOV: patient + accusative marker + verb
    it('should parse infinitive: ".active i değiştirmek"', () => {
      const node = parse('.active i değiştirmek', 'tr');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse present continuous: ".active i değiştiriyor"', () => {
      const node = parse('.active i değiştiriyor', 'tr');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse past tense: ".active i değiştirdi"', () => {
      const node = parse('.active i değiştirdi', 'tr');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse 1sg present: ".active i değiştiriyorum"', () => {
      const node = parse('.active i değiştiriyorum', 'tr');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });
  });

  describe('Arabic prefix variations', () => {
    it('should parse with definite article: "البدّل .active"', () => {
      const node = parse('البدّل .active', 'ar');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse present tense marker: "يبدّل .active"', () => {
      const node = parse('يبدّل .active', 'ar');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse without diacritics: "بدل .active"', () => {
      const node = parse('بدل .active', 'ar');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });
  });
});

// =============================================================================
// Arabic Parsing Tests
// =============================================================================

describe('Arabic Parsing', () => {
  describe('toggle command', () => {
    it('should parse "بدّل .active"', () => {
      const node = parse('بدّل .active', 'ar');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')).toEqual({
        type: 'selector',
        value: '.active',
        selectorKind: 'class',
      });
    });

    it('should parse "بدّل .active على #button"', () => {
      const node = parse('بدّل .active على #button', 'ar');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
      expect(node.roles.get('destination')?.value).toBe('#button');
    });
  });
});

// =============================================================================
// Spanish Parsing Tests
// =============================================================================

describe('Spanish Parsing', () => {
  describe('toggle command', () => {
    it('should parse "alternar .active"', () => {
      const node = parse('alternar .active', 'es');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')).toEqual({
        type: 'selector',
        value: '.active',
        selectorKind: 'class',
      });
    });

    it('should parse "alternar .active en #button"', () => {
      const node = parse('alternar .active en #button', 'es');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
      expect(node.roles.get('destination')?.value).toBe('#button');
    });
  });
});

// =============================================================================
// Explicit Mode Tests
// =============================================================================

describe('Explicit Mode', () => {
  // --- Parsing ---

  it('should parse explicit syntax', () => {
    const node = parseExplicit('[toggle patient:.active destination:#button]');

    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient')?.value).toBe('.active');
    expect(node.roles.get('destination')?.value).toBe('#button');
  });

  it('should parse put with patient and destination', () => {
    const node = parseExplicit('[put patient:"hello" destination:#output]');

    expect(node.action).toBe('put');
    expect(node.roles.get('patient')?.value).toBe('hello');
    expect(node.roles.get('destination')?.value).toBe('#output');
  });

  it('should parse add with patient and destination', () => {
    const node = parseExplicit('[add patient:.active destination:#button]');

    expect(node.action).toBe('add');
    expect(node.roles.get('patient')?.value).toBe('.active');
    expect(node.roles.get('destination')?.value).toBe('#button');
  });

  it('should parse fetch with source and responseType', () => {
    const node = parseExplicit('[fetch source:/api/data responseType:json]');

    expect(node.action).toBe('fetch');
    expect(node.roles.get('source')?.value).toBe('/api/data');
    expect(node.roles.get('responseType')?.value).toBe('json');
  });

  it('should parse increment with patient and quantity', () => {
    const node = parseExplicit('[increment patient:#count quantity:5]');

    expect(node.action).toBe('increment');
    expect(node.roles.get('patient')?.value).toBe('#count');
    expect(node.roles.get('quantity')?.value).toBe(5);
  });

  it('should parse boolean values', () => {
    const node = parseExplicit('[log patient:true]');
    expect(node.roles.get('patient')?.value).toBe(true);
  });

  it('should parse duration values', () => {
    const node = parseExplicit('[wait duration:500ms]');
    expect(node.roles.get('duration')?.value).toBe('500ms');
  });

  it('should parse nested body syntax', () => {
    const node = parseExplicit('[on event:click body:[toggle patient:.active]]');

    expect(node.kind).toBe('event-handler');
    expect(node.action).toBe('on');
  });

  // --- Rendering ---

  it('should render to explicit syntax', () => {
    const node = parse('toggle .active on #button', 'en');
    const explicit = renderExplicit(node);

    expect(explicit).toContain('[toggle');
    expect(explicit).toContain('.active');
    expect(explicit).toContain('#button');
  });

  // --- Conversion ---

  it('should convert natural to explicit', () => {
    const explicit = toExplicit('toggle .active on #button', 'en');

    expect(explicit).toContain('[toggle');
    expect(explicit).toContain('.active');
  });

  it('should convert explicit to natural', () => {
    const natural = fromExplicit('[toggle patient:.active destination:#button]', 'en');

    expect(natural).toContain('toggle');
    expect(natural).toContain('.active');
  });

  // --- Validation (error cases) ---

  it('should throw on missing brackets', () => {
    expect(() => parseExplicit('toggle patient:.active')).toThrow('wrapped in brackets');
  });

  it('should throw on empty explicit statement', () => {
    expect(() => parseExplicit('[]')).toThrow('Empty explicit statement');
  });

  it('should throw on missing colon in role:value pair', () => {
    expect(() => parseExplicit('[toggle .active]')).toThrow('Expected role:value');
  });

  it('should throw on unknown role name with valid role list', () => {
    expect(() => parseExplicit('[toggle typo:.active]')).toThrow('Unknown role "typo"');
    expect(() => parseExplicit('[toggle typo:.active]')).toThrow('Valid roles:');
    expect(() => parseExplicit('[toggle typo:.active]')).toThrow('patient');
  });

  it('should throw on missing required role with description', () => {
    // put requires patient (content) — no default
    expect(() => parseExplicit('[put destination:#output]')).toThrow('Missing required role "patient"');
    expect(() => parseExplicit('[put destination:#output]')).toThrow('content to put');
  });

  it('should accept valid roles without error', () => {
    // toggle destination is optional with default=me, so just patient is fine
    expect(() => parseExplicit('[toggle patient:.active]')).not.toThrow();
  });

  // --- Round-trip ---

  it('should round-trip toggle through explicit syntax', () => {
    const node1 = parse('toggle .active on #button', 'en');
    const explicit = renderExplicit(node1);
    const node2 = parseExplicit(explicit);

    expect(node2.action).toBe('toggle');
    expect(node2.roles.get('patient')?.value).toBe('.active');
  });

  it('should round-trip add through explicit syntax', () => {
    const node1 = parse('add .highlight to #panel', 'en');
    const explicit = renderExplicit(node1);
    const node2 = parseExplicit(explicit);

    expect(node2.action).toBe('add');
    expect(node2.roles.get('patient')?.value).toBe('.highlight');
  });
});

// =============================================================================
// Translation Tests
// =============================================================================

describe('Translation', () => {
  it('should translate English to Japanese', () => {
    const japanese = translate('toggle .active', 'en', 'ja');

    expect(japanese).toContain('.active');
    expect(japanese).toContain('切り替え');
  });

  it('should translate English to Arabic', () => {
    const arabic = translate('toggle .active', 'en', 'ar');

    expect(arabic).toContain('.active');
    expect(arabic).toContain('بدّل');
  });

  it('should translate English to Spanish', () => {
    const spanish = translate('toggle .active', 'en', 'es');

    expect(spanish).toContain('.active');
    expect(spanish).toContain('alternar');
  });

  it('should translate Japanese to English', () => {
    const english = translate('.active を 切り替え', 'ja', 'en');

    expect(english).toContain('.active');
    expect(english).toContain('toggle');
  });

  it('should get all translations', () => {
    const translations = getAllTranslations(
      'toggle .active',
      'en',
      ['ja', 'ar', 'es']
    );

    expect(translations.ja).toContain('切り替え');
    expect(translations.ar).toContain('بدّل');
    expect(translations.es).toContain('alternar');
    expect(translations.explicit).toContain('[toggle');
  });
});

// =============================================================================
// Round-Trip Tests
// =============================================================================

describe('Round-Trip', () => {
  it('should round-trip English', () => {
    const result = roundTrip('toggle .active', 'en');

    expect(result.semantic.action).toBe('toggle');
    // Note: round-trip might not match exactly due to normalization
  });

  it('should round-trip explicit syntax', () => {
    const result = roundTrip('[toggle patient:.active]', 'en');

    expect(result.semantic.action).toBe('toggle');
  });
});

// =============================================================================
// Tokenizer Tests
// =============================================================================

describe('Tokenizers', () => {
  describe('English Tokenizer', () => {
    it('should tokenize simple command', () => {
      const tokens = tokenize('toggle .active on #button', 'en');

      expect(tokens.tokens.length).toBeGreaterThan(0);
      expect(tokens.tokens[0].value).toBe('toggle');
      expect(tokens.tokens[0].kind).toBe('keyword');
    });

    it('should tokenize CSS selectors', () => {
      const tokens = tokenize('#myId .myClass [data-attr]', 'en');

      expect(tokens.tokens.some(t => t.value === '#myId')).toBe(true);
      expect(tokens.tokens.some(t => t.value === '.myClass')).toBe(true);
      expect(tokens.tokens.some(t => t.value === '[data-attr]')).toBe(true);
    });
  });

  describe('Japanese Tokenizer', () => {
    it('should tokenize with particles', () => {
      const tokens = tokenize('.active を 切り替え', 'ja');

      expect(tokens.tokens.some(t => t.value === '.active')).toBe(true);
      expect(tokens.tokens.some(t => t.value === 'を')).toBe(true);
      expect(tokens.tokens.some(t => t.kind === 'keyword')).toBe(true);
    });
  });

  describe('Arabic Tokenizer', () => {
    it('should tokenize Arabic commands', () => {
      const tokens = tokenize('بدّل .active', 'ar');

      expect(tokens.tokens.some(t => t.value === 'بدّل')).toBe(true);
      expect(tokens.tokens.some(t => t.value === '.active')).toBe(true);
    });
  });

  describe('Spanish Tokenizer', () => {
    it('should tokenize Spanish commands', () => {
      const tokens = tokenize('alternar .active en #button', 'es');

      expect(tokens.tokens.some(t => t.value === 'alternar')).toBe(true);
      expect(tokens.tokens.some(t => t.value === '.active')).toBe(true);
      expect(tokens.tokens.some(t => t.value === 'en')).toBe(true);
    });
  });

  describe('URL Tokenization', () => {
    it('should tokenize absolute paths', () => {
      const tokens = tokenize('go to /home', 'en');

      const urlToken = tokens.tokens.find(t => t.value === '/home');
      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
    });

    it('should tokenize relative paths', () => {
      const tokens = tokenize('go to ./page', 'en');

      const urlToken = tokens.tokens.find(t => t.value === './page');
      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
    });

    it('should tokenize parent-relative paths', () => {
      const tokens = tokenize('go to ../parent', 'en');

      const urlToken = tokens.tokens.find(t => t.value === '../parent');
      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
    });

    it('should tokenize full URLs', () => {
      const tokens = tokenize('fetch from https://api.example.com/v1/users', 'en');

      const urlToken = tokens.tokens.find(t => t.value === 'https://api.example.com/v1/users');
      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
    });

    it('should tokenize URLs with query strings', () => {
      const tokens = tokenize('fetch from /api/users?page=1&limit=10', 'en');

      const urlToken = tokens.tokens.find(t => t.value === '/api/users?page=1&limit=10');
      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
    });

    it('should tokenize URLs with fragments', () => {
      const tokens = tokenize('go to /page#section', 'en');

      const urlToken = tokens.tokens.find(t => t.value === '/page#section');
      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
    });

    it('should keep CSS selectors separate from URLs', () => {
      const tokens = tokenize('go to /page #button', 'en');

      const urlToken = tokens.tokens.find(t => t.value === '/page');
      const selectorToken = tokens.tokens.find(t => t.value === '#button');

      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.kind).toBe('selector');
    });

    it('should tokenize protocol-relative URLs', () => {
      const tokens = tokenize('fetch from //cdn.example.com/script.js', 'en');

      const urlToken = tokens.tokens.find(t => t.value === '//cdn.example.com/script.js');
      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
    });

    it('should work in Japanese', () => {
      const tokens = tokenize('/home に 移動', 'ja');

      const urlToken = tokens.tokens.find(t => t.value === '/home');
      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
    });

    it('should work in Arabic', () => {
      const tokens = tokenize('اذهب إلى /home', 'ar');

      const urlToken = tokens.tokens.find(t => t.value === '/home');
      expect(urlToken).toBeDefined();
      expect(urlToken?.kind).toBe('url');
    });
  });
});

// =============================================================================
// API Tests
// =============================================================================

describe('API', () => {
  it('should return supported languages', () => {
    const languages = getSupportedLanguages();

    expect(languages).toContain('en');
    expect(languages).toContain('ja');
    expect(languages).toContain('ar');
    expect(languages).toContain('es');
  });

  it('should report canParse correctly', () => {
    expect(canParse('toggle .active', 'en')).toBe(true);
    expect(canParse('.active を 切り替え', 'ja')).toBe(true);
    expect(canParse('بدّل .active', 'ar')).toBe(true);
    expect(canParse('alternar .active', 'es')).toBe(true);
  });
});

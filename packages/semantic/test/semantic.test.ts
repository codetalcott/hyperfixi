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

  // Korean patterns not yet created - tokenizer and morphology ready
  // TODO: Create Korean semantic patterns (SOV word order with particles)
  describe.skip('Korean conjugations (patterns pending)', () => {
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

  // Turkish patterns not yet created - tokenizer and morphology ready
  // TODO: Create Turkish semantic patterns (SOV word order with postpositions)
  describe.skip('Turkish conjugations (patterns pending)', () => {
    it('should parse infinitive: "değiştirmek .active"', () => {
      const node = parse('değiştirmek .active', 'tr');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse present continuous: "değiştiriyor .active"', () => {
      const node = parse('değiştiriyor .active', 'tr');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse past tense: "değiştirdi .active"', () => {
      const node = parse('değiştirdi .active', 'tr');

      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')?.value).toBe('.active');
    });

    it('should parse 1sg present: "değiştiriyorum .active"', () => {
      const node = parse('değiştiriyorum .active', 'tr');

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
  it('should parse explicit syntax', () => {
    const node = parseExplicit('[toggle patient:.active destination:#button]');

    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient' as any)?.value).toBe('.active');
    expect(node.roles.get('destination' as any)?.value).toBe('#button');
  });

  it('should render to explicit syntax', () => {
    const node = parse('toggle .active on #button', 'en');
    const explicit = renderExplicit(node);

    expect(explicit).toContain('[toggle');
    expect(explicit).toContain('.active');
    expect(explicit).toContain('#button');
  });

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

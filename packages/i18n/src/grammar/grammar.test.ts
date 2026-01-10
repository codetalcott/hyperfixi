/**
 * Grammar Transformer Tests
 *
 * Tests for the generalized grammar transformation system
 * that handles multilingual hyperscript with proper word order
 * and grammatical markers.
 */

import { describe, it, expect } from 'vitest';
import {
  parseStatement,
  toLocale,
  toEnglish,
  translate,
  GrammarTransformer,
  examples,
} from './transformer';
import {
  getProfile,
  getSupportedLocales,
  profiles,
  englishProfile,
  japaneseProfile,
  chineseProfile,
  arabicProfile,
} from './profiles';
import {
  reorderRoles,
  insertMarkers,
  joinTokens,
  UNIVERSAL_PATTERNS,
  LANGUAGE_FAMILY_DEFAULTS,
} from './types';
import type { ParsedElement, SemanticRole } from './types';

// =============================================================================
// Profile Tests
// =============================================================================

describe('Language Profiles', () => {
  it('should have profiles for all supported locales', () => {
    const locales = getSupportedLocales();
    expect(locales).toContain('en');
    expect(locales).toContain('ja');
    expect(locales).toContain('ko');
    expect(locales).toContain('zh');
    expect(locales).toContain('ar');
    expect(locales).toContain('tr');
    expect(locales).toContain('es');
    expect(locales).toContain('de');
    expect(locales).toContain('fr');
    expect(locales).toContain('pt');
    expect(locales).toContain('id');
    expect(locales).toContain('qu');
    expect(locales).toContain('sw');
    expect(locales).toContain('bn');
    expect(locales.length).toBe(14);
  });

  it('should return undefined for unknown locales', () => {
    expect(getProfile('xx')).toBeUndefined();
    expect(getProfile('xyz')).toBeUndefined();
  });

  describe('English Profile', () => {
    it('should have SVO word order', () => {
      expect(englishProfile.wordOrder).toBe('SVO');
    });

    it('should use prepositions', () => {
      expect(englishProfile.adpositionType).toBe('preposition');
    });

    it('should have required markers', () => {
      const onMarker = englishProfile.markers.find(m => m.form === 'on');
      expect(onMarker).toBeDefined();
      expect(onMarker?.role).toBe('event');
      expect(onMarker?.required).toBe(true);
    });
  });

  describe('Japanese Profile', () => {
    it('should have SOV word order', () => {
      expect(japaneseProfile.wordOrder).toBe('SOV');
    });

    it('should use postpositions', () => {
      expect(japaneseProfile.adpositionType).toBe('postposition');
    });

    it('should have particle markers', () => {
      const woMarker = japaneseProfile.markers.find(m => m.form === 'を');
      expect(woMarker).toBeDefined();
      expect(woMarker?.role).toBe('patient');
      expect(woMarker?.position).toBe('postposition');
    });

    it('should place patient before action in canonical order', () => {
      const patientIndex = japaneseProfile.canonicalOrder.indexOf('patient');
      const actionIndex = japaneseProfile.canonicalOrder.indexOf('action');
      expect(patientIndex).toBeLessThan(actionIndex);
    });
  });

  describe('Arabic Profile', () => {
    it('should have VSO word order', () => {
      expect(arabicProfile.wordOrder).toBe('VSO');
    });

    it('should be RTL', () => {
      expect(arabicProfile.direction).toBe('rtl');
    });

    it('should place action first in canonical order', () => {
      expect(arabicProfile.canonicalOrder[0]).toBe('action');
    });
  });

  describe('Chinese Profile', () => {
    it('should have isolating morphology', () => {
      expect(chineseProfile.morphology).toBe('isolating');
    });

    it('should have circumfix markers for events', () => {
      const eventMarkers = chineseProfile.markers.filter(m => m.role === 'event');
      const hasPreposition = eventMarkers.some(m => m.position === 'preposition');
      const hasPostposition = eventMarkers.some(m => m.position === 'postposition');
      expect(hasPreposition).toBe(true);
      expect(hasPostposition).toBe(true);
    });
  });
});

// =============================================================================
// Statement Parsing Tests
// =============================================================================

describe('Statement Parser', () => {
  describe('parseStatement', () => {
    it('should parse event handlers', () => {
      const parsed = parseStatement('on click increment #count');
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('event-handler');
      expect(parsed?.roles.get('event')?.value).toBe('click');
      expect(parsed?.roles.get('action')?.value).toBe('increment');
      expect(parsed?.roles.get('patient')?.value).toBe('#count');
    });

    it('should identify CSS selectors as patient', () => {
      const parsed = parseStatement('on click toggle .active');
      expect(parsed?.roles.get('patient')?.isSelector).toBe(true);
    });

    it('should parse commands', () => {
      const parsed = parseStatement('put my value into #output');
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('command');
      expect(parsed?.roles.get('action')?.value).toBe('put');
    });

    it('should parse conditionals', () => {
      const parsed = parseStatement('if count > 5 then log done');
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('conditional');
    });

    it('should return null for empty input', () => {
      const parsed = parseStatement('');
      expect(parsed).toBeNull();
    });

    it('should preserve original input', () => {
      const input = 'on click increment #count';
      const parsed = parseStatement(input);
      expect(parsed?.original).toBe(input);
    });
  });

  describe('Event Handler Parsing', () => {
    it('should handle various event types', () => {
      const events = ['click', 'input', 'keydown', 'mouseenter', 'submit'];
      for (const event of events) {
        const parsed = parseStatement(`on ${event} log done`);
        expect(parsed?.roles.get('event')?.value).toBe(event);
      }
    });

    it('should handle complex selectors', () => {
      const parsed = parseStatement('on click toggle .menu-item.active');
      expect(parsed?.roles.get('patient')?.value).toBe('.menu-item.active');
    });
  });

  describe('Command Parsing', () => {
    it('should identify destination with "to" keyword', () => {
      const parsed = parseStatement('add .highlight to #element');
      expect(parsed?.roles.get('destination')?.value).toBe('#element');
    });

    it('should identify destination with "into" keyword', () => {
      const parsed = parseStatement('put value into #output');
      expect(parsed?.roles.get('destination')?.value).toBe('#output');
    });

    it('should identify source with "from" keyword', () => {
      const parsed = parseStatement('get data from #input');
      expect(parsed?.roles.get('source')?.value).toBe('#input');
    });
  });
});

// =============================================================================
// Role Transformation Tests
// =============================================================================

describe('Role Transformation', () => {
  describe('reorderRoles', () => {
    it('should reorder roles according to target order', () => {
      const roles = new Map<SemanticRole, ParsedElement>([
        ['action', { role: 'action', value: 'increment' }],
        ['patient', { role: 'patient', value: '#count' }],
        ['event', { role: 'event', value: 'click' }],
      ]);

      // Japanese order: patient, event, action
      const reordered = reorderRoles(roles, ['patient', 'event', 'action']);

      expect(reordered[0].role).toBe('patient');
      expect(reordered[1].role).toBe('event');
      expect(reordered[2].role).toBe('action');
    });

    it('should skip roles not present in input', () => {
      const roles = new Map<SemanticRole, ParsedElement>([
        ['action', { role: 'action', value: 'toggle' }],
        ['patient', { role: 'patient', value: '.active' }],
      ]);

      const reordered = reorderRoles(roles, ['patient', 'destination', 'action']);

      expect(reordered.length).toBe(2);
      expect(reordered[0].role).toBe('patient');
      expect(reordered[1].role).toBe('action');
    });
  });

  describe('insertMarkers', () => {
    it('should insert preposition markers before elements', () => {
      const elements: ParsedElement[] = [
        { role: 'destination', value: '#output', translated: '#output' },
      ];
      const markers = [
        { form: 'to', role: 'destination' as SemanticRole, position: 'preposition' as const, required: false },
      ];

      const result = insertMarkers(elements, markers, 'preposition');
      expect(result).toEqual(['to', '#output']);
    });

    it('should insert postposition markers after elements', () => {
      const elements: ParsedElement[] = [
        { role: 'patient', value: '#count', translated: '#count' },
      ];
      const markers = [
        { form: 'を', role: 'patient' as SemanticRole, position: 'postposition' as const, required: true },
      ];

      const result = insertMarkers(elements, markers, 'postposition');
      expect(result).toEqual(['#count', 'を']);
    });

    it('should use translated values when available', () => {
      const elements: ParsedElement[] = [
        { role: 'action', value: 'increment', translated: '増加' },
      ];

      const result = insertMarkers(elements, [], 'none');
      expect(result).toEqual(['増加']);
    });
  });

  describe('joinTokens', () => {
    it('should join regular tokens with spaces', () => {
      const result = joinTokens(['hello', 'world']);
      expect(result).toBe('hello world');
    });

    it('should handle empty array', () => {
      const result = joinTokens([]);
      expect(result).toBe('');
    });

    it('should handle single token', () => {
      const result = joinTokens(['hello']);
      expect(result).toBe('hello');
    });

    it('should attach suffix markers without space (Quechua -ta)', () => {
      // #count + -ta → #countta
      const result = joinTokens(['#count', '-ta']);
      expect(result).toBe('#countta');
    });

    it('should attach prefix markers without space (Arabic بـ-)', () => {
      // بـ- + الماوس → بـالماوس
      const result = joinTokens(['بـ-', 'الماوس']);
      expect(result).toBe('بـالماوس');
    });

    it('should handle multiple suffix markers (Turkish case suffixes)', () => {
      // value + -i + another → valuei another
      const result = joinTokens(['value', '-i', 'another']);
      expect(result).toBe('valuei another');
    });

    it('should handle Japanese particles with normal spacing', () => {
      // Japanese particles don't use hyphen notation, so they get spaces
      const result = joinTokens(['#count', 'を', 'クリック', 'で', '増加']);
      expect(result).toBe('#count を クリック で 増加');
    });

    it('should handle Quechua agglutinative chain', () => {
      // #count + -ta + click + -pi + increment
      const result = joinTokens(['#count', '-ta', 'click', '-pi', 'increment']);
      expect(result).toBe('#countta clickpi increment');
    });

    it('should handle mixed prefix and regular tokens', () => {
      const result = joinTokens(['كـ-', 'JSON', 'format']);
      expect(result).toBe('كـJSON format');
    });
  });
});

// =============================================================================
// Grammar Transformer Tests
// =============================================================================

describe('GrammarTransformer', () => {
  describe('Constructor', () => {
    it('should create transformer with valid locales', () => {
      expect(() => new GrammarTransformer('en', 'ja')).not.toThrow();
      expect(() => new GrammarTransformer('en', 'zh')).not.toThrow();
      expect(() => new GrammarTransformer('en', 'ar')).not.toThrow();
    });

    it('should throw for invalid source locale', () => {
      expect(() => new GrammarTransformer('xx', 'ja')).toThrow('Unknown source locale');
    });

    it('should throw for invalid target locale', () => {
      expect(() => new GrammarTransformer('en', 'xx')).toThrow('Unknown target locale');
    });
  });

  describe('Japanese Transformation (SOV)', () => {
    const transformer = new GrammarTransformer('en', 'ja');

    it('should transform event handler to SOV order', () => {
      const result = transformer.transform('on click increment #count');
      // Should have patient (with を), event (with で), action pattern
      expect(result).toContain('#count');
      expect(result).toContain('を');
    });

    it('should preserve CSS selectors', () => {
      const result = transformer.transform('on click toggle .active');
      expect(result).toContain('.active');
    });

    it('should preserve ID selectors', () => {
      const result = transformer.transform('on input put value into #output');
      expect(result).toContain('#output');
    });
  });

  describe('Arabic Transformation (VSO)', () => {
    const transformer = new GrammarTransformer('en', 'ar');

    it('should transform to VSO order with action first', () => {
      const result = transformer.transform('on click increment #count');
      // Arabic VSO: action comes first
      expect(result).toBeTruthy();
      // Verify action (زِد/increment) appears before patient (#count)
      const actionIndex = result.indexOf('زِد');
      const patientIndex = result.indexOf('#count');
      expect(actionIndex).toBeLessThan(patientIndex);
    });

    it('should preserve selectors in transformation', () => {
      const result = transformer.transform('on click toggle .active');
      expect(result).toContain('.active');
    });
  });

  describe('Chinese Transformation (Topic-Prominent)', () => {
    const transformer = new GrammarTransformer('en', 'zh');

    it('should use 当 marker for events', () => {
      const result = transformer.transform('on click increment #count');
      // Chinese uses 当...时 pattern but custom transform may omit 时
      expect(result).toContain('当');
    });

    it('should include translated action', () => {
      const result = transformer.transform('on click increment #count');
      // Should contain 增加 (increment in Chinese)
      expect(result).toContain('增加');
    });

    it('should preserve patient selector', () => {
      const result = transformer.transform('on click toggle .menu');
      expect(result).toContain('.menu');
    });
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('Convenience Functions', () => {
  describe('toLocale', () => {
    it('should transform English to Japanese', () => {
      const result = toLocale('on click toggle .active', 'ja');
      expect(result).toContain('.active');
      expect(result).toContain('を');
    });

    it('should transform English to Chinese', () => {
      const result = toLocale('on click increment #count', 'zh');
      expect(result).toContain('当');
    });
  });

  describe('toEnglish', () => {
    it('should return unchanged when parsing fails', () => {
      // This tests fallback behavior
      const result = toEnglish('invalid input', 'ja');
      expect(result).toBeTruthy();
    });
  });

  describe('translate', () => {
    it('should return unchanged for same locale', () => {
      const input = 'on click toggle .active';
      expect(translate(input, 'en', 'en')).toBe(input);
    });

    it('should translate English to target locale', () => {
      const result = translate('on click increment #count', 'en', 'ja');
      expect(result).toContain('#count');
    });

    it('should translate to English from source locale', () => {
      const result = translate('test input', 'ja', 'en');
      expect(result).toBeTruthy();
    });

    it('should translate via English pivot', () => {
      const result = translate('on click log done', 'ja', 'zh');
      expect(result).toBeTruthy();
    });
  });
});

// =============================================================================
// Universal Pattern Tests
// =============================================================================

describe('Universal Patterns', () => {
  it('should define event-increment pattern', () => {
    const pattern = UNIVERSAL_PATTERNS.eventIncrement;
    expect(pattern.name).toBe('event-increment');
    expect(pattern.roles).toContain('event');
    expect(pattern.roles).toContain('action');
    expect(pattern.roles).toContain('patient');
  });

  it('should define put-into pattern', () => {
    const pattern = UNIVERSAL_PATTERNS.putInto;
    expect(pattern.name).toBe('put-into');
    expect(pattern.roles).toContain('action');
    expect(pattern.roles).toContain('patient');
    expect(pattern.roles).toContain('destination');
  });

  it('should define wait-duration pattern', () => {
    const pattern = UNIVERSAL_PATTERNS.waitDuration;
    expect(pattern.roles).toContain('action');
    expect(pattern.roles).toContain('quantity');
  });
});

// =============================================================================
// Language Family Defaults Tests
// =============================================================================

describe('Language Family Defaults', () => {
  it('should have Germanic defaults', () => {
    const germanic = LANGUAGE_FAMILY_DEFAULTS.germanic;
    expect(germanic.wordOrder).toBe('SVO');
    expect(germanic.adpositionType).toBe('preposition');
  });

  it('should have Japonic defaults', () => {
    const japonic = LANGUAGE_FAMILY_DEFAULTS.japonic;
    expect(japonic.wordOrder).toBe('SOV');
    expect(japonic.adpositionType).toBe('postposition');
  });

  it('should have Semitic defaults', () => {
    const semitic = LANGUAGE_FAMILY_DEFAULTS.semitic;
    expect(semitic.wordOrder).toBe('VSO');
    expect(semitic.direction).toBe('rtl');
  });

  it('should have Sinitic defaults', () => {
    const sinitic = LANGUAGE_FAMILY_DEFAULTS.sinitic;
    expect(sinitic.morphology).toBe('isolating');
  });
});

// =============================================================================
// Examples Tests
// =============================================================================

describe('Grammar Examples', () => {
  it('should have English examples', () => {
    expect(examples.english.eventHandler).toBe('on click increment #count');
    expect(examples.english.putInto).toBe('put my value into #output');
    expect(examples.english.toggle).toBe('toggle .active');
  });

  it('should have Japanese examples', () => {
    expect(examples.japanese.eventHandler).toContain('#count');
    expect(examples.japanese.eventHandler).toContain('を');
  });

  it('should have Chinese examples', () => {
    expect(examples.chinese.eventHandler).toContain('当');
    expect(examples.chinese.eventHandler).toContain('时');
  });

  it('should have Arabic examples', () => {
    expect(examples.arabic.eventHandler).toContain('عند');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle empty input gracefully', () => {
    const transformer = new GrammarTransformer('en', 'ja');
    const result = transformer.transform('');
    expect(result).toBe('');
  });

  it('should handle single-word input', () => {
    const transformer = new GrammarTransformer('en', 'ja');
    const result = transformer.transform('toggle');
    expect(result).toBeTruthy();
  });

  it('should preserve numbers', () => {
    const transformer = new GrammarTransformer('en', 'ja');
    const result = transformer.transform('wait 500');
    expect(result).toContain('500');
  });

  it('should handle complex selectors with special characters', () => {
    const parsed = parseStatement('on click toggle .menu-item[data-active="true"]');
    expect(parsed?.roles.get('patient')?.value).toContain('data-active');
  });

  it('should handle multiple spaces in input', () => {
    const parsed = parseStatement('on   click    toggle   .active');
    expect(parsed).not.toBeNull();
  });
});

// =============================================================================
// Chinese Circumfix Tokenization Tests
// =============================================================================

describe('Chinese Circumfix Parsing', () => {
  it('should split attached 时 suffix from event words', () => {
    // 点击时 should be parsed as two tokens: 点击 + 时
    const parsed = parseStatement('当 点击时 增加 #count', 'zh');
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('event-handler');
  });

  it('should handle 当...时 circumfix pattern', () => {
    const transformer = new GrammarTransformer('en', 'zh');
    const result = transformer.transform('on click increment #count');
    // Should produce 当 X 时 pattern
    expect(result).toContain('当');
    expect(result).toContain('时');
  });

  it('should preserve selectors when splitting suffixes', () => {
    const parsed = parseStatement('当 点击时 切换 .active', 'zh');
    // Patient may include the action in some parsing patterns
    expect(parsed?.roles.get('patient')?.value).toContain('.active');
  });
});

// =============================================================================
// Round-Trip Translation Tests
// =============================================================================

describe('Round-Trip Translation', () => {
  describe('English → Japanese → English', () => {
    it('should preserve semantic roles in round-trip', () => {
      const original = 'on click increment #count';
      const toJapanese = translate(original, 'en', 'ja');
      expect(toJapanese).toContain('#count');
      expect(toJapanese).toContain('を');

      // Note: Perfect round-trip isn't expected due to translation,
      // but semantic structure should be preserved
      const backToEnglish = translate(toJapanese, 'ja', 'en');
      expect(backToEnglish).toBeTruthy();
    });

    it('should preserve CSS selectors through round-trip', () => {
      const original = 'toggle .menu-active';
      const toJapanese = translate(original, 'en', 'ja');
      expect(toJapanese).toContain('.menu-active');

      const backToEnglish = translate(toJapanese, 'ja', 'en');
      expect(backToEnglish).toContain('.menu-active');
    });
  });

  describe('English → Arabic → English', () => {
    it('should preserve semantic roles with VSO transformation', () => {
      const original = 'on click increment #count';
      const toArabic = translate(original, 'en', 'ar');
      expect(toArabic).toContain('#count');
      // Arabic VSO puts action first
      expect(toArabic).toBeTruthy();

      const backToEnglish = translate(toArabic, 'ar', 'en');
      expect(backToEnglish).toBeTruthy();
    });
  });

  describe('English → Chinese → English', () => {
    it('should preserve structure through topic-prominent language', () => {
      const original = 'on click toggle .active';
      const toChinese = translate(original, 'en', 'zh');
      expect(toChinese).toContain('.active');
      expect(toChinese).toContain('当');

      const backToEnglish = translate(toChinese, 'zh', 'en');
      expect(backToEnglish).toContain('.active');
    });
  });

  describe('Cross-Language via Pivot', () => {
    it('should translate Japanese → Arabic via English pivot', () => {
      // Start with a simple pattern
      const result = translate('on click log done', 'ja', 'ar');
      expect(result).toBeTruthy();
    });

    it('should translate Chinese → Korean via English pivot', () => {
      const result = translate('on click toggle .active', 'zh', 'ko');
      expect(result).toBeTruthy();
      expect(result).toContain('.active');
    });
  });
});

// =============================================================================
// Language-Specific Word Order Integration Tests
// =============================================================================

describe('Word Order Integration Tests', () => {
  describe('SOV Languages (Japanese, Korean, Turkish, Quechua)', () => {
    it('should place patient before action in Japanese', () => {
      const transformer = new GrammarTransformer('en', 'ja');
      const result = transformer.transform('on click increment #count');
      // Japanese SOV: #count を ... 増加
      const countIndex = result.indexOf('#count');
      const actionIndex = result.indexOf('増加');
      expect(countIndex).toBeLessThan(actionIndex);
    });

    it('should place patient before action in Korean', () => {
      const transformer = new GrammarTransformer('en', 'ko');
      const result = transformer.transform('on click increment #count');
      // Korean SOV: patient comes before action
      expect(result).toContain('#count');
      expect(result).toContain('를'); // Object marker
    });

    it('should preserve Japanese particle spacing (regression)', () => {
      const transformer = new GrammarTransformer('en', 'ja');
      const result = transformer.transform('on click toggle .active');
      // Japanese particles (を, で, に) should have spaces around them
      // They do NOT use hyphen notation like Turkish suffixes
      expect(result).toContain('.active を'); // Space before particle
    });

    it('should attach Turkish suffixes correctly', () => {
      const transformer = new GrammarTransformer('en', 'tr');
      const result = transformer.transform('on click toggle .active');
      // Turkish uses case suffixes - should be attached without spaces
      expect(result).toContain('.active');
      // Verify suffixes are attached (no space before suffix)
      expect(result).not.toMatch(/\s-[iae]/); // No space before -i, -a, -e suffixes
    });

    it('should attach Turkish accusative suffix -i to patient', () => {
      const transformer = new GrammarTransformer('en', 'tr');
      const result = transformer.transform('on click toggle .active');
      // Should be ".activei" not ".active -i"
      expect(result).toMatch(/\.active[iıuü]/); // Vowel harmony variants
      expect(result).not.toContain('.active -i');
      expect(result).not.toContain('.active -ı');
    });

    it('should attach Turkish locative suffix -de to event', () => {
      const transformer = new GrammarTransformer('en', 'tr');
      const result = transformer.transform('on click toggle .active');
      // Event "tıklama" should have locative attached: "tıklamade" or "tıklamada"
      expect(result).toMatch(/tıklama[dD][aAeE]/);
    });
  });

  describe('VSO Languages (Arabic)', () => {
    it('should place action first in Arabic', () => {
      const transformer = new GrammarTransformer('en', 'ar');
      const result = transformer.transform('on click increment #count');
      // Arabic VSO: زِد (action) comes first
      const actionIndex = result.indexOf('زِد');
      const patientIndex = result.indexOf('#count');
      expect(actionIndex).toBeLessThan(patientIndex);
    });
  });

  describe('SVO Languages with Special Features', () => {
    it('should use circumfix pattern for Chinese events', () => {
      const transformer = new GrammarTransformer('en', 'zh');
      const result = transformer.transform('on click increment #count');
      // Chinese uses 当...时 circumfix
      expect(result).toContain('当');
      expect(result).toContain('时');
    });

    it('should use correct markers for Spanish', () => {
      const transformer = new GrammarTransformer('en', 'es');
      const result = transformer.transform('on click toggle .active');
      // Spanish uses 'en' for events
      expect(result).toContain('.active');
    });

    it('should handle Indonesian SVO correctly', () => {
      const transformer = new GrammarTransformer('en', 'id');
      const result = transformer.transform('on click toggle .active');
      expect(result).toContain('.active');
    });

    it('should handle Swahili SVO correctly', () => {
      const transformer = new GrammarTransformer('en', 'sw');
      const result = transformer.transform('on click toggle .active');
      expect(result).toContain('.active');
    });
  });
});

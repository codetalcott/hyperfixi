/**
 * Tests for Pattern Generator
 *
 * Verifies that the generator correctly produces patterns
 * from language profiles and command schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  // Language profiles
  englishProfile,
  japaneseProfile,
  arabicProfile,
  spanishProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  languageProfiles,
  getProfile,
  getSupportedLanguages,
  isLanguageSupported,

  // Command schemas
  toggleSchema,
  putSchema,
  onSchema,
  commandSchemas,
  getSchema,
  getSchemasByCategory,
  getDefinedSchemas,

  // Pattern generator
  generatePattern,
  generateSimplePattern,
  generatePatternVariants,
  generatePatternsForLanguage,
  generatePatternsForCommand,
  generateAllPatterns,
  getGeneratorSummary,
  validateLanguageKeywords,
} from '../src/generators';

// =============================================================================
// Language Profile Tests
// =============================================================================

describe('Language Profiles', () => {
  describe('Profile definitions', () => {
    it('should have all required properties', () => {
      const profiles = [
        englishProfile,
        japaneseProfile,
        arabicProfile,
        spanishProfile,
        koreanProfile,
        chineseProfile,
        turkishProfile,
      ];

      for (const profile of profiles) {
        expect(profile.code).toBeDefined();
        expect(profile.direction).toMatch(/^(ltr|rtl)$/);
        expect(profile.wordOrder).toMatch(/^(SVO|SOV|VSO)$/);
        expect(profile.markingStrategy).toBeDefined();
        expect(profile.roleMarkers).toBeDefined();
        expect(profile.keywords).toBeDefined();
      }
    });

    it('should define correct word orders', () => {
      expect(englishProfile.wordOrder).toBe('SVO');
      expect(japaneseProfile.wordOrder).toBe('SOV');
      expect(arabicProfile.wordOrder).toBe('VSO');
      expect(spanishProfile.wordOrder).toBe('SVO');
      expect(koreanProfile.wordOrder).toBe('SOV');
      expect(chineseProfile.wordOrder).toBe('SVO');
      expect(turkishProfile.wordOrder).toBe('SOV');
    });

    it('should define correct text directions', () => {
      expect(englishProfile.direction).toBe('ltr');
      expect(japaneseProfile.direction).toBe('ltr');
      expect(arabicProfile.direction).toBe('rtl');
      expect(spanishProfile.direction).toBe('ltr');
    });
  });

  describe('getProfile', () => {
    it('should return profile for valid language code', () => {
      expect(getProfile('en')).toBe(englishProfile);
      expect(getProfile('ja')).toBe(japaneseProfile);
      expect(getProfile('ar')).toBe(arabicProfile);
      expect(getProfile('es')).toBe(spanishProfile);
    });

    it('should return undefined for invalid language code', () => {
      expect(getProfile('invalid')).toBeUndefined();
      expect(getProfile('')).toBeUndefined();
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported language codes', () => {
      const languages = getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toContain('es');
      expect(languages).toContain('ko');
      expect(languages).toContain('zh');
      expect(languages).toContain('tr');
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(isLanguageSupported('en')).toBe(true);
      expect(isLanguageSupported('ja')).toBe(true);
      expect(isLanguageSupported('ar')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isLanguageSupported('invalid')).toBe(false);
      expect(isLanguageSupported('xx')).toBe(false);
    });
  });

  describe('Role markers', () => {
    it('should have destination markers for all languages', () => {
      expect(englishProfile.roleMarkers.destination).toBeDefined();
      expect(japaneseProfile.roleMarkers.destination).toBeDefined();
      expect(arabicProfile.roleMarkers.destination).toBeDefined();
      expect(spanishProfile.roleMarkers.destination).toBeDefined();
    });

    it('should use prepositions for SVO languages', () => {
      expect(englishProfile.roleMarkers.destination?.position).toBe('before');
      expect(spanishProfile.roleMarkers.destination?.position).toBe('before');
    });

    it('should use postpositions/particles for SOV languages', () => {
      expect(japaneseProfile.roleMarkers.destination?.position).toBe('after');
      expect(koreanProfile.roleMarkers.destination?.position).toBe('after');
      expect(turkishProfile.roleMarkers.destination?.position).toBe('after');
    });
  });

  describe('Keywords', () => {
    it('should have toggle keyword for core languages', () => {
      expect(englishProfile.keywords.toggle).toBeDefined();
      expect(japaneseProfile.keywords.toggle).toBeDefined();
      expect(arabicProfile.keywords.toggle).toBeDefined();
      expect(spanishProfile.keywords.toggle).toBeDefined();
    });

    it('should have correct English keywords', () => {
      expect(englishProfile.keywords.toggle?.primary).toBe('toggle');
      expect(englishProfile.keywords.add?.primary).toBe('add');
      expect(englishProfile.keywords.remove?.primary).toBe('remove');
    });

    it('should have correct Japanese keywords', () => {
      expect(japaneseProfile.keywords.toggle?.primary).toBe('切り替え');
      expect(japaneseProfile.keywords.add?.primary).toBe('追加');
      expect(japaneseProfile.keywords.show?.primary).toBe('表示');
    });

    it('should have keyword alternatives', () => {
      expect(japaneseProfile.keywords.toggle?.alternatives).toContain('切り替える');
      expect(japaneseProfile.keywords.toggle?.alternatives).toContain('トグル');
    });
  });
});

// =============================================================================
// Command Schema Tests
// =============================================================================

describe('Command Schemas', () => {
  describe('Schema definitions', () => {
    it('should have all required properties', () => {
      const schemas = getDefinedSchemas();

      for (const schema of schemas) {
        expect(schema.action).toBeDefined();
        expect(schema.category).toBeDefined();
        expect(schema.primaryRole).toBeDefined();
        expect(schema.roles).toBeDefined();
        expect(Array.isArray(schema.roles)).toBe(true);
      }
    });

    it('should define role positions', () => {
      for (const role of toggleSchema.roles) {
        expect(role.svoPosition).toBeDefined();
        expect(role.sovPosition).toBeDefined();
      }
    });
  });

  describe('getSchema', () => {
    it('should return schema for valid action', () => {
      expect(getSchema('toggle')).toBe(toggleSchema);
      expect(getSchema('put')).toBe(putSchema);
      expect(getSchema('on')).toBe(onSchema);
    });

    it('should return undefined for invalid action', () => {
      expect(getSchema('invalid' as any)).toBeUndefined();
    });
  });

  describe('getSchemasByCategory', () => {
    it('should return schemas for dom-class category', () => {
      const schemas = getSchemasByCategory('dom-class');
      expect(schemas.length).toBeGreaterThan(0);
      expect(schemas.every(s => s.category === 'dom-class')).toBe(true);
    });

    it('should return schemas for event category', () => {
      const schemas = getSchemasByCategory('event');
      expect(schemas.some(s => s.action === 'on')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const schemas = getSchemasByCategory('unknown' as any);
      expect(schemas).toEqual([]);
    });
  });

  describe('getDefinedSchemas', () => {
    it('should return all schemas', () => {
      const schemas = getDefinedSchemas();
      expect(schemas.length).toBeGreaterThanOrEqual(15);
    });

    it('should include core commands', () => {
      const schemas = getDefinedSchemas();
      const actions = schemas.map(s => s.action);
      expect(actions).toContain('toggle');
      expect(actions).toContain('add');
      expect(actions).toContain('remove');
      expect(actions).toContain('put');
      expect(actions).toContain('set');
      expect(actions).toContain('on');
    });
  });

  describe('Toggle schema specifics', () => {
    it('should have patient as primary role', () => {
      expect(toggleSchema.primaryRole).toBe('patient');
    });

    it('should have patient as required', () => {
      const patient = toggleSchema.roles.find(r => r.role === 'patient');
      expect(patient?.required).toBe(true);
    });

    it('should have destination as optional with default', () => {
      const dest = toggleSchema.roles.find(r => r.role === 'destination');
      expect(dest?.required).toBe(false);
      expect(dest?.default).toEqual({ type: 'reference', value: 'me' });
    });
  });
});

// =============================================================================
// Pattern Generator Tests
// =============================================================================

describe('Pattern Generator', () => {
  describe('generatePattern', () => {
    it('should generate a pattern for toggle in English', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);

      expect(pattern.id).toBe('toggle-en-generated');
      expect(pattern.language).toBe('en');
      expect(pattern.command).toBe('toggle');
      expect(pattern.template).toBeDefined();
      expect(pattern.extraction).toBeDefined();
    });

    it('should generate a pattern for toggle in Japanese', () => {
      const pattern = generatePattern(toggleSchema, japaneseProfile);

      expect(pattern.id).toBe('toggle-ja-generated');
      expect(pattern.language).toBe('ja');
      expect(pattern.command).toBe('toggle');
    });

    it('should throw for missing keyword translation', () => {
      const profileWithoutToggle = {
        ...englishProfile,
        keywords: {},
      };

      expect(() => generatePattern(toggleSchema, profileWithoutToggle))
        .toThrow("No keyword translation for 'toggle'");
    });

    it('should include verb in template tokens', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);
      const verbToken = pattern.template.tokens.find(
        t => t.type === 'literal' && t.value === 'toggle'
      );
      expect(verbToken).toBeDefined();
    });

    it('should include role tokens', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);
      const roleTokens = pattern.template.tokens.filter(t => t.type === 'role');
      expect(roleTokens.length).toBeGreaterThan(0);
    });
  });

  describe('generateSimplePattern', () => {
    it('should generate simple pattern for commands with optional roles', () => {
      const simple = generateSimplePattern(toggleSchema, englishProfile);

      expect(simple).not.toBeNull();
      expect(simple!.id).toBe('toggle-en-generated-simple');
    });

    it('should return null for commands with no optional roles', () => {
      const allRequiredSchema = {
        ...toggleSchema,
        roles: toggleSchema.roles.map(r => ({ ...r, required: true })),
      };

      const simple = generateSimplePattern(allRequiredSchema, englishProfile);
      expect(simple).toBeNull();
    });

    it('should have lower priority than full pattern', () => {
      const full = generatePattern(toggleSchema, englishProfile);
      const simple = generateSimplePattern(toggleSchema, englishProfile);

      expect(simple!.priority).toBeLessThan(full.priority);
    });
  });

  describe('generatePatternVariants', () => {
    it('should generate multiple variants', () => {
      const variants = generatePatternVariants(toggleSchema, englishProfile);

      expect(variants.length).toBeGreaterThan(1);
    });

    it('should include full and simple variants', () => {
      const variants = generatePatternVariants(toggleSchema, englishProfile);
      const ids = variants.map(v => v.id);

      expect(ids).toContain('toggle-en-generated');
      expect(ids).toContain('toggle-en-generated-simple');
    });
  });

  describe('generatePatternsForLanguage', () => {
    it('should generate patterns for all commands in a language', () => {
      const patterns = generatePatternsForLanguage(englishProfile);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.language === 'en')).toBe(true);
    });

    it('should skip commands without keyword translations', () => {
      const limitedProfile = {
        ...englishProfile,
        keywords: { toggle: englishProfile.keywords.toggle },
      };

      const patterns = generatePatternsForLanguage(limitedProfile);
      expect(patterns.every(p => p.command === 'toggle')).toBe(true);
    });
  });

  describe('generatePatternsForCommand', () => {
    it('should generate patterns across all languages', () => {
      const patterns = generatePatternsForCommand(toggleSchema);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.command === 'toggle')).toBe(true);

      const languages = [...new Set(patterns.map(p => p.language))];
      expect(languages.length).toBeGreaterThan(1);
    });
  });

  describe('generateAllPatterns', () => {
    it('should generate patterns for all commands in all languages', () => {
      const patterns = generateAllPatterns();

      expect(patterns.length).toBeGreaterThan(50);
    });

    it('should have unique pattern IDs', () => {
      const patterns = generateAllPatterns();
      const ids = patterns.map(p => p.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should cover multiple languages', () => {
      const patterns = generateAllPatterns();
      const languages = [...new Set(patterns.map(p => p.language))];

      expect(languages).toContain('en');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toContain('es');
    });

    it('should cover multiple commands', () => {
      const patterns = generateAllPatterns();
      const commands = [...new Set(patterns.map(p => p.command))];

      expect(commands).toContain('toggle');
      expect(commands).toContain('add');
      expect(commands).toContain('remove');
    });
  });

  describe('Word order handling', () => {
    it('should place verb first for SVO (English)', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);
      const firstToken = pattern.template.tokens[0];

      expect(firstToken.type).toBe('literal');
      expect((firstToken as any).value).toBe('toggle');
    });

    it('should place verb last for SOV (Japanese)', () => {
      const pattern = generatePattern(toggleSchema, japaneseProfile);
      const lastToken = pattern.template.tokens[pattern.template.tokens.length - 1];

      expect(lastToken.type).toBe('literal');
      expect((lastToken as any).value).toBe('切り替え');
    });

    it('should place verb first for VSO (Arabic)', () => {
      const pattern = generatePattern(toggleSchema, arabicProfile);
      const firstToken = pattern.template.tokens[0];

      expect(firstToken.type).toBe('literal');
      // Accept either diacritic form: بدّل (with shadda) or بدل (without)
      const value = (firstToken as any).value;
      const alts = (firstToken as any).alternatives || [];
      expect(
        value === 'بدّل' || value === 'بدل' || alts.includes('بدّل') || alts.includes('بدل')
      ).toBe(true);
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Utility Functions', () => {
  describe('getGeneratorSummary', () => {
    it('should return language count', () => {
      const summary = getGeneratorSummary();
      expect(summary.languages.length).toBeGreaterThanOrEqual(4);
    });

    it('should return command count', () => {
      const summary = getGeneratorSummary();
      expect(summary.commands.length).toBeGreaterThanOrEqual(15);
    });

    it('should estimate total patterns', () => {
      const summary = getGeneratorSummary();
      expect(summary.totalPatterns).toBeGreaterThan(50);
    });
  });

  describe('validateLanguageKeywords', () => {
    it('should identify available keywords', () => {
      const result = validateLanguageKeywords(englishProfile);
      expect(result.available).toContain('toggle');
      expect(result.available).toContain('add');
    });

    it('should identify missing keywords', () => {
      const limitedProfile = {
        ...englishProfile,
        keywords: { toggle: englishProfile.keywords.toggle },
      };

      const result = validateLanguageKeywords(limitedProfile);
      expect(result.missing).toContain('add');
      expect(result.available).toContain('toggle');
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Generator Integration', () => {
  it('should generate consistent patterns across languages', () => {
    const enPattern = generatePattern(toggleSchema, englishProfile);
    const jaPattern = generatePattern(toggleSchema, japaneseProfile);
    const arPattern = generatePattern(toggleSchema, arabicProfile);

    // Same command
    expect(enPattern.command).toBe(jaPattern.command);
    expect(jaPattern.command).toBe(arPattern.command);

    // Different languages
    expect(enPattern.language).not.toBe(jaPattern.language);
    expect(jaPattern.language).not.toBe(arPattern.language);

    // All have extraction rules
    expect(enPattern.extraction).toBeDefined();
    expect(jaPattern.extraction).toBeDefined();
    expect(arPattern.extraction).toBeDefined();
  });

  it('should handle all defined schemas', () => {
    const schemas = getDefinedSchemas();

    for (const schema of schemas) {
      // Should work with at least English
      if (englishProfile.keywords[schema.action]) {
        const pattern = generatePattern(schema, englishProfile);
        expect(pattern.command).toBe(schema.action);
        expect(pattern.language).toBe('en');
      }
    }
  });
});

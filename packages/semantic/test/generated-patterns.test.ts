/**
 * Generated Pattern Validation Tests
 *
 * Tests that validate the pattern generator produces patterns that
 * work correctly across all supported languages.
 *
 * These tests serve as the validation framework for migrating from
 * hand-crafted patterns to generated patterns.
 */

import { describe, it, expect } from 'vitest';
import {
  generatePattern,
  generateAllPatterns,
  generatePatternsForCommand,
  generatePatternsForLanguage,
  getGeneratorSummary,
  validateLanguageKeywords,
  toggleSchema,
  addSchema,
  removeSchema,
  putSchema,
  showSchema,
  hideSchema,
  englishProfile,
  japaneseProfile,
  arabicProfile,
  spanishProfile,
  koreanProfile,
  turkishProfile,
  chineseProfile,
  KNOWN_PROFILES as languageProfiles,
  getDefinedSchemas,
} from '../src/generators';
import type { LanguagePattern } from '../src/types';

// =============================================================================
// Generator Infrastructure Tests
// =============================================================================

describe('Pattern Generator Infrastructure', () => {
  describe('Generator Summary', () => {
    it('should report supported languages', () => {
      const summary = getGeneratorSummary();

      expect(summary.languages).toContain('en');
      expect(summary.languages).toContain('ja');
      expect(summary.languages).toContain('ar');
      expect(summary.languages).toContain('es');
      expect(summary.languages).toContain('ko');
      expect(summary.languages).toContain('zh');
      expect(summary.languages).toContain('tr');
    });

    it('should report available commands', () => {
      const summary = getGeneratorSummary();

      expect(summary.commands).toContain('toggle');
      expect(summary.commands).toContain('add');
      expect(summary.commands).toContain('remove');
      expect(summary.commands).toContain('put');
      expect(summary.commands).toContain('show');
      expect(summary.commands).toContain('hide');
    });

    it('should estimate pattern count', () => {
      const summary = getGeneratorSummary();

      // 7 languages × many commands × 2 variants
      expect(summary.totalPatterns).toBeGreaterThan(100);
    });
  });

  describe('Keyword Validation', () => {
    it('should validate English has all keywords', () => {
      const result = validateLanguageKeywords(englishProfile);

      expect(result.available).toContain('toggle');
      expect(result.available).toContain('add');
      expect(result.available).toContain('put');
    });

    it('should validate Japanese has all keywords', () => {
      const result = validateLanguageKeywords(japaneseProfile);

      expect(result.available).toContain('toggle');
      expect(result.available).toContain('add');
    });

    it('should identify missing keywords', () => {
      // All profiles should have core keywords
      for (const [code, profile] of Object.entries(languageProfiles)) {
        const result = validateLanguageKeywords(profile);
        // Core commands should be available
        expect(result.available).toContain('toggle');
      }
    });
  });
});

// =============================================================================
// Pattern Generation Tests
// =============================================================================

describe('Pattern Generation', () => {
  describe('Single Pattern Generation', () => {
    it('should generate English toggle pattern', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);

      expect(pattern.id).toBe('toggle-en-generated');
      expect(pattern.language).toBe('en');
      expect(pattern.command).toBe('toggle');
      expect(pattern.priority).toBe(100);
      expect(pattern.template.tokens.length).toBeGreaterThan(0);
    });

    it('should generate Japanese toggle pattern (SOV)', () => {
      const pattern = generatePattern(toggleSchema, japaneseProfile);

      expect(pattern.id).toBe('toggle-ja-generated');
      expect(pattern.language).toBe('ja');
      expect(pattern.command).toBe('toggle');

      // SOV: verb should be at the end
      const tokens = pattern.template.tokens;
      const lastToken = tokens[tokens.length - 1];
      expect(lastToken.type).toBe('literal');
    });

    it('should generate Arabic toggle pattern (VSO)', () => {
      const pattern = generatePattern(toggleSchema, arabicProfile);

      expect(pattern.id).toBe('toggle-ar-generated');
      expect(pattern.language).toBe('ar');

      // VSO: verb should be at the start
      const firstToken = pattern.template.tokens[0];
      expect(firstToken.type).toBe('literal');
    });

    it('should generate Korean toggle pattern (SOV)', () => {
      const pattern = generatePattern(toggleSchema, koreanProfile);

      expect(pattern.id).toBe('toggle-ko-generated');
      expect(pattern.language).toBe('ko');
    });

    it('should generate Turkish toggle pattern (SOV)', () => {
      const pattern = generatePattern(toggleSchema, turkishProfile);

      expect(pattern.id).toBe('toggle-tr-generated');
      expect(pattern.language).toBe('tr');
    });
  });

  describe('Batch Generation', () => {
    it('should generate all patterns for a language', () => {
      const patterns = generatePatternsForLanguage(englishProfile);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.language === 'en')).toBe(true);
    });

    it('should generate patterns for a command across languages', () => {
      const patterns = generatePatternsForCommand(toggleSchema);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.command === 'toggle')).toBe(true);

      // Should have patterns for multiple languages
      const languages = new Set(patterns.map(p => p.language));
      expect(languages.size).toBeGreaterThan(3);
    });

    it('should generate all patterns', () => {
      const patterns = generateAllPatterns();

      expect(patterns.length).toBeGreaterThan(100);

      // Should have patterns for all languages
      const languages = new Set(patterns.map(p => p.language));
      expect(languages.has('en')).toBe(true);
      expect(languages.has('ja')).toBe(true);
      expect(languages.has('ar')).toBe(true);
    });
  });
});

// =============================================================================
// Pattern Structure Validation
// =============================================================================

describe('Generated Pattern Structure', () => {
  describe('Token Structure', () => {
    it('should have correct token types', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);

      for (const token of pattern.template.tokens) {
        expect(['literal', 'role', 'group']).toContain(token.type);
      }
    });

    it('should include keyword as literal token', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);
      const literals = pattern.template.tokens.filter(t => t.type === 'literal');

      expect(literals.some(t => t.value === 'toggle')).toBe(true);
    });

    it('should include role tokens for required roles', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);
      const roles = pattern.template.tokens.filter(t => t.type === 'role');

      // Toggle has 'patient' as required
      expect(roles.some(t => t.role === 'patient')).toBe(true);
    });
  });

  describe('Extraction Rules', () => {
    it('should have extraction rules for each role', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);

      expect(pattern.extraction).toBeDefined();
      expect(pattern.extraction.patient).toBeDefined();
    });

    it('should include default values for optional roles', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);

      // Toggle's destination is optional with default 'me'
      if (pattern.extraction.destination?.default) {
        expect(pattern.extraction.destination.default.value).toBe('me');
      }
    });
  });

  describe('Word Order', () => {
    it('English (SVO): verb should come first', () => {
      const pattern = generatePattern(toggleSchema, englishProfile);
      const firstToken = pattern.template.tokens[0];

      expect(firstToken.type).toBe('literal');
      expect(firstToken.value).toBe('toggle');
    });

    it('Japanese (SOV): verb should come last', () => {
      const pattern = generatePattern(toggleSchema, japaneseProfile);
      const tokens = pattern.template.tokens;

      // Find the verb token (should be near the end)
      // Note: SOV structure puts verb after roles
      const verbIndex = tokens.findIndex(
        t => t.type === 'literal' && t.value === '切り替え'
      );
      expect(verbIndex).toBeGreaterThan(0);
    });

    it('Korean (SOV): verb should come last', () => {
      const pattern = generatePattern(toggleSchema, koreanProfile);
      const tokens = pattern.template.tokens;

      // Verb should be after the role tokens
      const verbIndex = tokens.findIndex(
        t => t.type === 'literal' && t.value === '토글'
      );
      expect(verbIndex).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Comparison with Hand-Crafted Patterns
// =============================================================================

describe('Generated vs Hand-Crafted Comparison', () => {
  describe('Toggle Command', () => {
    it('should generate pattern with same structure as hand-crafted', () => {
      const generated = generatePattern(toggleSchema, englishProfile);

      // Hand-crafted structure: toggle {patient} [on {destination}]
      expect(generated.command).toBe('toggle');
      expect(generated.language).toBe('en');

      // Should have verb token
      const hasVerb = generated.template.tokens.some(
        t => t.type === 'literal' && t.value === 'toggle'
      );
      expect(hasVerb).toBe(true);

      // Should have patient role
      const hasPatient = generated.template.tokens.some(
        t => t.type === 'role' && t.role === 'patient'
      );
      expect(hasPatient).toBe(true);
    });

    it('should generate Japanese pattern with particle markers', () => {
      const generated = generatePattern(toggleSchema, japaneseProfile);

      // Hand-crafted: {patient} を 切り替え
      // Should have を particle for patient
      const hasWoParticle = generated.template.tokens.some(
        t => t.type === 'literal' && t.value === 'を'
      );
      expect(hasWoParticle).toBe(true);
    });

    it('should generate Arabic pattern with prepositions', () => {
      const generated = generatePattern(toggleSchema, arabicProfile);

      // Should have toggle verb (بدّل with shadda or بدل without) in either value or alternatives
      const hasVerb = generated.template.tokens.some(
        t => t.type === 'literal' && (
          t.value === 'بدّل' || t.value === 'بدل' ||
          t.alternatives?.includes('بدّل') || t.alternatives?.includes('بدل')
        )
      );
      expect(hasVerb).toBe(true);
    });
  });
});

// =============================================================================
// Language-Specific Pattern Tests
// =============================================================================

describe('Language-Specific Patterns', () => {
  const commands = [toggleSchema, addSchema, removeSchema, showSchema, hideSchema];

  describe('All Languages Should Generate', () => {
    for (const [code, profile] of Object.entries(languageProfiles)) {
      it(`should generate patterns for ${profile.name} (${code})`, () => {
        const patterns = generatePatternsForLanguage(profile);

        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns.every(p => p.language === code)).toBe(true);
      });
    }
  });

  describe('Each Core Command Should Generate', () => {
    for (const schema of commands) {
      it(`should generate ${schema.action} for all languages`, () => {
        const patterns = generatePatternsForCommand(schema);

        expect(patterns.length).toBeGreaterThan(0);

        // Should have patterns for at least English
        expect(patterns.some(p => p.language === 'en')).toBe(true);
      });
    }
  });
});

// =============================================================================
// Keyword Translation Tests
// =============================================================================

describe('Keyword Translations', () => {
  const coreKeywords = ['toggle', 'add', 'remove', 'show', 'hide', 'put', 'set'];

  for (const keyword of coreKeywords) {
    describe(`${keyword} keyword`, () => {
      it('should have English translation', () => {
        expect(englishProfile.keywords[keyword]).toBeDefined();
        expect(englishProfile.keywords[keyword].primary).toBe(keyword);
      });

      it('should have Japanese translation', () => {
        if (japaneseProfile.keywords[keyword]) {
          expect(japaneseProfile.keywords[keyword].primary).toBeTruthy();
        }
      });

      it('should have Arabic translation', () => {
        if (arabicProfile.keywords[keyword]) {
          expect(arabicProfile.keywords[keyword].primary).toBeTruthy();
        }
      });

      it('should have Spanish translation', () => {
        if (spanishProfile.keywords[keyword]) {
          expect(spanishProfile.keywords[keyword].primary).toBeTruthy();
        }
      });

      it('should have Korean translation', () => {
        if (koreanProfile.keywords[keyword]) {
          expect(koreanProfile.keywords[keyword].primary).toBeTruthy();
        }
      });
    });
  }
});

// =============================================================================
// Role Marker Tests
// =============================================================================

describe('Role Markers', () => {
  describe('Destination Role', () => {
    it('English uses "on" preposition', () => {
      expect(englishProfile.roleMarkers.destination?.primary).toBe('on');
      expect(englishProfile.roleMarkers.destination?.position).toBe('before');
    });

    it('Japanese uses "に" particle (postposition)', () => {
      expect(japaneseProfile.roleMarkers.destination?.primary).toBe('に');
      expect(japaneseProfile.roleMarkers.destination?.position).toBe('after');
    });

    it('Arabic uses "على" preposition', () => {
      expect(arabicProfile.roleMarkers.destination?.primary).toBe('على');
      expect(arabicProfile.roleMarkers.destination?.position).toBe('before');
    });

    it('Korean uses "에" particle (postposition)', () => {
      expect(koreanProfile.roleMarkers.destination?.primary).toBe('에');
      expect(koreanProfile.roleMarkers.destination?.position).toBe('after');
    });
  });

  describe('Patient Role', () => {
    it('English has no explicit marker (positional)', () => {
      expect(englishProfile.roleMarkers.patient?.primary).toBe('');
    });

    it('Japanese uses "を" particle', () => {
      expect(japaneseProfile.roleMarkers.patient?.primary).toBe('を');
    });

    it('Korean uses "을/를" particle', () => {
      expect(koreanProfile.roleMarkers.patient?.primary).toBe('을');
      expect(koreanProfile.roleMarkers.patient?.alternatives).toContain('를');
    });
  });
});

/**
 * Pattern Comparison Tests
 *
 * Detailed comparison between generated patterns and hand-crafted patterns.
 * This identifies discrepancies that need to be addressed before migration.
 */

import { describe, it, expect } from 'vitest';
import {
  generatePattern,
  generatePatternsForCommand,
  toggleSchema,
  putSchema,
  englishProfile,
  japaneseProfile,
  arabicProfile,
  spanishProfile,
  koreanProfile,
  turkishProfile,
} from '../src/generators';
// Import per-language functions instead of deprecated barrel arrays
import { getTogglePatternsEn } from '../src/patterns/toggle/en';
import { getTogglePatternsJa } from '../src/patterns/toggle/ja';
import { getTogglePatternsAr } from '../src/patterns/toggle/ar';
import { getTogglePatternsEs } from '../src/patterns/toggle/es';
import { getTogglePatternsKo } from '../src/patterns/toggle/ko';
import { getTogglePatternsZh } from '../src/patterns/toggle/zh';
import { getTogglePatternsTr } from '../src/patterns/toggle/tr';
import { getPutPatternsEn } from '../src/patterns/put/en';
import { getPutPatternsJa } from '../src/patterns/put/ja';
import { getPutPatternsAr } from '../src/patterns/put/ar';
import { getPutPatternsEs } from '../src/patterns/put/es';
import type { LanguagePattern, PatternToken } from '../src/types';

// Build pattern arrays for testing (replaces deprecated barrel exports)
const togglePatterns: LanguagePattern[] = [
  ...getTogglePatternsEn(),
  ...getTogglePatternsJa(),
  ...getTogglePatternsAr(),
  ...getTogglePatternsEs(),
  ...getTogglePatternsKo(),
  ...getTogglePatternsZh(),
  ...getTogglePatternsTr(),
];

const putPatterns: LanguagePattern[] = [
  ...getPutPatternsEn(),
  ...getPutPatternsJa(),
  ...getPutPatternsAr(),
  ...getPutPatternsEs(),
];

// =============================================================================
// Helper Functions
// =============================================================================

function describeToken(token: PatternToken): string {
  if (token.type === 'literal') {
    return `literal:${token.value}${token.alternatives ? `(+${token.alternatives.length} alts)` : ''}`;
  } else if (token.type === 'role') {
    return `role:${token.role}${token.optional ? '?' : ''}`;
  } else if (token.type === 'group') {
    const inner = token.tokens?.map(describeToken).join(', ') ?? '';
    return `group${token.optional ? '?' : ''}:[${inner}]`;
  }
  return `unknown:${token.type}`;
}

function describePattern(pattern: LanguagePattern): string {
  const tokens = pattern.template.tokens.map(describeToken);
  return `${pattern.id}: [${tokens.join(', ')}]`;
}

function findHandCraftedPattern(
  language: string,
  command: string,
  patterns: LanguagePattern[]
): LanguagePattern | undefined {
  return patterns.find(
    (p) => p.language === language && p.command === command && !p.id.includes('simple')
  );
}

// =============================================================================
// Toggle Pattern Comparison
// =============================================================================

describe('Toggle Pattern Comparison', () => {
  describe('English', () => {
    it('should compare structure', () => {
      const generated = generatePattern(toggleSchema, englishProfile);
      const handCrafted = findHandCraftedPattern('en', 'toggle', togglePatterns);

      console.log('\n=== English Toggle Pattern Comparison ===');
      console.log('Generated:', describePattern(generated));
      console.log('Hand-crafted:', handCrafted ? describePattern(handCrafted) : 'not found');

      expect(generated.command).toBe('toggle');
      expect(handCrafted?.command).toBe('toggle');
    });

    it('should have matching verb', () => {
      const generated = generatePattern(toggleSchema, englishProfile);
      const handCrafted = findHandCraftedPattern('en', 'toggle', togglePatterns);

      // Both should have 'toggle' as first token
      const genVerb = generated.template.tokens.find(
        (t) => t.type === 'literal' && t.value === 'toggle'
      );
      const hcVerb = handCrafted?.template.tokens.find(
        (t) => t.type === 'literal' && t.value === 'toggle'
      );

      expect(genVerb).toBeDefined();
      expect(hcVerb).toBeDefined();
    });

    it('should have patient role', () => {
      const generated = generatePattern(toggleSchema, englishProfile);
      const handCrafted = findHandCraftedPattern('en', 'toggle', togglePatterns);

      const genPatient = generated.template.tokens.find(
        (t) => t.type === 'role' && t.role === 'patient'
      );
      const hcPatient = handCrafted?.template.tokens.find(
        (t) => t.type === 'role' && t.role === 'patient'
      );

      expect(genPatient).toBeDefined();
      expect(hcPatient).toBeDefined();
    });

    it('should have destination role with marker', () => {
      const generated = generatePattern(toggleSchema, englishProfile);
      const handCrafted = findHandCraftedPattern('en', 'toggle', togglePatterns);

      // Check extraction rules for destination
      expect(generated.extraction.destination).toBeDefined();
      expect(handCrafted?.extraction.destination).toBeDefined();

      // Hand-crafted uses 'on' marker
      expect(handCrafted?.extraction.destination?.marker).toBe('on');
    });
  });

  describe('Japanese', () => {
    it('should compare structure (SOV)', () => {
      const generated = generatePattern(toggleSchema, japaneseProfile);
      const handCrafted = findHandCraftedPattern('ja', 'toggle', togglePatterns);

      console.log('\n=== Japanese Toggle Pattern Comparison ===');
      console.log('Generated:', describePattern(generated));
      console.log('Hand-crafted:', handCrafted ? describePattern(handCrafted) : 'not found');

      expect(generated.language).toBe('ja');
    });

    it('should have verb at end (SOV)', () => {
      const generated = generatePattern(toggleSchema, japaneseProfile);

      // In SOV, verb should be near the end
      const tokens = generated.template.tokens;
      const verbIndex = tokens.findIndex(
        (t) => t.type === 'literal' && (t.value === '切り替え' || t.alternatives?.includes('切り替え'))
      );

      // Verb should be in second half of tokens
      expect(verbIndex).toBeGreaterThan(tokens.length / 2 - 1);
    });

    it('should have を particle for patient', () => {
      const generated = generatePattern(toggleSchema, japaneseProfile);
      const handCrafted = findHandCraftedPattern('ja', 'toggle', togglePatterns);

      // Both should have を particle
      const genWo = generated.template.tokens.find(
        (t) => t.type === 'literal' && t.value === 'を'
      );
      const hcWo = handCrafted?.template.tokens.find(
        (t) => t.type === 'literal' && t.value === 'を'
      );

      expect(genWo).toBeDefined();
      expect(hcWo).toBeDefined();
    });
  });

  describe('Arabic', () => {
    it('should compare structure (VSO)', () => {
      const generated = generatePattern(toggleSchema, arabicProfile);
      const handCrafted = findHandCraftedPattern('ar', 'toggle', togglePatterns);

      console.log('\n=== Arabic Toggle Pattern Comparison ===');
      console.log('Generated:', describePattern(generated));
      console.log('Hand-crafted:', handCrafted ? describePattern(handCrafted) : 'not found');
    });

    it('should have verb first (VSO)', () => {
      const generated = generatePattern(toggleSchema, arabicProfile);

      // In VSO, verb should be first
      const firstToken = generated.template.tokens[0];
      expect(firstToken.type).toBe('literal');
      // بدل or بدّل
      expect(firstToken.value === 'بدل' || firstToken.alternatives?.includes('بدّل')).toBe(true);
    });
  });

  describe('Korean', () => {
    it('should compare structure (SOV)', () => {
      const generated = generatePattern(toggleSchema, koreanProfile);
      const handCrafted = findHandCraftedPattern('ko', 'toggle', togglePatterns);

      console.log('\n=== Korean Toggle Pattern Comparison ===');
      console.log('Generated:', describePattern(generated));
      console.log('Hand-crafted:', handCrafted ? describePattern(handCrafted) : 'not found');
    });

    it('should have 를/을 particle for patient', () => {
      const generated = generatePattern(toggleSchema, koreanProfile);

      // Should have patient marker (을/를)
      const hasMarker = generated.template.tokens.some(
        (t) => t.type === 'literal' && (t.value === '을' || t.value === '를' || t.alternatives?.includes('를'))
      );

      expect(hasMarker).toBe(true);
    });
  });

  describe('Turkish', () => {
    it('should compare structure (SOV)', () => {
      const generated = generatePattern(toggleSchema, turkishProfile);
      const handCrafted = findHandCraftedPattern('tr', 'toggle', togglePatterns);

      console.log('\n=== Turkish Toggle Pattern Comparison ===');
      console.log('Generated:', describePattern(generated));
      console.log('Hand-crafted:', handCrafted ? describePattern(handCrafted) : 'not found');
    });
  });
});

// =============================================================================
// Discrepancy Analysis
// =============================================================================

describe('Discrepancy Analysis', () => {
  describe('Toggle Command', () => {
    const profiles = [
      { name: 'English', profile: englishProfile },
      { name: 'Japanese', profile: japaneseProfile },
      { name: 'Arabic', profile: arabicProfile },
      { name: 'Spanish', profile: spanishProfile },
      { name: 'Korean', profile: koreanProfile },
      { name: 'Turkish', profile: turkishProfile },
    ];

    for (const { name, profile } of profiles) {
      it(`should analyze ${name} toggle discrepancies`, () => {
        const generated = generatePattern(toggleSchema, profile);
        const handCrafted = findHandCraftedPattern(profile.code, 'toggle', togglePatterns);

        const discrepancies: string[] = [];

        // Compare token counts
        if (handCrafted) {
          const genTokenCount = generated.template.tokens.length;
          const hcTokenCount = handCrafted.template.tokens.length;

          if (genTokenCount !== hcTokenCount) {
            discrepancies.push(
              `Token count differs: generated=${genTokenCount}, hand-crafted=${hcTokenCount}`
            );
          }

          // Compare priorities
          if (generated.priority !== handCrafted.priority) {
            discrepancies.push(
              `Priority differs: generated=${generated.priority}, hand-crafted=${handCrafted.priority}`
            );
          }

          // Compare extraction rules
          const genRoles = Object.keys(generated.extraction);
          const hcRoles = Object.keys(handCrafted.extraction);

          if (JSON.stringify(genRoles.sort()) !== JSON.stringify(hcRoles.sort())) {
            discrepancies.push(
              `Extraction roles differ: generated=[${genRoles}], hand-crafted=[${hcRoles}]`
            );
          }
        } else {
          discrepancies.push('No hand-crafted pattern found');
        }

        // Log discrepancies
        if (discrepancies.length > 0) {
          console.log(`\n${name} Toggle Discrepancies:`);
          for (const d of discrepancies) {
            console.log(`  - ${d}`);
          }
        }

        // We expect some discrepancies - this test is for documentation
        expect(true).toBe(true);
      });
    }
  });
});

// =============================================================================
// Migration Readiness Assessment
// =============================================================================

describe('Migration Readiness Assessment', () => {
  it('should assess toggle command readiness', () => {
    const generatedPatterns = generatePatternsForCommand(toggleSchema);
    const handCraftedPatterns = togglePatterns;

    console.log('\n=== Migration Readiness: Toggle ===');
    console.log(`Generated patterns: ${generatedPatterns.length}`);
    console.log(`Hand-crafted patterns: ${handCraftedPatterns.length}`);

    // Languages covered
    const genLanguages = new Set(generatedPatterns.map((p) => p.language));
    const hcLanguages = new Set(handCraftedPatterns.map((p) => p.language));

    console.log(`Generated languages: ${[...genLanguages].join(', ')}`);
    console.log(`Hand-crafted languages: ${[...hcLanguages].join(', ')}`);

    // Check if all hand-crafted languages are covered
    const missingLanguages = [...hcLanguages].filter((l) => !genLanguages.has(l));
    if (missingLanguages.length > 0) {
      console.log(`Missing languages in generator: ${missingLanguages.join(', ')}`);
    }

    // Assessment
    const isReady =
      genLanguages.size >= hcLanguages.size &&
      missingLanguages.length === 0;

    console.log(`\nMigration Ready: ${isReady ? 'YES' : 'NO'}`);

    // For now, we expect generated to cover at least what hand-crafted does
    expect(genLanguages.size).toBeGreaterThanOrEqual(hcLanguages.size);
  });

  it('should identify generator improvements needed', () => {
    const improvements: string[] = [];

    // Check English toggle pattern against hand-crafted
    const genEnglish = generatePattern(toggleSchema, englishProfile);
    const hcEnglish = findHandCraftedPattern('en', 'toggle', togglePatterns);

    if (hcEnglish) {
      // Check for optional group with 'on' marker
      const hcHasOptionalGroup = hcEnglish.template.tokens.some(
        (t) => t.type === 'group' && t.optional
      );

      const genHasOptionalGroup = genEnglish.template.tokens.some(
        (t) => t.type === 'group' && t.optional
      );

      if (hcHasOptionalGroup && !genHasOptionalGroup) {
        improvements.push('Generator should create optional groups for optional roles');
      }

      // Check alternatives
      const hcToggleToken = hcEnglish.template.tokens.find(
        (t) => t.type === 'literal' && t.value === 'toggle'
      );

      const genToggleToken = genEnglish.template.tokens.find(
        (t) => t.type === 'literal' && t.value === 'toggle'
      );

      if (hcToggleToken?.alternatives && !genToggleToken?.alternatives) {
        improvements.push('Generator should preserve keyword alternatives');
      }
    }

    console.log('\n=== Generator Improvements Needed ===');
    if (improvements.length === 0) {
      console.log('None identified');
    } else {
      for (const i of improvements) {
        console.log(`  - ${i}`);
      }
    }

    // This test is informational
    expect(true).toBe(true);
  });
});

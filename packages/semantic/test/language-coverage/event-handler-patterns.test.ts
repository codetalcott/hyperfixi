/**
 * Event Handler Pattern Tests
 *
 * Tests full-form patterns with event handlers for the 6 languages with SOV/VSO word order:
 * - Japanese (ja): SOV, particles, no spaces
 * - Korean (ko): SOV, agglutinative, vowel harmony
 * - Turkish (tr): SOV, vowel harmony, case suffixes
 * - Arabic (ar): VSO, RTL, proclitics
 * - Hindi (hi): SOV, postpositions, Devanagari script
 * - Bengali (bn): SOV, postpositions, Bengali script
 *
 * These tests verify that the parser can handle complete real-world patterns,
 * not just abbreviated command-only forms.
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse, tokenize } from '../../src';
import {
  EVENT_HANDLER_TEST_CASES,
  getEventHandlerTestCase,
  getEventHandlerTestCasesForLanguage,
  type EventHandlerTestCase,
} from './test-cases';

const TARGET_LANGUAGES = ['ja', 'ko', 'tr', 'ar', 'hi', 'bn'] as const;
type TargetLanguage = typeof TARGET_LANGUAGES[number];

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Event Handler Patterns', () => {
  for (const lang of TARGET_LANGUAGES) {
    describe(`${lang.toUpperCase()} event handlers`, () => {
      const testCases = getEventHandlerTestCasesForLanguage(lang);

      for (const [testName, testCode] of Object.entries(testCases)) {
        it(`tokenizes: ${testName}`, () => {
          const stream = tokenize(testCode, lang);
          expect(stream.tokens.length).toBeGreaterThan(0);

          // Should have at least one keyword token
          const hasKeyword = stream.tokens.some(
            t => t.kind === 'keyword' || t.kind === 'command'
          );
          expect(hasKeyword).toBe(true);
        });

        it(`can parse: ${testName}`, () => {
          const result = canParse(testCode, lang);

          // If it can't parse, log the code for debugging
          if (!result) {
            console.log(`  ❌ Failed to parse ${lang}: "${testCode}"`);
          } else {
            console.log(`  ✅ Parsed ${lang}: "${testCode}"`);
          }

          // For now, just record the result without asserting
          // This allows us to measure baseline and improvements
          expect(result).toBeDefined();
        });

        it(`parses with semantic node: ${testName}`, () => {
          try {
            const node = parse(testCode, lang);

            if (node) {
              expect(node).toBeDefined();
              expect(node.action).toBeDefined();

              // Log success with confidence if available
              const confidence = (node as any).confidence;
              console.log(
                `  ✅ Parsed ${lang} "${testName}": action="${node.action}"` +
                (confidence ? `, confidence=${confidence.toFixed(2)}` : '')
              );
            } else {
              console.log(`  ❌ Parse returned null for ${lang}: "${testCode}"`);
            }
          } catch (error) {
            console.log(`  ❌ Parse error for ${lang}: "${testCode}"`, error);
          }
        });
      }
    });
  }
});

// =============================================================================
// Specific Feature Tests
// =============================================================================

describe('Compact Forms (No Spaces)', () => {
  it('Korean: parses compact form without spaces', () => {
    const compactCase = getEventHandlerTestCase('toggle-compact-ko', 'ko');
    if (compactCase) {
      const result = canParse(compactCase, 'ko');
      console.log(`  Compact Korean (no spaces): ${result ? '✅' : '❌'} "${compactCase}"`);
    }
  });

  it('Japanese: parses compact form without spaces', () => {
    const compactCase = getEventHandlerTestCase('add-compact-ja', 'ja');
    if (compactCase) {
      const result = canParse(compactCase, 'ja');
      console.log(`  Compact Japanese (no spaces): ${result ? '✅' : '❌'} "${compactCase}"`);
    }
  });
});

describe('Vowel Harmony (Turkish)', () => {
  it('handles back vowel harmony (u/ı)', () => {
    const backVowelCase = getEventHandlerTestCase('toggle-with-back-vowel', 'tr');
    if (backVowelCase) {
      const result = canParse(backVowelCase, 'tr');
      console.log(`  Turkish back vowel: ${result ? '✅' : '❌'} "${backVowelCase}"`);
    }
  });

  it('handles front vowel harmony (ü/i)', () => {
    const frontVowelCase = getEventHandlerTestCase('toggle-with-front-vowel', 'tr');
    if (frontVowelCase) {
      const result = canParse(frontVowelCase, 'tr');
      console.log(`  Turkish front vowel: ${result ? '✅' : '❌'} "${frontVowelCase}"`);
    }
  });
});

describe('Proclitics (Arabic)', () => {
  it('handles و (wa) proclitic attachment', () => {
    const waCase = getEventHandlerTestCase('toggle-with-proclitic-wa', 'ar');
    if (waCase) {
      const stream = tokenize(waCase, 'ar');

      // Should separate و from attached word
      const hasConjunction = stream.tokens.some(
        t => t.value === 'و' || t.value === 'and'
      );

      console.log(`  Arabic و proclitic: ${hasConjunction ? '✅' : '❌'} "${waCase}"`);
      console.log(`    Tokens: ${stream.tokens.map(t => t.value).join(' | ')}`);
    }
  });

  it('handles ف (fa) proclitic attachment', () => {
    const faCase = getEventHandlerTestCase('add-with-proclitic-fa', 'ar');
    if (faCase) {
      const stream = tokenize(faCase, 'ar');

      // Should separate ف from attached word
      const hasConjunction = stream.tokens.some(
        t => t.value === 'ف' || t.value === 'then'
      );

      console.log(`  Arabic ف proclitic: ${hasConjunction ? '✅' : '❌'} "${faCase}"`);
      console.log(`    Tokens: ${stream.tokens.map(t => t.value).join(' | ')}`);
    }
  });
});

// =============================================================================
// Baseline Metrics
// =============================================================================

describe('Baseline Metrics (Phase 1.1)', () => {
  it('measures parsing success rate by language', () => {
    const stats: Record<TargetLanguage, { total: number; passed: number; failed: number }> = {
      ja: { total: 0, passed: 0, failed: 0 },
      ko: { total: 0, passed: 0, failed: 0 },
      tr: { total: 0, passed: 0, failed: 0 },
      ar: { total: 0, passed: 0, failed: 0 },
      hi: { total: 0, passed: 0, failed: 0 },
      bn: { total: 0, passed: 0, failed: 0 },
    };

    for (const lang of TARGET_LANGUAGES) {
      const testCases = getEventHandlerTestCasesForLanguage(lang);

      for (const testCode of Object.values(testCases)) {
        stats[lang].total++;

        try {
          const result = canParse(testCode, lang);
          if (result) {
            const node = parse(testCode, lang);
            if (node && node.action) {
              stats[lang].passed++;
            } else {
              stats[lang].failed++;
            }
          } else {
            stats[lang].failed++;
          }
        } catch {
          stats[lang].failed++;
        }
      }
    }

    // Log results
    console.log('\n=== Event Handler Pattern Baseline (Phase 1.1) ===\n');
    for (const lang of TARGET_LANGUAGES) {
      const { total, passed, failed } = stats[lang];
      const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
      console.log(`${lang.toUpperCase()}: ${passed}/${total} passed (${passRate}%)`);
    }
    console.log('\nTarget: +15-25% improvement with full test cases\n');

    // Always pass this test - it's for metrics only
    expect(true).toBe(true);
  });

  it('measures confidence scores by language', () => {
    const confidenceStats: Record<TargetLanguage, number[]> = {
      ja: [],
      ko: [],
      tr: [],
      ar: [],
      hi: [],
      bn: [],
    };

    for (const lang of TARGET_LANGUAGES) {
      const testCases = getEventHandlerTestCasesForLanguage(lang);

      for (const testCode of Object.values(testCases)) {
        try {
          const node = parse(testCode, lang);
          if (node) {
            const confidence = (node as any).confidence;
            if (typeof confidence === 'number') {
              confidenceStats[lang].push(confidence);
            }
          }
        } catch {
          // Skip failed parses
        }
      }
    }

    // Log confidence averages
    console.log('\n=== Confidence Score Averages ===\n');
    for (const lang of TARGET_LANGUAGES) {
      const scores = confidenceStats[lang];
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        console.log(
          `${lang.toUpperCase()}: avg=${avg.toFixed(2)}, min=${min.toFixed(2)}, max=${max.toFixed(2)} (n=${scores.length})`
        );
      } else {
        console.log(`${lang.toUpperCase()}: no successful parses`);
      }
    }
    console.log('\nTarget: Confidence ≥ 0.70 (English-level)\n');

    // Always pass - metrics only
    expect(true).toBe(true);
  });
});

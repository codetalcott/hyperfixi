/**
 * Event Handler Pattern Tests
 *
 * Tests full-form patterns with event handlers across the 23 languages with
 * varied word order (SOV/SVO/VSO, agglutinative, RTL, spaceless scripts).
 *
 * SCOPE: this file asserts TOKENIZATION only — that every authored event-handler
 * pattern produces tokens and that at least one is recognised as a keyword or
 * command in its language. Whether the pattern then PARSES faithfully is gated
 * by the testing-framework multilingual sweep (154 patterns × 21 languages,
 * ten ratchets at tolerance 0, run by the `multilingual-validation` CI job),
 * which compares against a committed baseline instead of re-deriving a number.
 *
 * It used to also run two more tests per pattern plus four summary blocks, and
 * NONE of them could fail:
 *   - `can parse:`  — its own comment said "just record the result without
 *     asserting"; `expect(result).toBeDefined()` on a boolean is always true.
 *   - `parses with semantic node:` — the whole body sat in a try/catch that
 *     swallowed errors, and the null branch only console.log'd.
 *   - `Compact Forms` / `Vowel Harmony (Turkish)` / `Proclitics (Arabic)` — zero
 *     `expect` calls; pure console.log. Those behaviours DO have real
 *     assertions elsewhere: compact/spaceless forms in japanese-idioms.test.ts
 *     and korean-idioms.test.ts, Turkish vowel harmony in morphology.test.ts,
 *     Arabic proclitics in vso-arabic.test.ts and arabic-idioms.test.ts.
 *   - `Baseline Metrics (Phase 1.1)` — two tests that each re-ran the entire
 *     23-language corpus to print pass rates, then `expect(true).toBe(true)`.
 * Together that was ~570 assertion-free tests doing real parses, plus two full
 * extra corpus sweeps, on every PR.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src';
import { getEventHandlerTestCasesForLanguage } from './test-cases';

const TARGET_LANGUAGES = [
  'ja',
  'ko',
  'tr',
  'ar',
  'hi',
  'bn',
  'ru',
  'uk',
  'th',
  'zh',
  'es',
  'vi',
  'id',
  'de',
  'fr',
  'it',
  'pt',
  'pl',
  'he',
  'ms',
  'qu',
  'sw',
  'tl',
] as const;

// =============================================================================
// Event Handler Pattern Tokenization
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
          const hasKeyword = stream.tokens.some(t => t.kind === 'keyword' || t.kind === 'command');
          expect(hasKeyword).toBe(true);
        });
      }
    });
  }
});

/**
 * Language Coverage Matrix Tests
 *
 * Systematic testing of core commands across all priority languages.
 * This ensures consistent multilingual support and identifies coverage gaps.
 *
 * Test structure:
 * - Each priority language (14) × each core command (10) = 140 test cases
 * - Each case asserts the parse extracts the right action.
 *
 * There is ONE assertion per cell by design. This file used to run three
 * (`tokenizes`, `can parse`, `parses with correct action`) and the first two are
 * strictly implied by the third: `canParse` is literally
 * `try { parse(); return true } catch { return false }`, and a parse that yields
 * the expected action necessarily tokenized. That made 280 of the 420 tests
 * redundant parses of the same input.
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse, tokenize } from '../../src';
import { PRIORITY_LANGUAGES, CORE_COMMANDS, getTestCase } from './test-cases';

// =============================================================================
// Language Coverage Matrix
// =============================================================================

describe('Language Coverage Matrix', () => {
  // Test each language
  for (const lang of PRIORITY_LANGUAGES) {
    describe(`${lang.toUpperCase()} language`, () => {
      // Test each core command
      for (const cmd of CORE_COMMANDS) {
        const testCase = getTestCase(cmd, lang);

        it(`parses "${cmd}" with correct action: "${testCase}"`, () => {
          const node = parse(testCase, lang);
          expect(node).toBeDefined();
          expect(node.action).toBe(cmd);
        });
      }
    });
  }
});

// =============================================================================
// Cross-Language Consistency Tests
// =============================================================================

describe('Cross-Language Consistency', () => {
  describe('Command normalization', () => {
    for (const cmd of CORE_COMMANDS) {
      it(`"${cmd}" normalizes consistently across all languages`, () => {
        const actions = new Set<string>();

        for (const lang of PRIORITY_LANGUAGES) {
          const testCase = getTestCase(cmd, lang);
          const canParseResult = canParse(testCase, lang);

          if (canParseResult) {
            const node = parse(testCase, lang);
            actions.add(node.action);
          }
        }

        // All parseable languages should normalize to the same action
        expect(actions.size).toBeLessThanOrEqual(1);
        if (actions.size === 1) {
          expect(actions.has(cmd)).toBe(true);
        }
      });
    }
  });

  describe('Tokenization produces valid tokens', () => {
    for (const lang of PRIORITY_LANGUAGES) {
      it(`${lang.toUpperCase()} tokenization produces keyword tokens`, () => {
        // Use toggle as a simple example
        const testCase = getTestCase('toggle', lang);
        const stream = tokenize(testCase, lang);

        // At least one token should be a keyword (tokens use 'kind' not 'type')
        const hasKeyword = stream.tokens.some(
          t => t.kind === 'keyword' || t.kind === 'command'
        );
        expect(hasKeyword).toBe(true);
      });
    }
  });
});

// NOTE: a `Coverage Summary` describe used to sit here. It re-ran the entire
// 140-cell matrix a FOURTH time purely to console.log pass percentages, then
// closed with `expect(true).toBe(true)` — it could not fail, so it reported
// nothing the matrix above doesn't already gate. Removed rather than kept as a
// reporter: the per-cell test names already identify which language/command
// broke, and the authoritative multilingual coverage numbers come from the
// testing-framework sweep's committed baseline
// (packages/testing-framework/baselines/multilingual-priority.json).
